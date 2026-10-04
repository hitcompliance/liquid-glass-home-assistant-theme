import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'demo');
const manifest = JSON.parse(await readFile(join(root, 'gallery.json'), 'utf8'));
assert.equal(manifest.pages.length, 11, 'Every independent conversation visualization must be included');
assert.equal(new Set(manifest.pages.map(item => item.id)).size, 11);
const sourcePages = (await readdir(join(root, 'source'))).filter(name => name.endsWith('.html')).sort();
assert.deepEqual(sourcePages, manifest.pages.map(item => item.id + '.html').sort());
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.txt': 'text/plain' };
const missingRequests = [], externalRequests = [];
const server = createServer(async (req, res) => {
  try {
    const requested = new URL(req.url, 'http://localhost').pathname;
    const path = resolve(root, '.' + requested + (requested.endsWith('/') ? 'index.html' : ''));
    assert.ok(path.startsWith(root + '/'));
    const data = await readFile(path); res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(data);
  } catch { if (req.url !== '/favicon.ico') missingRequests.push(req.url); res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const checks = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
  await context.route('**/*', async route => { const url = route.request().url(); if (!url.startsWith(origin + '/') && !url.startsWith('data:')) { externalRequests.push(url); await route.abort(); } else await route.continue(); });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const item of manifest.pages) {
    const source = await readFile(join(root, item.source), 'utf8');
    assert.doesNotMatch(source, /window\.openai|globalThis\.openai|ha\.home\.hallo-it\.de|homeassistant\.local|\/Users\/|\/config\//);
    assert.doesNotMatch(source, /callService|\bWebSocket\b|\bXMLHttpRequest\b|\bfetch\s*\(/, 'Mockups contain no device or network API');
    assert.doesNotMatch(source, /data:image\/(?:webp|png|jpe?g|avif);base64/);
    await page.goto(`${origin}/${item.page}`);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    assert.equal(await page.evaluate(() => typeof window.openai), 'undefined', 'No Codex runtime is required');
    assert.equal(await page.locator('i[data-lucide]').count(), 0, 'All icons render locally');
    await page.locator('.demo-stage').screenshot({ path: join(root, item.preview), type: 'jpeg', quality: 82 });
    const switchSelector = '.demo-stage button[role="switch"]:visible,.demo-stage [data-power]:visible,.demo-stage .lens-switch:visible';
    const toggle = page.locator(switchSelector).first();
    assert.ok(await toggle.count(), item.id + ' has an interactive switch');
    const attribute = await toggle.getAttribute('aria-checked') !== null ? 'aria-checked' : 'aria-pressed';
    const before = await toggle.getAttribute(attribute);
    await toggle.click();
    await wait(180);
    assert.notEqual(await toggle.getAttribute(attribute), before, item.id + ' switch changes state');
    assert.equal(await page.locator('dialog[open]').count(), 0, 'Switch does not open background modal');
    await toggle.click(); await wait(180);
    const range = page.locator('.demo-stage input[type="range"]:visible').first();
    assert.ok(await range.count(), item.id + ' has a working slider');
    await range.evaluate(input => { input.value = String(Number(input.min || 0) + (Number(input.max || 100) - Number(input.min || 0)) * .35); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
    const rangeAfter = await range.inputValue(); assert.ok(Number.isFinite(Number(rangeAfter)));
    const color = page.locator('.demo-stage .mode[data-mode="color"]:visible').first();
    if (await color.count()) {
      await color.click(); assert.equal(await color.getAttribute('aria-pressed'), 'true');
      const hue = page.locator('.demo-stage input[type="range"]:visible').first();
      assert.equal(await hue.getAttribute('max'), '360');
      await hue.evaluate(input => { input.value = '160'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
      assert.equal(await hue.inputValue(), '160');
      const brightness = page.locator('.demo-stage .mode[data-mode="brightness"]:visible').first(); await brightness.click();
    }
    const picker = page.locator('.demo-carousel-controls select');
    let variants = 1;
    if (await picker.count()) {
      variants = await picker.locator('option').count();
      for (let i = 0; i < variants; i++) {
        await picker.selectOption(String(i));
        assert.equal(await page.locator('.viz-carousel > [data-variant]:visible').count(), 1);
        assert.ok(await page.locator('.demo-stage button:visible').count(), 'Controls remain available in variant ' + i);
      }
      await picker.selectOption('0');
    }
    if (['satin-effect-group', 'dash6-satin-system'].includes(item.id)) {
      const details = page.locator('.stage .details:visible').first(); await details.click();
      const modal = page.locator('dialog[open]'); assert.equal(await modal.count(), 1);
      assert.equal(await modal.locator('.member').count(), 3);
      const selection = modal.locator('input[type=checkbox]').first(); await selection.uncheck(); assert.equal(await selection.isChecked(), false);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog[open]').count(), 0);
      const effect = page.locator('.stage .effect-trigger:visible').first();
      await effect.click(); assert.equal(await page.locator('dialog[open]').count(), 1);
      await page.getByRole('button', { name: 'Welle', exact: true }).click();
      assert.equal(await page.locator('dialog[open]').count(), 0); assert.equal(await effect.getAttribute('aria-pressed'), 'true');
      await effect.click(); assert.equal(await effect.getAttribute('aria-pressed'), 'false');
    }
    if (item.id === 'dash6-satin-system') {
      await picker.selectOption({ label: 'Thermostate' });
      assert.equal(await page.locator('[data-climate-mode]:visible').count(), 16, 'Four modes on two thermostats on both backgrounds');
      await page.locator('[data-climate-mode="heat"]:visible').first().click();
      await page.locator('.climate-preset:visible').first().click();
      await page.getByRole('button', { name: 'Eco', exact: true }).click(); assert.equal(await page.locator('dialog[open]').count(), 0);
      await picker.selectOption('0');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(90);
    const mobile = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(mobile.scroll <= mobile.viewport + 1, item.id + ' has no mobile horizontal overflow: ' + JSON.stringify(mobile));
    await page.setViewportSize({ width: 320, height: 800 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), item.id + ' also fits 320px');
    await page.setViewportSize({ width: 1100, height: 900 });
    checks.push({ id: item.id, variants, switch: true, slider: true, mobile });
    console.log('PASS ' + item.id + ' · ' + variants + ' variant(s)');
  }
  const motion = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'no-preference' });
  await motion.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  const animated = await motion.newPage(); animated.on('pageerror', error => errors.push(error.message));
  await animated.goto(origin + '/pages/dash6-satin-system.html');
  const animatedSwitch = animated.locator('.stage .switch:visible').first(); const animatedBefore = await animatedSwitch.getAttribute('aria-checked');
  await animatedSwitch.click(); assert.equal(await animatedSwitch.evaluate(button => button.classList.contains('pressing')), true, 'Squeeze phase exists with animation enabled');
  await wait(180); assert.notEqual(await animatedSwitch.getAttribute('aria-checked'), animatedBefore, 'Animated switch changes side/state after squeeze');
  assert.equal(await animated.locator('.stage .switch:visible').first().evaluate(button => getComputedStyle(button.querySelector('.knob-position')).transitionDuration.includes('0s')), false, 'Switch travel uses a real transition');
  await motion.close();
  await page.goto(origin + '/');
  assert.equal(await page.locator('.gallery-card').count(), 11);
  await page.screenshot({ path: join(root, 'previews/gallery-desktop.jpg'), fullPage: true, type: 'jpeg', quality: 82 });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: join(root, 'previews/gallery-mobile.jpg'), fullPage: true, type: 'jpeg', quality: 82 });
  assert.deepEqual(errors, [], 'No JavaScript runtime errors');
  assert.deepEqual(externalRequests, [], 'Entire gallery works offline without remote resources');
  assert.deepEqual(missingRequests, [], 'All relative resources exist');
  await writeFile(join(root, 'test-results.json'), JSON.stringify({ pages: checks, motion: 'Squeeze, delayed state change and CSS travel transition verified with animations enabled', narrowViewport: 320, runtimeErrors: errors, externalRequests, missingRequests, services: 'No device APIs or Home Assistant services', mode: 'Isolated local browser' }, null, 2) + '\n');
  let bytes = 0; async function count(dir) { for (const name of await readdir(dir)) { const path = join(dir, name), info = await stat(path); if (info.isDirectory()) await count(path); else bytes += info.size; } } await count(root);
  console.log(`PASS: all ${checks.length} standalone demos, gallery desktop/mobile, all local resources, ${bytes} bytes. No device commands.`);
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
