#!/usr/bin/env python3
"""Offline installer tests: temporary fixtures, no Home Assistant/network access."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

SPEC = importlib.util.spec_from_file_location("liquid_glass_installer", Path(__file__).with_name("install.py"))
installer = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = installer
SPEC.loader.exec_module(installer)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="liquid-glass-installer-test-")
        self.base = Path(self.temp.name)
        self.package = self.base / "release"
        self.config = self.base / "config"
        self.cache = self.base / "cache"
        self.package.mkdir()
        (self.package / "dist/chunks").mkdir(parents=True)
        (self.package / "dist/profiles").mkdir()
        (self.package / "themes").mkdir()
        (self.package / "dist/dash6-cards.js").write_bytes(b"import './chunks/control.js';")
        (self.package / "dist/chunks/control.js").write_bytes(b"export const example=true;")
        (self.package / "dist/profiles/example.json").write_text('{"example":true}')
        (self.package / "dist/vacuum-dock-card.js").write_bytes(b"export const dock=true;")
        (self.package / "dist/dash5-light-cards-v2.js").write_bytes(b"import './dash6-cards.js';")
        (self.package / "themes/satin.yaml").write_text("Satin:\n  primary-color: blue\n")
        self.data = b"export const upstream='fixture';"
        self.extra = b"export const lazy='fixture';"
        self.integration_zip = self.make_zip({
            "repo-commit/custom_components/dual_smart_thermostat/manifest.json": b'{"domain":"dual_smart_thermostat"}',
            "repo-commit/custom_components/dual_smart_thermostat/climate.py": b"# fixture\n",
            "repo-commit/README.md": b"Do not copy repo root",
        })
        self.dependency = {"id": "example", "kind": "frontend", "version": "v1.0.0", "entrypoint": "example.js", "assets": [self.asset("example.js", self.data), self.asset("chunks/lazy.js", self.extra)]}
        self.integration = {"id": "dual_smart_thermostat", "kind": "integration", "version": "v1.0.0", "assets": [{**self.asset("source.zip", self.integration_zip), "archive_prefix": "repo-commit/", "component_path": "custom_components/dual_smart_thermostat/"}]}
        self.lock = {"schema_version": 1, "dependencies": [self.dependency, self.integration]}
        self.write_lock()

    def tearDown(self):
        self.temp.cleanup()

    def asset(self, name, data):
        return {"path": name, "url": "https://raw.githubusercontent.com/example/project/" + "a" * 40 + "/" + name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}

    def make_zip(self, files):
        out = io.BytesIO()
        with zipfile.ZipFile(out, "w") as archive:
            for name, data in files.items():
                archive.writestr(name, data)
        return out.getvalue()

    def write_lock(self):
        (self.package / "dependencies.lock.json").write_text(json.dumps(self.lock))

    def args(self, *extra):
        return installer.parser().parse_args(["--package-root", str(self.package), "--config-dir", str(self.config), "--cache-dir", str(self.cache), *extra])

    def cache_assets(self, integration=False):
        self.cache.mkdir(exist_ok=True)
        for dependency in self.lock["dependencies"]:
            if dependency["kind"] == "integration" and not integration:
                continue
            for asset in dependency["assets"]:
                value = {self.asset("example.js", self.data)["sha256"]: self.data,
                         self.asset("chunks/lazy.js", self.extra)["sha256"]: self.extra,
                         self.asset("source.zip", self.integration_zip)["sha256"]: self.integration_zip}[asset["sha256"]]
                (self.cache / asset["sha256"]).write_bytes(value)

    def test_preview_has_no_download_or_write(self):
        def fail(_):
            self.fail("Preview attempted network access")
        result = installer.run(self.args(), fetcher=fail)
        self.assertEqual(result["mode"], "preview")
        self.assertFalse(self.config.exists())
        self.assertFalse(self.cache.exists())
        self.assertEqual(len(result["dependencies"]), 1)
        self.assertEqual(result["resources_to_add"], 3)
        self.assertIn("www/liquid-glass/vendor/example/chunks/lazy.js", result["paths"])

    def test_apply_copies_complete_package_and_locked_modules(self):
        self.cache_assets()
        self.config.mkdir()
        original = b"frontend:\n  custom_setting: true\n"
        (self.config / "configuration.yaml").write_bytes(original)
        result = installer.run(self.args("--offline", "--apply"))
        self.assertGreater(result["changed"], 8)
        self.assertEqual((self.config / "configuration.yaml").read_bytes(), original)
        self.assertEqual((self.config / "www/liquid-glass/vendor/example/chunks/lazy.js").read_bytes(), self.extra)
        self.assertTrue((self.config / "www/liquid-glass/profiles/example.json").is_file())
        self.assertTrue((self.config / "www/liquid-glass/chunks/control.js").is_file())
        self.assertTrue((self.config / "www/liquid-glass/dash5-light-cards-v2.js").is_file())
        self.assertTrue((self.config / "themes/liquid-glass/satin.yaml").is_file())
        self.assertFalse((self.config / "custom_components").exists())
        text = (self.config / "liquid-glass/resources.yaml").read_text()
        self.assertIn("dash6-cards.js?v=", text)
        self.assertIn("vacuum-dock-card.js?v=", text)
        self.assertNotIn("dash5-light-cards-v2.js", text)
        self.assertNotIn("dual_smart_thermostat", text)

    def test_backups_precede_replacement_and_second_apply_is_idempotent(self):
        self.cache_assets()
        target = self.config / "www/liquid-glass/dash6-cards.js"
        target.parent.mkdir(parents=True)
        target.write_bytes(b"old module")
        first = installer.run(self.args("--offline", "--apply"))
        backup = Path(first["backup"])
        self.assertEqual((backup / "www/liquid-glass/dash6-cards.js").read_bytes(), b"old module")
        manifest = json.loads((backup / "manifest.json").read_text())
        self.assertEqual(manifest["original_sha256"]["www/liquid-glass/dash6-cards.js"], installer.digest(b"old module"))
        second = installer.run(self.args("--offline", "--apply"))
        self.assertEqual(second["changed"], 0)
        self.assertIsNone(second["backup"])
        self.assertEqual(len(list((self.config / "backups/liquid-glass").iterdir())), 1)

    def test_bad_cache_hash_aborts_before_any_target_writes(self):
        self.cache_assets()
        (self.cache / self.dependency["assets"][0]["sha256"]).write_bytes(b"untrusted wrong bytes")
        with self.assertRaisesRegex(installer.InstallError, "Checksum/size mismatch"):
            installer.run(self.args("--offline", "--apply"))
        self.assertFalse(self.config.exists())

    def test_offline_missing_file_never_attempts_network(self):
        with self.assertRaisesRegex(installer.InstallError, "Offline cache is missing"):
            installer.run(self.args("--offline", "--apply"), fetcher=lambda _: self.fail("network"))
        self.assertFalse(self.config.exists())

    def test_download_only_fills_verified_cache_without_target_writes(self):
        urls = {asset["url"]: data for asset, data in zip(self.dependency["assets"], [self.data, self.extra])}
        result = installer.run(self.args("--download-only"), fetcher=lambda url: urls[url])
        self.assertEqual(result["mode"], "download")
        self.assertFalse(self.config.exists())
        self.assertEqual(len(list(self.cache.iterdir())), 2)
        installer.run(self.args("--apply", "--offline"), fetcher=lambda _: self.fail("network"))

    def test_existing_storage_resources_are_not_duplicated_or_mutated(self):
        self.cache_assets()
        storage = self.config / ".storage/lovelace_resources"
        storage.parent.mkdir(parents=True)
        content = json.dumps({"data": {"items": [{"url": "/hacsfiles/example/example.js?hacstag=123", "type": "module"}]}})
        storage.write_text(content)
        result = installer.run(self.args("--offline", "--apply"))
        self.assertEqual(result["existing_modules"], 1)
        self.assertEqual(storage.read_text(), content)
        resources = (self.config / "liquid-glass/resources.yaml").read_text()
        self.assertNotIn("vendor/example/example.js", resources)
        all_resources = (self.config / "liquid-glass/resources-all.yaml").read_text()
        self.assertIn("vendor/example/example.js", all_resources)

    def test_yaml_resource_include_requires_explicit_existing_file(self):
        self.config.mkdir()
        (self.config / "configuration.yaml").write_text("lovelace:\n  resources: !include existing.yaml\n")
        (self.config / "existing.yaml").write_text("- url: '/hacsfiles/example/example.js?v=old'\n  type: module\n")
        with self.assertRaisesRegex(installer.InstallError, "--existing-resources"):
            installer.run(self.args())
        result = installer.run(self.args("--existing-resources", "existing.yaml"))
        self.assertEqual(result["existing_modules"], 1)

    def test_integration_is_opt_in_and_extracts_only_component(self):
        self.cache_assets(integration=True)
        installer.run(self.args("--apply", "--offline", "--with-dual-smart-thermostat"))
        self.assertTrue((self.config / "custom_components/dual_smart_thermostat/manifest.json").is_file())
        self.assertTrue((self.config / "custom_components/dual_smart_thermostat/climate.py").is_file())
        self.assertFalse((self.config / "README.md").exists())
        self.assertNotIn("dual_smart_thermostat", (self.config / "liquid-glass/resources-all.yaml").read_text())
        self.assertIn("Restart Home Assistant", (self.config / "liquid-glass/INSTALLATION.md").read_text())

    def test_archive_path_traversal_is_rejected_before_target_write(self):
        evil = self.make_zip({"repo-commit/custom_components/dual_smart_thermostat/../../../outside.py": b"bad"})
        archive = {**self.asset("source.zip", evil), "archive_prefix": "repo-commit/", "component_path": "custom_components/dual_smart_thermostat/"}
        self.integration["assets"] = [archive]
        self.write_lock()
        self.cache_assets()
        (self.cache / archive["sha256"]).write_bytes(evil)
        with self.assertRaisesRegex(installer.InstallError, "Unsafe relative"):
            installer.run(self.args("--apply", "--offline", "--with-dual-smart-thermostat"))
        self.assertFalse(self.config.exists())
        self.assertFalse((self.base / "outside.py").exists())

    def test_destination_symlink_is_rejected_without_mutating_outside(self):
        self.cache_assets()
        outside = self.base / "outside"
        outside.mkdir()
        (self.config / "www").mkdir(parents=True)
        (self.config / "www/liquid-glass").symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(installer.InstallError, "symlink"):
            installer.run(self.args("--apply", "--offline"))
        self.assertEqual(list(outside.iterdir()), [])
        self.assertFalse((self.config / "themes").exists())

    def test_unpinned_url_and_missing_hash_are_rejected(self):
        self.dependency["assets"][0]["url"] = "https://raw.githubusercontent.com/example/project/main/example.js"
        self.write_lock()
        with self.assertRaisesRegex(installer.InstallError, "not pinned"):
            installer.run(self.args())
        self.dependency["assets"][0]["url"] = "https://example.invalid/frontend.js"
        self.write_lock()
        with self.assertRaisesRegex(installer.InstallError, "public GitHub HTTPS"):
            installer.run(self.args())
        self.dependency["assets"][0]["url"] = self.asset("example.js", self.data)["url"]
        self.dependency["assets"][0]["sha256"] = ""
        self.write_lock()
        with self.assertRaisesRegex(installer.InstallError, "SHA-256"):
            installer.run(self.args())

    def test_mid_write_failure_restores_original_and_removes_new_files(self):
        self.config.mkdir()
        (self.config / "first.js").write_bytes(b"old")
        files = [installer.File("first.js", b"new", "fixture"), installer.File("second.js", b"second", "fixture"), installer.File("third.js", b"third", "fixture")]
        original_write = installer.atomic_write
        def fail(path, data):
            if path == self.config / "third.js":
                raise OSError("simulated full disk")
            original_write(path, data)
        with patch.object(installer, "atomic_write", side_effect=fail):
            with self.assertRaisesRegex(OSError, "full disk"):
                installer.apply_files(self.config, files)
        self.assertEqual((self.config / "first.js").read_bytes(), b"old")
        self.assertFalse((self.config / "second.js").exists())
        self.assertFalse((self.config / "third.js").exists())
        self.assertTrue(list((self.config / "backups/liquid-glass").rglob("manifest.json")))

    def test_optional_svg_module_is_copied_and_registered_only_on_request(self):
        (self.package / "frontend").mkdir()
        (self.package / "frontend/dash5-glass.js").write_bytes(b"export const svg=true;")
        self.cache_assets()
        installer.run(self.args("--apply", "--offline"))
        self.assertTrue((self.config / "www/liquid-glass/dash5-glass.js").is_file())
        self.assertNotIn("dash5-glass.js", (self.config / "liquid-glass/resources.yaml").read_text())
        installer.run(self.args("--apply", "--offline", "--with-svg-refraction"))
        self.assertIn("dash5-glass.js", (self.config / "liquid-glass/resources.yaml").read_text())

    def test_cli_preview_and_conflicting_modes(self):
        command = [sys.executable, str(Path(__file__).with_name("install.py")), "--package-root", str(self.package), "--config-dir", str(self.config), "--cache-dir", str(self.cache)]
        preview = subprocess.run(command + ["--json"], capture_output=True, text=True)
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertEqual(json.loads(preview.stdout)["mode"], "preview")
        conflict = subprocess.run(command + ["--apply", "--download-only"], capture_output=True, text=True)
        self.assertNotEqual(conflict.returncode, 0)
        self.assertFalse(self.config.exists())

    def test_empty_additions_are_valid_yaml_list(self):
        self.assertEqual(installer.yaml_resource_urls(installer.resources_yaml([]).decode()), [])
        self.assertTrue(installer.resources_yaml([]).endswith(b"[]\n"))

    def distribution_manifest(self):
        files = {path.relative_to(self.package / "dist").as_posix(): {"sha256": installer.digest(path.read_bytes())}
                 for path in (self.package / "dist").rglob("*") if path.is_file() and path.name != "manifest.json"}
        manifest = {"version": "test", "modules": ["dash6-cards.js", "vacuum-dock-card.js", "dash5-light-cards-v2.js"], "files": files}
        (self.package / "dist/manifest.json").write_text(json.dumps(manifest))

    def test_bundled_manifest_is_verified_and_copied(self):
        self.cache_assets()
        self.distribution_manifest()
        installer.run(self.args("--apply", "--offline"))
        self.assertEqual((self.config / "www/liquid-glass/manifest.json").read_bytes(), (self.package / "dist/manifest.json").read_bytes())

    def test_corrupted_bundle_aborts_even_preview_without_download_or_write(self):
        self.distribution_manifest()
        (self.package / "dist/chunks/control.js").write_bytes(b"changed unexpectedly")
        with self.assertRaisesRegex(installer.InstallError, "Bundled checksum mismatch: chunks/control.js"):
            installer.run(self.args("--apply"), fetcher=lambda _: self.fail("network"))
        self.assertFalse(self.config.exists())
        self.assertFalse(self.cache.exists())

    def test_missing_or_unlisted_bundle_file_stops_installation(self):
        self.distribution_manifest()
        chunk = self.package / "dist/chunks/control.js"
        original = chunk.read_bytes()
        chunk.unlink()
        with self.assertRaisesRegex(installer.InstallError, "Bundled manifest file is missing"):
            installer.run(self.args())
        chunk.write_bytes(original)
        (self.package / "dist/unknown.js").write_bytes(b"unlisted")
        with self.assertRaisesRegex(installer.InstallError, "Bundled distribution has unlisted files"):
            installer.run(self.args())

    def test_manifest_module_must_be_present_in_hash_list(self):
        self.distribution_manifest()
        path = self.package / "dist/manifest.json"
        manifest = json.loads(path.read_text())
        manifest["modules"].append("missing.js")
        path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(installer.InstallError, "Bundled module is missing from the manifest"):
            installer.run(self.args())

    def test_release_checkout_may_live_beneath_config_directory(self):
        self.cache_assets()
        # A user may download the release in /config/downloads/ without using it
        # as the destination. Copies still go to the separate www/themes paths.
        self.config.mkdir()
        nested = self.config / "downloads/liquid-glass"
        nested.parent.mkdir()
        self.package.rename(nested)
        self.package = nested
        result = installer.run(self.args("--apply", "--offline"))
        self.assertGreater(result["changed"], 0)
        self.assertTrue((self.config / "www/liquid-glass/dash6-cards.js").is_file())
        self.assertEqual((nested / "dist/dash6-cards.js").read_bytes(), b"import './chunks/control.js';")

    def test_real_dependency_lock_is_complete_and_ultra_chunks_are_locked(self):
        real = Path(__file__).resolve().parent.parent / "dependencies.lock.json"
        if not real.exists():
            self.skipTest("Verified manifest is still being prepared")
        lock = installer.load_lock(real)
        frontend = [d for d in lock["dependencies"] if d["kind"] == "frontend"]
        self.assertGreaterEqual(len(frontend), 11)
        ultra = next(d for d in frontend if d["id"] == "ultra-card")
        self.assertGreater(len(ultra["assets"]), 50)
        self.assertTrue(any(a["path"].startswith("uc-editor.") for a in ultra["assets"]))
        self.assertTrue(any(a["path"].startswith("uc-locale-de.") for a in ultra["assets"]))
        self.assertTrue(any(a["path"].endswith(".LICENSE.txt") for a in ultra["assets"]))
        self.assertTrue(any(d["id"] == "dual_smart_thermostat" and d["kind"] == "integration" for d in lock["dependencies"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
