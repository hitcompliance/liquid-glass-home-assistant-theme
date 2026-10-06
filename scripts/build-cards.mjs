import {build} from 'esbuild';
import {readFile,writeFile,mkdir,rm,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const output='dist';
await rm(output,{recursive:true,force:true});
await mkdir(output+'/profiles',{recursive:true});
const profiles=JSON.parse(await readFile('src/dash6/profiles.json','utf8'));
const bytes=Buffer.from(JSON.stringify(profiles));
const profileFile='samples-'+createHash('sha256').update(bytes).digest('hex').slice(0,12)+'.json';
await writeFile(output+'/profiles/'+profileFile,bytes);
await writeFile('src/dash6/profile-index.json',JSON.stringify(Object.fromEntries(Object.keys(profiles).map(key=>[key,profileFile])))+'\n');
await build({entryPoints:{'dash6-cards':'src/dash6/index.js','vacuum-dock-card':'src/vacuum-dock/index.js'},bundle:true,format:'esm',target:'es2022',outdir:output,splitting:true,chunkNames:'chunks/[name]-[hash]',external:['/local/liquid-glass/vendor/*'],loader:{'.css':'text'},minify:true,legalComments:'inline',banner:{js:'/*! Liquid Glass Cards 2.4.1 | MIT; Vacuum Dock/HA animation Apache-2.0; Lit BSD-3-Clause | See licenses/ and THIRD-PARTY-LICENSES.md */'}});
await writeFile(output+'/dash5-light-cards-v2.js',"/*! DASH5 v2 compatibility names use the current Satin implementation. */\nimport './dash6-cards.js';\n");
await mkdir(output+'/backgrounds',{recursive:true});
await cp('assets/liquid-glass-living-room.jpg',output+'/backgrounds/living-room.jpg');
await cp('licenses',output+'/licenses',{recursive:true});
await cp('THIRD-PARTY-LICENSES.md',output+'/THIRD-PARTY-LICENSES.md');
async function files(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const name=path.join(dir,entry.name);if(entry.isDirectory())result.push(...await files(name));else result.push(name);}return result;}
for(const name of await files(output))if(/\.(js|json)$/.test(name))await writeFile(name+'.gz',gzipSync(await readFile(name),{level:9}));
const manifest={version:'2.4.1',modules:['dash6-cards.js','vacuum-dock-card.js','dash5-light-cards-v2.js'],files:{}};
for(const name of (await files(output)).sort())manifest.files[name.slice(output.length+1)]={sha256:createHash('sha256').update(await readFile(name)).digest('hex')};
await writeFile(output+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Built '+manifest.modules.length+' modules, '+Object.keys(profiles).length+' generic profiles, '+Object.keys(manifest.files).length+' verified files.');
