#!/usr/bin/env python3
"""Offline dependency migration tests, without HA or network access."""
import hashlib
import importlib
import json
from pathlib import Path
import sys
import tempfile
from types import ModuleType
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
package = ModuleType('liquid_glass_test')
package.__path__ = [str(ROOT / 'custom_components/liquid_glass')]
sys.modules[package.__name__] = package
runtime = importlib.import_module('liquid_glass_test.runtime')


class EmbeddedInstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.bundle = self.root / 'bundle'
        self.bundle.mkdir()
        real = json.loads((ROOT / 'dependencies.lock.json').read_text())
        self.dep = next(d for d in real['dependencies'] if d['id'] == 'embedded-view-card')
        # Keep the exact multi-file structure, but substitute deterministic bytes.
        self.payloads = {}
        for asset in self.dep['assets']:
            data = ('fixture:' + asset['path']).encode()
            asset.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            self.payloads[asset['url']] = data
        (self.bundle / 'dependencies.lock.json').write_text(json.dumps({'schema_version': 1, 'dependencies': [self.dep]}))
        self.calls = []
        self.config = self.root / 'config'
        original = runtime.installer.dependency_files
        def download(url):
            self.calls.append(url)
            return self.payloads[url]
        def dependencies(deps, cache, offline):
            return original(deps, cache, offline, download)
        self.patches = [patch.object(runtime, 'ROOT', self.bundle), patch.object(runtime.installer, 'dependency_files', dependencies), patch.object(runtime.installer, 'package_files', side_effect=lambda root: [runtime.installer.File('www/liquid-glass/' + name, b'local-adapter', 'own bundle') for name in ('dash6-cards.js', 'vacuum-dock-card.js')])]
        for p in self.patches: p.start()

    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.temp.cleanup()

    def test_fresh_install_complete_upstream_before_adapter(self):
        runtime.install(self.config, [])
        self.assertEqual(len(self.calls), 11)
        for asset in self.dep['assets']:
            self.assertEqual((self.config / 'www/liquid-glass/vendor/embedded-view-card' / asset['path']).read_bytes(), self.payloads[asset['url']])
        bootstrap = (self.config / 'www/liquid-glass/integration-bootstrap.js').read_text()
        self.assertLess(bootstrap.index('embedded-view-card.js'), bootstrap.index('dash6-cards.js'))
        self.calls.clear()
        report = runtime.install(self.config, [])
        self.assertEqual(self.calls, [])
        self.assertEqual(report['changed'], 0)

    def test_existing_resource_reused_without_duplicate_download(self):
        existing = '/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=123'
        runtime.install(self.config, [existing])
        self.assertEqual(self.calls, [])
        bootstrap = (self.config / 'www/liquid-glass/integration-bootstrap.js').read_text()
        self.assertIn(existing, bootstrap)
        self.assertNotIn('/vendor/embedded-view-card/', bootstrap)
        self.assertFalse((self.config / 'www/liquid-glass/vendor/embedded-view-card').exists())

    def test_distinct_registered_embedded_urls_fail_before_target_writes(self):
        urls = ['/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=1', '/local/custom/embedded-view-card.js?v=2']
        with self.assertRaises(runtime.installer.InstallError):
            runtime.install(self.config, urls)
        self.assertEqual(self.calls, [])
        self.assertFalse((self.config / 'www').exists())

    def test_identical_registered_embedded_url_is_deduplicated(self):
        url = '/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=1'
        runtime.install(self.config, [url, url])
        self.assertEqual(self.calls, [])
        bootstrap = (self.config / 'www/liquid-glass/integration-bootstrap.js').read_text()
        self.assertEqual(bootstrap.count(url), 1)

    def test_refresh_changes_only_embedded_and_keeps_unrelated_modules(self):
        report = runtime.install(self.config, [])
        urls = [module['url'] for module in report['frontend_modules']]
        own_before = {name: (self.config / 'www/liquid-glass' / name).read_bytes() for name in ['dash6-cards.js', 'vacuum-dock-card.js']}
        calls = len(self.calls)
        hacs = '/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=2'
        refreshed = runtime.refresh_embedded_resource(self.config, [hacs, '/local/foreign.js'], report['frontend_modules'])
        self.assertTrue(refreshed['resource_changed'])
        self.assertEqual(len(self.calls), calls)
        boot = (self.config / 'www/liquid-glass/integration-bootstrap.js').read_text()
        self.assertIn(hacs, boot)
        self.assertNotIn('/vendor/embedded-view-card/', boot)
        for name, data in own_before.items():
            self.assertEqual((self.config / 'www/liquid-glass' / name).read_bytes(), data)
        self.assertNotIn('/local/foreign.js', boot)
        unchanged = runtime.refresh_embedded_resource(self.config, [hacs], refreshed['frontend_modules'])
        self.assertFalse(unchanged['resource_changed'])

    def test_invalid_upstream_bytes_abort_before_target_write(self):
        first = self.dep['assets'][0]['url']
        self.payloads[first] = b'corrupt'
        with self.assertRaises(runtime.installer.InstallError):
            runtime.install(self.config, [])
        self.assertFalse((self.config / 'www').exists())


if __name__ == '__main__':
    unittest.main()
