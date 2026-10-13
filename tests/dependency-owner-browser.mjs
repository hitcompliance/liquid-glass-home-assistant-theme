// Test bootstrap ownership with real ESM caching and unguarded custom-element
// registration. Fixtures replace upstream/device code; no Home Assistant access.
import assert from 'node:assert/strict';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, webkit} from 'playwright';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(execFileSync('python3', ['-c', `
import hashlib,importlib,json,pathlib,sys,tempfile,types
from unittest.mock import patch
root=pathlib.Path(sys.argv[1]);package=types.ModuleType('owner_test');package.__path__=[str(root/'custom_components/liquid_glass')];sys.modules['owner_test']=package
runtime=importlib.import_module('owner_test.runtime')
payload=b'window.dependencyExecutions=(window.dependencyExecutions||0)+1;customElements.define("embedded-view-card",class extends HTMLElement{});customElements.define("embedded-view-card-editor",class extends HTMLElement{});'
with tempfile.TemporaryDirectory() as temp:
 base=pathlib.Path(temp);bundle=base/'bundle';bundle.mkdir()
 asset={'path':'embedded-view-card.js','url':'https://raw.githubusercontent.com/example/repo/'+('a'*40)+'/embedded-view-card.js','sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)}
 lock={'schema_version':1,'dependencies':[{'id':'embedded-view-card','kind':'frontend','entrypoint':'embedded-view-card.js','assets':[asset]}]};(bundle/'dependencies.lock.json').write_text(json.dumps(lock))
 original=runtime.installer.dependency_files
 def dependencies(deps,cache,offline):return original(deps,cache,offline,lambda url:payload)
 def own_files(source):return [runtime.installer.File('www/liquid-glass/'+name,b'window.ownLoads=(window.ownLoads||0)+1;','local') for name in ['dash6-cards.js','vacuum-dock-card.js']]
 results={};hacs='/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=1'
 with patch.object(runtime,'ROOT',bundle),patch.object(runtime.installer,'dependency_files',dependencies),patch.object(runtime.installer,'package_files',side_effect=own_files):
  for scenario in ['vendor','hacs-first','hacs-later']:
   config=base/scenario
   if scenario=='hacs-later':runtime.install(config,[])
   runtime.install(config,[] if scenario=='vendor' else [hacs])
   results[scenario]=(config/'www/liquid-glass/integration-bootstrap.js').read_text()
 print(json.dumps({'bootstraps':results,'dependency':payload.decode(),'hacs':hacs}))
`, root], {encoding: 'utf8'}));
const requests = [];
const server = http.createServer((req, res) => {
  requests.push(req.url);
  const key = req.url.replace(/^\/bootstrap\//, '').replace(/\.js$/, '');
  let source;
  if (req.url.startsWith('/bootstrap/')) source = fixtures.bootstraps[key];
  else if (req.url.includes('/embedded-view-card.js')) source = fixtures.dependency;
  else if (req.url.startsWith('/local/liquid-glass/')) source = 'window.ownLoads=(window.ownLoads||0)+1;';
  else {res.writeHead(200, {'Content-Type': 'text/html'}); res.end('<!doctype html>'); return;}
  if (!source) {res.writeHead(404); res.end(); return;}
  res.writeHead(200, {'Content-Type': 'text/javascript'}); res.end(source);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    browser = await engine.launch({headless: true});
    for (const scenario of ['vendor', 'hacs-first', 'hacs-later', 'already-defined']) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.address().port + '/');
      requests.length = 0;
      const result = await page.evaluate(async ({scenario, hacs}) => {
        if(scenario==='already-defined'){customElements.define('embedded-view-card',class extends HTMLElement{});customElements.define('embedded-view-card-editor',class extends HTMLElement{});}
        await Promise.all([import('/bootstrap/' + (scenario==='already-defined'?'vendor':scenario) + '.js'), ...(['vendor','already-defined'].includes(scenario) ? [] : [import(hacs)])]);
        return {executions: window.dependencyExecutions||0, defined: !!customElements.get('embedded-view-card')};
      }, {scenario, hacs: fixtures.hacs});
      assert.deepEqual(result, {executions: scenario==='already-defined'?0:1, defined: true}, name + ' ' + scenario);
      assert.equal(requests.filter(url => url.includes('/embedded-view-card.js')).length, scenario==='already-defined'?0:1, 'at most one dependency module request');
      assert.equal(requests.some(url => url.includes('/vendor/')), scenario === 'vendor', 'fresh migrated page uses only HACS owner');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS ' + name + ': vendor-only, HACS-first and vendor-to-HACS fresh page and previously defined upstream; no duplicate definition.');
    await browser.close();browser = null;
  }
} finally {await browser?.close();await new Promise(resolve => server.close(resolve));}
