#!/usr/bin/env python3
"""Install the checked-in Liquid Glass package into a local HA config directory.

Python 3.9+, standard library only. No HA API, credentials, subprocesses or
configuration.yaml/.storage writes. A preview is the default; --apply writes.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
import tempfile
from typing import Callable, Iterable
import urllib.parse
import urllib.request
import zipfile

MAX_ASSET_BYTES = 35 * 1024 * 1024
MAX_EXTRACTED_BYTES = 100 * 1024 * 1024
USER_AGENT = "LiquidGlassHAInstaller/1.0"


class InstallError(Exception):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def relative_path(value: str) -> Path:
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        raise InstallError("Invalid relative file path")
    path = PurePosixPath(value)
    if path.is_absolute() or any(p in ("", ".", "..") for p in value.split("/")):
        raise InstallError(f"Unsafe relative file path: {value}")
    return Path(*path.parts)


def safe_target(root: Path, relative: str) -> Path:
    target = root / relative_path(relative)
    # Resolve an explicitly selected config root, but reject symlinks below it.
    cursor = root
    for part in target.relative_to(root).parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise InstallError(f"Refusing to replace or follow a symlink: {relative}")
    if target.exists() and not target.is_file():
        raise InstallError(f"Expected a file, found a directory: {relative}")
    return target


def validate_download_url(url: str) -> None:
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != "https" or parsed.hostname not in
            {"github.com", "raw.githubusercontent.com", "codeload.github.com"}
            or parsed.username or parsed.password or parsed.query or parsed.fragment):
        raise InstallError("Dependency URLs must be fixed, public GitHub HTTPS URLs")
    if any(p in parsed.path.split("/") for p in ("latest", "master", "main")):
        raise InstallError("Dependency URL is not pinned to a release or commit")


def load_lock(path: Path) -> dict:
    try:
        lock = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise InstallError(f"Cannot read dependency lock: {error}") from error
    if lock.get("schema_version") != 1:
        raise InstallError("Unsupported dependency lock schema")
    ids = set()
    for dependency in lock.get("dependencies", []):
        dep_id = dependency.get("id", "")
        if not re.fullmatch(r"[a-z0-9_-]+", dep_id) or dep_id in ids:
            raise InstallError("Invalid or duplicate dependency ID")
        ids.add(dep_id)
        if dependency.get("kind") not in ("frontend", "integration"):
            raise InstallError(f"Invalid dependency kind: {dep_id}")
        seen = set()
        for asset in dependency.get("assets", []):
            relative_path(asset["path"])
            if asset["path"] in seen:
                raise InstallError(f"Duplicate dependency file: {dep_id}")
            seen.add(asset["path"])
            validate_download_url(asset["url"])
            if not re.fullmatch(r"[0-9a-f]{64}", asset.get("sha256", "")):
                raise InstallError(f"Missing SHA-256: {dep_id}/{asset['path']}")
            if not isinstance(asset.get("bytes"), int) or not 0 < asset["bytes"] <= MAX_ASSET_BYTES:
                raise InstallError(f"Invalid download size: {dep_id}/{asset['path']}")
        if not seen:
            raise InstallError(f"Dependency has no locked files: {dep_id}")
        if dependency["kind"] == "frontend" and dependency.get("entrypoint") not in seen:
            raise InstallError(f"Missing frontend entrypoint: {dep_id}")
    if not ids:
        raise InstallError("Dependency lock is empty")
    return lock


def selected_dependencies(lock: dict, integrations: Iterable[str]) -> list[dict]:
    requested = set(integrations)
    known = {d["id"] for d in lock["dependencies"] if d["kind"] == "integration"}
    if requested - known:
        raise InstallError("Unknown integration: " + ", ".join(sorted(requested - known)))
    return [d for d in lock["dependencies"] if d["kind"] == "frontend" or d["id"] in requested]


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".liquid-glass-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def fetch_https(url: str) -> bytes:
    validate_download_url(url)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            if urllib.parse.urlsplit(response.url).scheme != "https":
                raise InstallError("Refusing a non-HTTPS download redirect")
            data = response.read(MAX_ASSET_BYTES + 1)
    except (OSError, ValueError) as error:
        raise InstallError(f"Download failed for {url}: {error}") from error
    if len(data) > MAX_ASSET_BYTES:
        raise InstallError(f"Download is too large: {url}")
    return data


def verified_asset(asset: dict, cache: Path, offline: bool,
                   fetcher: Callable[[str], bytes] = fetch_https) -> bytes:
    blob = cache / asset["sha256"]
    if blob.is_symlink():
        raise InstallError("Cache entry is a symlink")
    if blob.is_file():
        data = blob.read_bytes()
    else:
        if offline:
            raise InstallError(f"Offline cache is missing {asset['path']}; run --download-only first")
        data = fetcher(asset["url"])
    if len(data) != asset["bytes"] or digest(data) != asset["sha256"]:
        raise InstallError(f"Checksum/size mismatch: {asset['path']}; no target files were changed")
    if not blob.exists():
        atomic_write(blob, data)
    return data


@dataclass(frozen=True)
class File:
    path: str
    data: bytes
    origin: str


def verify_distribution(files: list[File]) -> None:
    """Check the exact bytes to be copied against the bundled build manifest."""
    prefix = "www/liquid-glass/"
    distribution = {file.path[len(prefix):]: file.data for file in files}
    if "manifest.json" not in distribution:
        return  # Older release archives did not provide a build manifest.
    try:
        manifest = json.loads(distribution["manifest.json"])
    except (ValueError, UnicodeError) as error:
        raise InstallError("Bundled dist/manifest.json is invalid") from error
    if not isinstance(manifest, dict):
        raise InstallError("Bundled distribution manifest must be an object")
    hashes = manifest.get("files")
    modules = manifest.get("modules")
    if not isinstance(hashes, dict) or not hashes or not isinstance(modules, list) or not modules:
        raise InstallError("Bundled distribution manifest has no files/modules")
    for name, metadata in hashes.items():
        relative_path(name)
        expected = metadata.get("sha256") if isinstance(metadata, dict) else None
        if name == "manifest.json" or not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
            raise InstallError(f"Invalid bundled manifest checksum: {name}")
        if name not in distribution:
            raise InstallError(f"Bundled manifest file is missing: {name}")
        if digest(distribution[name]) != expected:
            raise InstallError(f"Bundled checksum mismatch: {name}; no target files were changed")
    for name in modules:
        relative_path(name)
        if name not in hashes:
            raise InstallError(f"Bundled module is missing from the manifest: {name}")
    if "dash6-cards.js" not in modules:
        raise InstallError("Bundled manifest does not declare dash6-cards.js")
    unlisted = set(distribution) - set(hashes) - {"manifest.json"}
    if unlisted:
        raise InstallError("Bundled distribution has unlisted files: " + ", ".join(sorted(unlisted)))


def package_files(root: Path) -> list[File]:
    distribution = root / "dist"
    if not (distribution / "dash6-cards.js").is_file():
        raise InstallError("Package is missing dist/dash6-cards.js. Use a release archive or build the package first.")
    files = []
    for base, destination in [(distribution, "www/liquid-glass"), (root / "themes", "themes/liquid-glass")]:
        if base.is_symlink():
            raise InstallError(f"Package directory is a symlink: {base.name}")
        if not base.is_dir():
            raise InstallError(f"Package directory is missing: {base.name}")
        for source in sorted(base.rglob("*")):
            if source.is_symlink():
                raise InstallError(f"Package contains a symlink: {source.relative_to(root)}")
            if source.is_file() and (base == distribution or source.suffix.lower() in (".yaml", ".yml")):
                path = (Path(destination) / source.relative_to(base)).as_posix()
                files.append(File(path, source.read_bytes(), "bundled package"))
        if base == distribution:
            verify_distribution(files)
    if not any(f.path.startswith("themes/") for f in files):
        raise InstallError("Package contains no themes")
    # Older SVG controls remain an explicit opt-in; their supporting modules stay adjacent.
    for name in ("dash5-glass.js", "dash5-elasticity.js", "glass-card.js", "glass-config.js", "glass-elasticity.js", "THIRD-PARTY-LICENSE.md"):
        source = root / "frontend" / name
        if source.is_file() and not source.is_symlink():
            files.append(File("www/liquid-glass/" + name, source.read_bytes(), "bundled SVG option"))
    assets = root / "assets"
    if assets.is_symlink():
        raise InstallError("Package assets directory is a symlink")
    if assets.is_dir():
        for source in sorted(assets.rglob("*")):
            if source.is_symlink():
                raise InstallError("Package assets contain a symlink")
            if source.is_file():
                files.append(File((Path("www/liquid-glass/assets") / source.relative_to(assets)).as_posix(), source.read_bytes(), "bundled asset"))
        backdrop = assets / "liquid-glass-living-room.jpg"
        if backdrop.is_file():
            files.append(File("www/liquid-glass-living-room.jpg", backdrop.read_bytes(), "original theme backdrop"))
    return files


def extract_component(dependency: dict, asset: dict, data: bytes) -> list[File]:
    archive_prefix = asset.get("archive_prefix", "")
    component_path = asset.get("component_path", "")
    relative_path(archive_prefix.rstrip("/"))
    if component_path != "custom_components/" + dependency["id"] + "/":
        raise InstallError("Integration archive has an invalid component path")
    prefix = archive_prefix + component_path
    files = []
    total = 0
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for entry in archive.infolist():
                if not entry.filename.startswith(prefix) or entry.is_dir():
                    continue
                relative = entry.filename[len(prefix):]
                relative_path(relative)
                if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                    raise InstallError("Integration archive contains a symlink")
                total += entry.file_size
                if total > MAX_EXTRACTED_BYTES:
                    raise InstallError("Integration archive is too large")
                files.append(File(component_path + relative, archive.read(entry), dependency["id"]))
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        raise InstallError(f"Cannot extract integration: {error}") from error
    if not any(f.path.endswith("/manifest.json") for f in files):
        raise InstallError("Integration archive does not contain a component manifest")
    return files


def dependency_files(dependencies: list[dict], cache: Path, offline: bool,
                     fetcher: Callable[[str], bytes] = fetch_https) -> list[File]:
    jobs = [(dependency, asset) for dependency in dependencies for asset in dependency["assets"]]
    def prepare(job):
        dependency, asset = job
        data = verified_asset(asset, cache, offline, fetcher)
        if dependency["kind"] == "integration":
            if "archive_prefix" in asset:
                return extract_component(dependency, asset, data)
            return [File("custom_components/" + dependency["id"] + "/" + asset["path"], data, dependency["id"])]
        return [File("www/liquid-glass/vendor/" + dependency["id"] + "/" + asset["path"], data, dependency["id"])]
    with ThreadPoolExecutor(max_workers=6) as pool:
        return [file for batch in pool.map(prepare, jobs) for file in batch]


def yaml_resource_urls(text: str) -> list[str]:
    """Read a simple resource list without evaluating HA tags or templates."""
    urls = []
    for line in text.splitlines():
        match = re.match(r"^\s*(?:-\s*)?url:\s*(.+?)\s*$", line)
        if not match:
            continue
        raw = match.group(1)
        if raw.startswith('"'):
            try:
                value, _ = json.JSONDecoder().raw_decode(raw)
            except ValueError as error:
                raise InstallError("Invalid quoted resource URL") from error
        elif raw.startswith("'"):
            match = re.match(r"^'((?:[^']|'')*)'", raw)
            if not match:
                raise InstallError("Invalid quoted resource URL")
            value = match.group(1).replace("''", "'")
        else:
            value = raw.split(" #", 1)[0].strip()
        if not isinstance(value, str) or not value.startswith(("/", "https://", "http://")):
            raise InstallError("Resource URL cannot be read; use a plain list of url/type entries")
        urls.append(value)
    if "url:" in text and not urls:
        raise InstallError("Unsupported resources YAML; use a plain list of url/type entries")
    return urls


def existing_resource_urls(config: Path, supplied: list[str]) -> list[str]:
    urls = []
    storage = config / ".storage" / "lovelace_resources"
    if storage.is_file():
        try:
            content = json.loads(storage.read_text(encoding="utf-8"))
            urls.extend(item["url"] for item in content["data"]["items"] if isinstance(item.get("url"), str))
        except (OSError, ValueError, KeyError, TypeError) as error:
            raise InstallError("Cannot read existing dashboard resources safely") from error
    for name in supplied:
        path = Path(name)
        if not path.is_absolute():
            path = config / path
        try:
            urls.extend(yaml_resource_urls(path.read_text(encoding="utf-8")))
        except OSError as error:
            raise InstallError(f"Cannot read supplied resources file: {name}") from error
    configuration = config / "configuration.yaml"
    if configuration.is_file() and not supplied:
        text = configuration.read_text(encoding="utf-8")
        if re.search(r"^\s+resources:\s*", text, re.MULTILINE):
            raise InstallError("Existing YAML resources detected. Supply --existing-resources path/to/resources.yaml (or configuration.yaml for an inline list).")
    return urls


def resource_basename(url: str) -> str:
    return PurePosixPath(urllib.parse.urlsplit(url).path).name.lower()


def resources(dependencies: list[dict], files: list[File], svg: bool) -> list[dict]:
    rows = []
    for dependency in dependencies:
        if dependency["kind"] == "frontend":
            entry = dependency["entrypoint"]
            asset = next(a for a in dependency["assets"] if a["path"] == entry)
            rows.append({"url": "/local/liquid-glass/vendor/" + dependency["id"] + "/" + entry + "?v=" + asset["sha256"][:12], "type": "module"})
    paths = {f.path: f.data for f in files}
    names = ["dash6-cards.js", "vacuum-dock-card.js"]
    if svg:
        names.append("dash5-glass.js")
        if "www/liquid-glass/dash5-glass.js" not in paths:
            raise InstallError("Optional SVG module is missing from the package")
    for name in names:
        path = "www/liquid-glass/" + name
        if path in paths:
            rows.append({"url": "/local/liquid-glass/" + name + "?v=" + digest(paths[path])[:12], "type": "module"})
    return rows


def resources_yaml(rows: list[dict]) -> bytes:
    return ("# Liquid Glass: register each module once. Generated by scripts/install.py.\n" +
            "".join("- url: " + json.dumps(row["url"]) + "\n  type: module\n" for row in rows) +
            ("[]\n" if not rows else "")).encode("utf-8")


def prepared_files(rows: list[dict], existing: list[str], dependencies: list[dict]) -> list[File]:
    basenames = {resource_basename(url) for url in existing}
    missing = [row for row in rows if resource_basename(row["url"]) not in basenames]
    present = len(rows) - len(missing)
    configuration = """# Merge these keys into your existing configuration.yaml; do not create duplicate keys.
# Themes work with storage dashboards and YAML dashboards alike.
frontend:
  themes: !include_dir_merge_named themes

# Optional YAML-managed resources, including for storage dashboards:
# merge into existing lovelace settings; review resources-all.yaml or resources.yaml first.
# lovelace:
#   resource_mode: yaml
#   resources: !include liquid-glass/resources.yaml
"""
    frontend = "# Merge under existing frontend:, or use frontend: !include liquid-glass/frontend.yaml\nthemes: !include_dir_merge_named themes\n"
    instructions = f"""# Complete the local installation

The installer copied the files and prepared configuration fragments. It did not
modify configuration.yaml, dashboard definitions, users, devices or .storage.

1. Under your existing `frontend:` settings, enable
   `themes: !include_dir_merge_named themes` (see configuration-example.yaml).
   Validate the configuration and restart HA if this setting is new; otherwise
   run `frontend.reload_themes` in Developer tools → Actions.
2. Choose one resource-management route. For UI-managed resources, enable
   Advanced mode in your profile, open Settings → Dashboards → ⋮ → Resources,
   and add the {len(missing)} entries in `resources.yaml` as JavaScript modules.
   For YAML resources, merge `resource_mode: yaml` and the resources include
   under your existing `lovelace:` settings; combine existing and new entries
   in ONE resource list, then run `lovelace.reload_resources`.
3. {present} module(s) were already registered and omitted from resources.yaml.
   Existing HACS copies stay active until you replace their URL in the resource
   list. Review their versions against dependencies.lock.json; to use the locked
   files, REPLACE each existing module URL with its row in resources-all.yaml.
   Do not register the HACS copy and installer copy of a module simultaneously.
   Remove old bespoke Govee / multi-light / DASH5-light resources before loading
   DASH6 aliases; the main DASH6 bundle includes those compatibility aliases.
4. Fully reload the browser (also the Companion App frontend cache) and choose
   a supplied theme in your HA profile. This selection is per user.
5. Adapt example entities and integrations to your own devices before using the
   example dashboard. No device entity or integration configuration is created.

"""
    if any(d["kind"] == "integration" for d in dependencies):
        instructions += """## Optional backend integration

Dual Smart Thermostat files were copied under
`custom_components/dual_smart_thermostat`. Restart Home Assistant, then configure
Dual Smart Thermostat in Settings → Devices & services (or according to its
upstream YAML instructions). Keep existing climate entities/configuration; do
not create duplicate thermostats. This pinned integration has no additional
Python package requirements beyond Home Assistant itself. It is NOT a
JavaScript resource. The native thermostat card also works with other existing
climate entities and does not require this integration.
"""
    return [File("liquid-glass/resources.yaml", resources_yaml(missing), "prepared configuration"),
            File("liquid-glass/resources-all.yaml", resources_yaml(rows), "prepared configuration"),
            File("liquid-glass/frontend.yaml", frontend.encode(), "prepared configuration"),
            File("liquid-glass/configuration-example.yaml", configuration.encode(), "prepared configuration"),
            File("liquid-glass/INSTALLATION.md", instructions.encode(), "prepared instructions")]


def apply_files(config: Path, files: list[File]) -> dict:
    by_path = {}
    for file in files:
        if file.path in by_path:
            raise InstallError(f"Conflicting installation destinations: {file.path}")
        by_path[file.path] = file
    # Preflight every destination before changing anything, then back up ALL originals.
    targets = [(file, safe_target(config, file.path)) for file in files]
    changed = [(file, target) for file, target in targets if not target.is_file() or target.read_bytes() != file.data]
    originals = {file.path: target.read_bytes() for file, target in changed if target.is_file()}
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%S.%fZ")
    backup_root = config / "backups" / "liquid-glass" / timestamp
    for name, data in originals.items():
        atomic_write(safe_target(config, (Path("backups/liquid-glass") / timestamp / name).as_posix()), data)
    manifest = {"created_at": timestamp, "changed": [f.path for f, _ in changed],
                "original_sha256": {name: digest(data) for name, data in originals.items()},
                "installed_sha256": {f.path: digest(f.data) for f, _ in changed}}
    if changed:
        atomic_write(safe_target(config, (Path("backups/liquid-glass") / timestamp / "manifest.json").as_posix()), (json.dumps(manifest, indent=2) + "\n").encode())
    written = []
    try:
        for file, _ in changed:
            atomic_write(safe_target(config, file.path), file.data)
            written.append(file.path)
    except Exception:
        # A disk/write error rolls back files already changed in this invocation.
        for name in reversed(written):
            target = safe_target(config, name)
            if name in originals:
                atomic_write(target, originals[name])
            else:
                target.unlink(missing_ok=True)
        raise
    return {"changed": len(changed), "unchanged": len(files) - len(changed),
            "backup": str(backup_root) if changed else None,
            "files": manifest["installed_sha256"]}


def run(args: argparse.Namespace, fetcher: Callable[[str], bytes] = fetch_https) -> dict:
    root = Path(args.package_root).expanduser().resolve()
    lock = load_lock(root / "dependencies.lock.json")
    integrations = list(args.with_integration or [])
    if args.with_dual_smart_thermostat:
        integrations.append("dual_smart_thermostat")
    dependencies = selected_dependencies(lock, integrations)
    cache = Path(args.cache_dir).expanduser().resolve()
    summary = {"mode": "download" if args.download_only else ("apply" if args.apply else "preview"),
               "dependencies": [{"id": d["id"], "version": d["version"], "kind": d["kind"], "files": len(d["assets"])} for d in dependencies],
               "download_bytes": sum(a["bytes"] for d in dependencies for a in d["assets"])}
    if args.download_only:
        dependency_files(dependencies, cache, args.offline, fetcher)
        return summary
    if not args.config_dir:
        raise InstallError("--config-dir is required for a preview or installation")
    config = Path(args.config_dir).expanduser().resolve()
    if config == root or root in config.parents:
        raise InstallError("The config directory must not be the package directory or a directory inside it")
    files = package_files(root)
    existing = existing_resource_urls(config, args.existing_resources)
    rows = resources(dependencies, files, args.with_svg_refraction)
    files += prepared_files(rows, existing, dependencies)
    # Preview lists all dependency destinations without downloads or writes.
    summary["config_dir"] = str(config)
    summary["bundled_files"] = len(files)
    summary["resources_to_add"] = sum(resource_basename(row["url"]) not in {resource_basename(url) for url in existing} for row in rows)
    summary["existing_modules"] = len(rows) - summary["resources_to_add"]
    summary["paths"] = [file.path for file in files]
    for dependency in dependencies:
        if dependency["kind"] == "frontend":
            summary["paths"].extend("www/liquid-glass/vendor/" + dependency["id"] + "/" + a["path"] for a in dependency["assets"])
        else:
            summary["paths"].append("custom_components/" + dependency["id"] + "/ (archive files)")
    for path in summary["paths"]:
        if not path.endswith(" (archive files)"):
            safe_target(config, path)
    if not args.apply:
        return summary
    # Validate every download before any target write; caches may be filled meanwhile.
    files += dependency_files(dependencies, cache, args.offline, fetcher)
    summary.update(apply_files(config, files))
    summary.pop("paths", None)
    return summary


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    result.add_argument("--config-dir", help="Local Home Assistant config directory (or a staged copy)")
    result.add_argument("--package-root", default=str(Path(__file__).resolve().parent.parent), help="Release/package directory")
    result.add_argument("--cache-dir", default=str(Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "liquid-glass-ha"), help="Verified download cache")
    mode = result.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Download, verify, back up and copy files")
    mode.add_argument("--download-only", action="store_true", help="Fill the verified cache without writing any HA files")
    result.add_argument("--offline", action="store_true", help="Use only verified files already in the cache")
    result.add_argument("--all", action="store_true", help="Install all frontend dependencies (the default)")
    result.add_argument("--with-integration", action="append", choices=["dual_smart_thermostat"], default=[], help="Also copy a pinned backend integration")
    result.add_argument("--with-dual-smart-thermostat", action="store_true", help="Alias for --with-integration dual_smart_thermostat")
    result.add_argument("--with-svg-refraction", action="store_true", help="Also register the optional older SVG refraction frontend")
    result.add_argument("--existing-resources", action="append", default=[], help="Existing YAML resources file, relative to config-dir or absolute (repeatable)")
    result.add_argument("--json", action="store_true", help="Print the result as JSON")
    return result


def main(argv=None) -> int:
    args = parser().parse_args(argv)
    try:
        result = run(args)
    except (InstallError, OSError) as error:
        print(f"Installation stopped: {error}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Liquid Glass {result['mode']}: {len(result['dependencies'])} dependencies, {result['download_bytes']:,} download bytes")
        for dependency in result["dependencies"]:
            print(f"  {dependency['id']} {dependency['version']} ({dependency['files']} files, {dependency['kind']})")
        if result["mode"] == "preview":
            print(f"{len(result['paths'])} planned paths; {result['resources_to_add']} resource(s) to add. Nothing downloaded or written.")
            print("Use --apply to perform the installation; configuration.yaml and .storage remain unchanged.")
        elif result["mode"] == "apply":
            print(f"{result['changed']} files written; {result['unchanged']} unchanged.")
            if result["backup"]:
                print(f"Backup and change manifest: {result['backup']}")
            print(f"Next steps: {result['config_dir']}/liquid-glass/INSTALLATION.md")
        else:
            print("All selected dependencies are verified and cached. Use --offline --apply on the target machine.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
