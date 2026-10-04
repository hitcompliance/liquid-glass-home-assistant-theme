export function displacementPixels(w=128,h=128){
 const pixels=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const nx=(x+.5-w/2)/(w/2),ny=(y+.5-h/2)/(h/2),r=Math.hypot(nx,ny),bend=r<.52?0:Math.sin(Math.min(1,(r-.52)/.48)*Math.PI/2)*.46,idx=(y*w+x)*4;
  pixels[idx]=Math.round(128+(r?nx/r:0)*bend*127);pixels[idx+1]=Math.round(128+(r?ny/r:0)*bend*127);pixels[idx+2]=128;pixels[idx+3]=255;
 }return pixels;
}
