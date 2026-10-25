// Finished bitmap variants, never a permanent CSS filter or a modified HA state.
export const BACKGROUND_LEVELS = [
  {value:'original',label:'Original'},
  {value:'very_light',label:'Sehr leicht',sigma:1.5},
  {value:'light',label:'Leicht',sigma:3},
  {value:'softer',label:'Noch etwas unschärfer',sigma:5},
];
const VERSION='gaussian-box3-v1',DB='dash6-background-images-v1',STORE='images';
const jobs=new Map(),memory=new Map();let databasePromise,workerPromise,queue=Promise.resolve();
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
export function normalizeBackgroundLevel(value){return BACKGROUND_LEVELS.some(x=>x.value===value)?value:'original';}
export function backgroundSourceIdentity(source){
  const url=new URL(source,location.href);
  // HA image signatures expire; they are never persisted as cache keys.
  if(url.origin===location.origin&&url.pathname.startsWith('/api/image/serve/'))url.searchParams.delete('authSig');
  return url.href;
}
export function imageURLs(background){
  const result=[],pattern=/url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^)]*?))\s*\)/gi;let match;
  while((match=pattern.exec(background)))result.push({start:match.index,end:pattern.lastIndex,url:(match[1]??match[2]??match[3]).replace(/\\(["'\\])/g,'$1')});
  return result;
}
// Three separable box passes approximate a Gaussian. Edge pixels are clamped,
// and premultiplied alpha prevents dark fringes in transparent source images.
export function blurBitmap(bytes,width,height,sigma){
  let input=new Float32Array(bytes.length),output=new Float32Array(bytes.length);
  for(let i=0;i<bytes.length;i+=4){const a=bytes[i+3]/255;input[i]=bytes[i]*a;input[i+1]=bytes[i+1]*a;input[i+2]=bytes[i+2]*a;input[i+3]=bytes[i+3];}
  const ideal=Math.sqrt(4*sigma*sigma+1);let low=Math.floor(ideal);if(low%2===0)low--;low=Math.max(1,low);
  const high=low+2,count=Math.round((12*sigma*sigma-3*low*low-12*low-9)/(-4*low-4));
  function pass(horizontal,radius){
    const length=horizontal?width:height,lines=horizontal?height:width,step=horizontal?4:width*4,divisor=radius*2+1;
    for(let line=0;line<lines;line++){
      const base=horizontal?line*width*4:line*4,sums=[0,0,0,0];
      for(let k=-radius;k<=radius;k++){const at=base+Math.max(0,Math.min(length-1,k))*step;for(let c=0;c<4;c++)sums[c]+=input[at+c];}
      for(let position=0;position<length;position++){
        const at=base+position*step,leaving=base+Math.max(0,position-radius)*step,entering=base+Math.min(length-1,position+radius+1)*step;
        for(let c=0;c<4;c++){output[at+c]=sums[c]/divisor;sums[c]+=input[entering+c]-input[leaving+c];}
      }
    }
    [input,output]=[output,input];
  }
  for(let n=0;n<3;n++){const radius=((n<count?low:high)-1)/2;pass(true,radius);pass(false,radius);}
  const result=new Uint8ClampedArray(bytes.length);
  for(let i=0;i<result.length;i+=4){const a=input[i+3];result[i+3]=a;for(let c=0;c<3;c++)result[i+c]=a>0?input[i+c]*255/a:0;}
  return result;
}
async function database(){
  if(!globalThis.indexedDB)return null;
  if(!databasePromise)databasePromise=new Promise(resolve=>{
    const timer=setTimeout(()=>resolve(null),2000);
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'key'});
    request.onsuccess=()=>{clearTimeout(timer);const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
    request.onerror=request.onblocked=()=>{clearTimeout(timer);resolve(null);};
  });
  return databasePromise;
}
async function readCache(key){
  try{const db=await database();if(!db)return null;return await new Promise(resolve=>{const request=db.transaction(STORE).objectStore(STORE).get(key);request.onsuccess=()=>{const value=request.result;if(value?.variants)for(const [name,item] of Object.entries(value.variants))if(item.bytes instanceof ArrayBuffer)value.variants[name]=new Blob([item.bytes],{type:item.type});resolve(value||null);};request.onerror=()=>resolve(null);});}catch{return null;}
}
async function writeCache(value){
  try{
    const db=await database();if(!db)return false;
    const stored={...value,variants:Object.fromEntries(await Promise.all(Object.entries(value.variants).map(async([name,blob])=>[name,{bytes:await blob.arrayBuffer(),type:blob.type}])))};
    await new Promise((resolve,reject)=>{const transaction=db.transaction(STORE,'readwrite');transaction.objectStore(STORE).put(stored);transaction.oncomplete=resolve;transaction.onerror=transaction.onabort=()=>reject(transaction.error);});
    const records=await new Promise(resolve=>{const request=db.transaction(STORE).objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve([]);});
    records.sort((a,b)=>b.used-a.used);let total=0;const remove=[];
    for(let i=0;i<records.length;i++){total+=Object.values(records[i].variants).reduce((sum,blob)=>sum+(blob.size??blob.bytes?.byteLength??0),0);if(i>=12||total>48*1024*1024)remove.push(records[i].key);}
    if(remove.length){const tx=db.transaction(STORE,'readwrite');for(const key of remove)tx.objectStore(STORE).delete(key);}
    return true;
  }catch{return false;}
}
async function worker(){
  if(!workerPromise)workerPromise=Promise.resolve().then(()=>{
    if(typeof Worker==='undefined')return null;
    const source=`const blur=${blurBitmap.toString()};self.onmessage=e=>{try{const {bytes,width,height,sigma}=e.data;const result=blur(new Uint8ClampedArray(bytes),width,height,sigma);self.postMessage({bytes:result.buffer},[result.buffer]);}catch{self.postMessage({error:true});}}`;
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{const instance=new Worker(url);return instance;}catch{return null;}finally{URL.revokeObjectURL(url);}
  });
  return workerPromise;
}
async function blurInBackground(data,width,height,sigma){
  const instance=await worker();if(!instance){await pause();return blurBitmap(data,width,height,sigma);}
  return new Promise(resolve=>{
    let settled=false;const timer=setTimeout(()=>fallback(),30000);
    const fallback=()=>{if(settled)return;settled=true;clearTimeout(timer);instance.terminate();workerPromise=Promise.resolve(null);resolve(blurBitmap(data,width,height,sigma));};
    instance.onerror=fallback;
    instance.onmessage=e=>{if(settled)return;if(e.data.error){fallback();return;}settled=true;clearTimeout(timer);resolve(new Uint8ClampedArray(e.data.bytes));};
    try{const copy=data.slice();instance.postMessage({bytes:copy.buffer,width,height,sigma},[copy.buffer]);}catch{fallback();}
  });
}
function asBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('encode')),'image/webp',.94));}
async function decode(blob){
  if(globalThis.createImageBitmap)return createImageBitmap(blob);
  const url=URL.createObjectURL(blob),image=new Image();
  try{image.src=url;await image.decode();return image;}finally{URL.revokeObjectURL(url);}
}
async function sourceBlob(source,assetRoot){
  let url=new URL(source,location.href);
  if(!['http:','https:','data:','blob:'].includes(url.protocol))throw new Error('source');
  if(url.origin!==location.origin&&/^https?:$/.test(url.protocol)){
    // Optional local copies for remote hosts which disallow canvas/CORS access.
    // The manifest contains no credentials and cannot send local images away.
    try{
      const response=await fetch(new URL('background-source-map.json',assetRoot),{credentials:'same-origin'});
      const map=response.ok?await response.json():{};const local=map[url.href];
      if(typeof local==='string'&&local.startsWith('/local/'))url=new URL(local,location.origin);
    }catch{/* A direct CORS fetch may still succeed. */}
  }
  const response=await fetch(url,{mode:'cors',credentials:url.origin===location.origin?'same-origin':'omit',referrerPolicy:'same-origin'});
  if(!response.ok)throw new Error('fetch');const blob=await response.blob();
  if(blob.size>32*1024*1024)throw new Error('size');return blob;
}
async function prepare(source,assetRoot){
  const blob=await sourceBlob(source,assetRoot),digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
  const key=VERSION+':'+Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  const cached=await readCache(key);
  if(cached&&BACKGROUND_LEVELS.slice(1).every(x=>cached.variants?.[x.value] instanceof Blob)){cached.used=Date.now();void writeCache(cached);return {...cached,cached:true};}
  const image=await decode(blob),sourceWidth=image.width||image.naturalWidth,sourceHeight=image.height||image.naturalHeight;
  if(!sourceWidth||!sourceHeight){image.close?.();throw new Error('decode');}
  const scale=Math.min(1,2560/Math.max(sourceWidth,sourceHeight),Math.sqrt(4_000_000/(sourceWidth*sourceHeight)));
  const width=Math.max(1,Math.round(sourceWidth*scale)),height=Math.max(1,Math.round(sourceHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context){image.close?.();throw new Error('canvas');}
  context.drawImage(image,0,0,width,height);image.close?.();
  const pixels=context.getImageData(0,0,width,height),variants={};
  for(const level of BACKGROUND_LEVELS.slice(1)){
    await pause();const data=await blurInBackground(pixels.data,width,height,level.sigma*width/1920);
    context.putImageData(new ImageData(data,width,height),0,0);variants[level.value]=await asBlob(canvas);
  }
  canvas.width=canvas.height=1;
  const result={key,width,height,variants,used:Date.now(),created:Date.now()};
  result.persistent=await writeCache(result);return result;
}
export function prepareBackgroundVariants(source,assetRoot){
  const id=backgroundSourceIdentity(source);
  if(memory.has(id))return Promise.resolve(memory.get(id));
  if(jobs.has(id))return jobs.get(id);
  const job=queue.catch(()=>{}).then(()=>prepare(source,assetRoot)).then(value=>{memory.set(id,value);while(memory.size>12)memory.delete(memory.keys().next().value);return value;});
  jobs.set(id,job);queue=job;job.finally(()=>jobs.delete(id)).catch(()=>{});return job;
}
