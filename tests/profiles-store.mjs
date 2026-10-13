import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../src/dash6/profiles-store.js', import.meta.url), 'utf8');
let sequence = 0;
async function fixture(routes, run, chunk = false) {
  const url = `https://fixture.invalid/local/cards/${chunk ? 'chunks/' : ''}profiles-store.js`;
  const module = source.replace(/^import INDEX[^\n]*\n/, 'const INDEX={"demo-fixture":"builtin.json"};\n').replaceAll('import.meta.url', JSON.stringify(url));
  const reads = [], previous = globalThis.fetch;
  globalThis.fetch = async input => {
    const path = new URL(input).pathname; reads.push(path);
    const route = routes[path];
    if (typeof route === 'function') return route();
    return {ok: route !== undefined, status: route === undefined ? 404 : 200, json: async () => structuredClone(route)};
  };
  try {
    const store = await import(`data:text/javascript;base64,${Buffer.from(module + `\n// fresh ${++sequence}`).toString('base64')}`);
    await run(store, reads);
  } finally {globalThis.fetch = previous;}
}

test('local index and a shared profile file are read once for concurrent profiles and cached loads', async () => {
  await fixture({'/local/cards/profiles/index.json': {'fixture-one': 'local-1.json', 'fixture-two': 'local-1.json'},
    '/local/cards/profiles/local-1.json': {'fixture-one': {type: 'tile', entity: 'light.fixture_one'}, 'fixture-two': {type: 'tile', entity: 'light.fixture_two'}},
  }, async ({loadProfile}, reads) => {
    const [one, two] = await Promise.all([loadProfile('fixture-one'), loadProfile('fixture-two')]);
    assert.equal(one.entity, 'light.fixture_one'); assert.equal(two.entity, 'light.fixture_two');
    assert.equal(await loadProfile('fixture-one'), one);
    assert.deepEqual(reads, ['/local/cards/profiles/index.json', '/local/cards/profiles/local-1.json']);
  });
});

test('only a local JSON basename is accepted; invalid and unknown keys fail without a profile request', async () => {
  const invalid = {'traversal': '../outside.json', 'absolute': '/outside.json', 'foreign': 'https://foreign.invalid/file.json',
    'query': 'local.json?x=1', 'space': 'bad name.json', 'non-json': 'local.js', 'object': {file: 'local.json'}};
  await fixture({'/local/cards/profiles/index.json': {...invalid, valid: 'fixture_1.2-test.json'},
    '/local/cards/profiles/fixture_1.2-test.json': {valid: {type: 'tile'}},
  }, async ({loadProfile}, reads) => {
    for (const key of [...Object.keys(invalid), 'missing']) await assert.rejects(loadProfile(key), /Unbekanntes DASH6-Kartenprofil:/);
    assert.deepEqual(reads, ['/local/cards/profiles/index.json']);
    assert.deepEqual(await loadProfile('valid'), {type: 'tile'});
    assert.deepEqual(reads, ['/local/cards/profiles/index.json', '/local/cards/profiles/fixture_1.2-test.json']);
  });
});

test('bundled demos retain precedence and never request the local index', async () => {
  await fixture({'/local/cards/profiles/builtin.json': {'demo-fixture': {type: 'tile', entity: 'light.demo_fixture'}},
    '/local/cards/profiles/index.json': {'demo-fixture': 'override.json'},
  }, async ({loadProfile}, reads) => {
    assert.equal((await loadProfile('demo-fixture')).entity, 'light.demo_fixture');
    assert.deepEqual(reads, ['/local/cards/profiles/builtin.json']);
  });
});

test('missing or unreachable local index yields unknown-profile errors and remains cached', async () => {
  for (const routes of [{}, {'/local/cards/profiles/index.json': () => {throw Error('offline');}}]) {
    await fixture(routes, async ({loadProfile}, reads) => {
      await assert.rejects(loadProfile('missing-one'), /Unbekanntes DASH6-Kartenprofil:/);
      await assert.rejects(loadProfile('missing-two'), /Unbekanntes DASH6-Kartenprofil:/);
      assert.deepEqual(reads, ['/local/cards/profiles/index.json']);
    });
  }
});

test('chunks resolve local index and profile files at their parent resource directory', async () => {
  await fixture({'/local/cards/profiles/index.json': {local: 'neutral.json'}, '/local/cards/profiles/neutral.json': {local: {type: 'tile'}}},
    async ({loadProfile}, reads) => {
      assert.deepEqual(await loadProfile('local'), {type: 'tile'});
      assert.deepEqual(reads, ['/local/cards/profiles/index.json', '/local/cards/profiles/neutral.json']);
    }, true);
});
