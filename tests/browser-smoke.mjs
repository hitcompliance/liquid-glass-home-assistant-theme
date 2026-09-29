import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

for (const [browserName, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
const browser = await launcher.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.goto('http://127.0.0.1:8765/frontend/demo.html');
await page.waitForFunction(() => document.querySelector('#dash5-liquid-glass-optics')?.dataset.ready === 'true');
await page.waitForTimeout(500);

const initial = await page.evaluate(() => ({
  engine: window.__liquidGlassDASH5,
  lenses: Number(document.querySelector('#dash5-liquid-glass-optics')?.dataset.lenses),
  imageCopies: document.querySelectorAll('#dash5-liquid-glass-optics img').length,
  canvas: document.querySelectorAll('canvas').length,
  cardRegistered: !!customElements.get('liquid-glass-card'),
}));
assert.ok(initial.lenses > 0, 'No lenses on demo cards');
assert.equal(initial.imageCopies, initial.lenses, 'Each lens must copy the fixed wallpaper');
assert.equal(initial.canvas, 0, 'Unexpected canvas renderer');
assert.equal(initial.engine.engine, 'SVG filter + DOM wallpaper copy');
assert.equal(initial.cardRegistered, true);
const scrollBefore = await page.evaluate(() => ({
  card: document.querySelector('ha-card').getBoundingClientRect().top,
  lens: document.querySelector('#dash5-liquid-glass-optics').firstElementChild.getBoundingClientRect().top,
  rootPosition: getComputedStyle(document.querySelector('#dash5-liquid-glass-optics')).position,
}));
assert.equal(scrollBefore.rootPosition, 'absolute');
await page.evaluate(() => window.scrollTo(0, 80));
const scrollAfter = await page.evaluate(() => ({
  card: document.querySelector('ha-card').getBoundingClientRect().top,
  lens: document.querySelector('#dash5-liquid-glass-optics').firstElementChild.getBoundingClientRect().top,
}));
assert.ok(Math.abs((scrollAfter.card - scrollBefore.card) - (scrollAfter.lens - scrollBefore.lens)) < 1,
  'Glass layer must scroll natively with its card');
await page.evaluate(() => window.scrollTo(0, 0));

const perCard = await page.evaluate(async () => {
  window.loadCardHelpers = async () => ({ createCardElement: () => {
    const child = document.createElement('ha-card'); child.textContent = 'Test'; return child;
  } });
  const wrapper = document.createElement('liquid-glass-card');
  wrapper.setConfig({ card: { type: 'entities' }, glass: { optics: { strength: 0.11 }, radius: '20px' } });
  document.querySelector('hui-view section').append(wrapper);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const child = wrapper.shadowRoot.querySelector('ha-card');
  return { strength: getComputedStyle(child).getPropertyValue('--lg-optic-strength').trim(),
    radius: getComputedStyle(child).getPropertyValue('--lg-card-radius').trim() };
});
assert.deepEqual(perCard, { strength: '0.11', radius: '20px' });

await page.getByRole('button', { name: 'Liquid Glass einstellen' }).click();
await page.getByLabel('Optische Linsen aktiv').uncheck();
await page.waitForFunction(() => document.querySelector('#dash5-liquid-glass-optics')?.dataset.lenses === '0');
await page.getByLabel('Optische Linsen aktiv').check();
await page.waitForFunction(() => Number(document.querySelector('#dash5-liquid-glass-optics')?.dataset.lenses) > 0);
await page.getByLabel('Darstellung').selectOption('light');
await page.waitForFunction(() => window.__liquidGlassDASH5?.mode === 'light');
const lightText = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary-text-color').trim());
assert.equal(lightText, '#122238');
await page.getByRole('button', { name: 'Schließen' }).click();
await page.getByRole('button', { name: 'Ein', exact: true }).click();
assert.equal(await page.getByRole('button', { name: 'Geklickt' }).count(), 1, 'Card control was blocked');
assert.deepEqual(errors, [], `Browser errors: ${errors.join('; ')}`);

await page.screenshot({ path: `/private/tmp/liquid-glass-${browserName.toLowerCase()}.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1700);
const mobile = await page.evaluate(() => ({
  lenses: Number(document.querySelector('#dash5-liquid-glass-optics')?.dataset.lenses),
  launcherVisible: document.querySelector('#lg-settings-launcher')?.getBoundingClientRect().right <= innerWidth,
}));
assert.ok(mobile.lenses <= 4, 'Phone lens budget exceeded');
assert.ok(mobile.lenses > 0, 'No visible optical cards on phone width');
assert.equal(mobile.launcherVisible, true, 'Mobile settings launcher is outside the viewport');
console.log(JSON.stringify({ browser: browserName, ...initial, perCard,
  mobile, controls: 'clickable', errors }, null, 2));
await browser.close();
}
