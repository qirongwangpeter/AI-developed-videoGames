// Procedural textures, generated once at startup.
import * as THREE from 'three';
import { state } from './state.js';

function noiseTex(size, base, n){
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = `rgb(${base.join(',')})`; ctx.fillRect(0,0,size,size);
  const img = ctx.getImageData(0,0,size,size);
  for(let i=0;i<img.data.length;i+=4){
    const r = (Math.random()-0.5)*n;
    img.data[i]   = Math.max(0, Math.min(255, img.data[i]+r));
    img.data[i+1] = Math.max(0, Math.min(255, img.data[i+1]+r*0.9));
    img.data[i+2] = Math.max(0, Math.min(255, img.data[i+2]+r*0.7));
  }
  ctx.putImageData(img, 0, 0);
  for(let i=0;i<40;i++){
    const x=Math.random()*size, y=Math.random()*size, r=10+Math.random()*40;
    const g = ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,'rgba(60,40,20,0.4)'); g.addColorStop(1,'rgba(60,40,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildTextures(){
  const sand = noiseTex(512, [184,154,108], 28);
  sand.repeat.set(50, 50);
  state.tex.sand = sand;
  state.tex.wallA = noiseTex(256, [200,184,144], 36);
  state.tex.wallB = noiseTex(256, [176,152,112], 36);
  state.tex.wallC = noiseTex(256, [158,128,92], 36);
}
