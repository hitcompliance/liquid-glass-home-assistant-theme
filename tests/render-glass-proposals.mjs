import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';

const output=process.env.DASH6_GAUGE_TEST_OUTPUT?pathToFileURL(process.env.DASH6_GAUGE_TEST_OUTPUT+'/'):new URL('../../output/Klima-Glas-CSS-20261021/',import.meta.url);
await mkdir(output,{recursive:true});
const background=(await readFile(new URL('../assets/liquid-glass-living-room.jpg',import.meta.url))).toString('base64');
const bundle=await build({stdin:{contents:"import './slider-lens.js';import './interaction-refinements.js';",resolveDir:process.cwd()+'/src/dash6'},bundle:true,write:false,format:'iife',logLevel:'silent'});
let html=`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
 body{margin:0;min-height:100vh;background:center/cover url(data:image/jpeg;base64,${background});color:white;font-family:Arial,sans-serif;--dash6-satin-enabled:1;--dash6-satin-slider-press-scale:1.3}
 main{margin:20px auto;width:calc(100% - 24px);max-width:390px}h2{display:inline-block;font-size:18px;margin:0;padding:8px 16px;border-radius:16px 16px 0 0;border:1px solid #ffffff80;background:#ffffff24;backdrop-filter:blur(16px);color:#101418}
 .card{position:relative;box-sizing:border-box;height:265px;border:1px solid #ffffff88;border-radius:16px;background:linear-gradient(140deg,#42495088,#262a3188);backdrop-filter:blur(16px);box-shadow:inset 0 1px 0 #ffffff70,0 6px 16px #0003}
 .dial{position:relative;width:201px;height:201px;margin:0 auto}ha-control-circular-slider{display:block;position:relative;width:201px;height:201px}
 .readings{position:absolute;inset:0;pointer-events:none;text-align:center}.state{margin-top:56px;color:#ff812c;font-size:15px}.temps{margin-top:12px;font-size:43px;font-weight:300;white-space:nowrap}.temps small{font-size:19px}.temps sup{font-size:14px;vertical-align:top;line-height:28px}.secondary{color:#d6d4d2}.current{margin-top:12px;color:#ff812c;font-size:16px}
 .features{display:flex;justify-content:space-between;align-items:center;padding:3px 12px 12px}.modes{display:flex;padding:2px;border:1px solid #ffffff40;border-radius:13px;background:#10212c66;box-shadow:inset 0 2px 7px #0006}.modes span,.preset{display:grid;place-items:center;width:42px;height:38px;font-size:23px}.modes .selected,.preset{border:1px solid #ffffff77;background:linear-gradient(145deg,#ffffff33,#ffffff09);box-shadow:inset 0 1px 1px #ffffff99,0 2px 4px #0004;border-radius:10px}.preset{box-sizing:border-box;width:44px;height:42px}
 </style><main><h2>Klima</h2><div class="card"><div class="dial"><ha-control-circular-slider></ha-control-circular-slider><div class="readings"><div class="state">Heizbetrieb</div><div class="temps">23<small>,5</small><sup>°C</sup> <span class="secondary">26<small>,2</small><sup>°C</sup></span></div><div class="current">♨ 23,2 °C</div></div></div><div class="features"><div class="modes"><span>⏻</span><span>♨</span><span>❄</span><span class="selected">☀</span></div><span class="preset">⌂</span></div></div></main>`;


const defineGauge = '\n   customElements.define(\'ha-control-circular-slider\',class extends HTMLElement{\n    constructor(){super();this.attachShadow({mode:\'open\'}).innerHTML=`<style>\n     :host{display:block;width:201px;height:201px}svg{display:block;width:100%;overflow:visible;pointer-events:none}g{fill:none}path{stroke-linecap:round}.background{stroke:#aab4c3;opacity:.3;stroke-width:24}.arc{stroke-width:24}.arc-clear{stroke:#242a33}.arc-colored{opacity:.5}.low{stroke:#ff7b22}.high{stroke:#48a9ff}.target{stroke:white;stroke-width:18}.target-border{stroke:white;stroke-width:24}.inactive .arc{opacity:0}[data-interaction]{stroke:transparent;stroke-width:48;pointer-events:auto}\n     </style><svg id="slider" viewBox="0 0 320 320"><g transform="translate(160 160) rotate(135)">\n     <path data-interaction d="M145 0 A145 145 0 1 1 0 -145"/>\n     <path class="background" d="M145 0 A145 145 0 1 1 0 -145"/>\n     <g><path class="arc arc-clear" stroke-dasharray="437 911" d="M145 0 A145 145 0 1 1 0 -145"/><path class="arc arc-colored low" stroke-dasharray="437 911" d="M145 0 A145 145 0 1 1 0 -145"/><path class="arc arc-active low" role="slider" tabindex="0" aria-label="Heizgrenze" aria-valuenow="23.5" aria-disabled="false" stroke-dasharray="12 911" stroke-dashoffset="-425" d="M145 0 A145 145 0 1 1 0 -145"/><path class="target-border low" stroke-dasharray="0 911" stroke-dashoffset="-437" d="M145 0 A145 145 0 1 1 0 -145"/><path class="target" stroke-dasharray="0 911" stroke-dashoffset="-437" d="M145 0 A145 145 0 1 1 0 -145"/></g>\n     <g><path class="arc arc-clear" stroke-dasharray="145 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/><path class="arc arc-colored high" stroke-dasharray="145 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/><path class="arc arc-active high" role="slider" tabindex="0" aria-label="Kühlgrenze" aria-valuenow="26.2" aria-disabled="false" stroke-dasharray="0 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/><path class="target-border high" stroke-dasharray="0 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/><path class="target" stroke-dasharray="0 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/></g></g></svg>`;}\n    updated(){} disconnectedCallback(){}\n   });\n';
const proposalCSS=await readFile(new URL('../../output/Klima-Rohr-Entwuerfe-20261021/rohr-ohne-rand.css',import.meta.url),'utf8');
const variants=[
 {id:'A',name:'Kräftiges Glas',description:'Sattes Orange · ohne umlaufende Randlinie',transmission:1},
 {id:'B',name:'Halbtransparent',description:'50 % Farbkörper · klare Lichtreflexe',transmission:.5},
 {id:'C',name:'Klares Glas',description:'28 % Farbkörper · zarte Tönung',transmission:.28}
];
const card=html.slice(html.indexOf('<main>')).replace('23,2 °C','21,4 °C');
const head=html.slice(0,html.indexOf('<main>'));
const galleryStyle=`<style>
 body{background:#151b22;color:#f5f7fa;font-family:Arial,sans-serif}
 .gallery{display:grid;grid-template-columns:repeat(3,430px);gap:14px;padding:18px}
 article{background:#222b35;border:1px solid #ffffff20;border-radius:18px;overflow:hidden}
 header{padding:17px 20px 14px}header strong{font-size:21px;display:block}header p{margin:7px 0 0;color:#b8c3cf;font-size:12px}
 .stage{padding:1px 0 16px;background:center/cover url(data:image/jpeg;base64,${background})}
 main{margin:20px auto 0}.note{font-size:11px;color:#b8c3cf;margin:0 20px 16px}.card{background:linear-gradient(140deg,#424950b8,#262a31b8)}
 </style>`;
const init=`
(async()=>{
${defineGauge}
${bundle.outputFiles[0].text.replace('location.pathname === "/dash-6" || location.pathname.startsWith("/dash-6/")','true /* standalone design preview */')}
await new Promise(requestAnimationFrame);
const variants=${JSON.stringify(variants)};
for (const [index,g] of Array.from(document.querySelectorAll('ha-control-circular-slider')).entries()){
 g.setAttribute('data-dash6-satin-climate','');g.updated();
 const root=g.shadowRoot,layer=root.querySelector('[data-dash6-circular-lenses]');
 const a=root.querySelector('.arc-active.low');a.setAttribute('stroke-dasharray','80 911');a.setAttribute('stroke-dashoffset','-357');
 const style=document.createElement('style');style.textContent=${JSON.stringify(proposalCSS)};layer.append(style);
 const body=document.createElement('div');body.className='proposal-body';body.style.setProperty('--proposal-transmission',variants[index].transmission);
 layer.prepend(body);
 for(const n of [...layer.querySelectorAll('[data-dash6-circular-tint],[data-dash6-circular-warm],[data-dash6-circular-active],[data-dash6-tube-cap]')])body.append(n);
 for(const lens of root.querySelectorAll('dash6-slider-lens')){
  const st=document.createElement('style');st.textContent=':host([circular][glass-tube]) .glass{border:0;box-shadow:inset 0 -2px 3px #0005,0 2px 3px #0003}:host([circular][glass-tube]) .gloss{box-shadow:none}:host([circular][glass-tube]) .scene{opacity:'+(.76*variants[index].transmission)+'}';lens.shadowRoot.append(st);
 }
}
})();
`;
const contents=head+galleryStyle+'<div class="gallery">'+variants.map(v=>`<article id="variant-${v.id}"><header><strong>${v.id} · ${v.name}</strong><p>${v.description}</p></header><div class="stage">${card}</div><p class="note">CSS-Entwurf · Testwerte · Ist–Soll-Bereich rot-orange</p></article>`).join('')+'</div><script>'+init.replaceAll('</script>','<\\/script>')+'</script>';
await writeFile(new URL('Vergleich.html',output),contents);
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1350,height:470},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://127.0.0.1/**',r=>r.fulfill({contentType:'text/html',body:contents}));
 await page.goto('http://127.0.0.1/dash-6/proposals');
 await page.waitForTimeout(180);
 assert.deepEqual(errors,[]);
 assert.equal(await page.locator('dash6-slider-lens[glass-tube]').count(),6);
 await page.locator('.gallery').screenshot({path:fileURLToPath(new URL('Vergleich.png',output))});
 for(const v of variants)await page.locator('#variant-'+v.id).screenshot({path:fileURLToPath(new URL(v.id+'-'+v.name+'.png',output))});
 await page.goto(new URL('Vergleich.html',output).href);
 await page.waitForTimeout(180);
 assert.deepEqual(errors,[]);
 assert.equal(await page.locator('dash6-slider-lens[glass-tube]').count(),6);
 console.log('Rendered 3 CSS proposals; standalone HTML checked; no live changes.');
}finally{await browser.close();}
