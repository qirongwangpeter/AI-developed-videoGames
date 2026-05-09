// Weapon definitions + viewmodel builder.
import * as THREE from 'three';

export const W = {
  M4A1:   { name:'M4A1',   dmg:24, fireRate:90,  mag:30, reserveMax:240, spread:0.018, auto:true,  range:120, type:'rifle' },
  AK47:   { name:'AK-47',  dmg:32, fireRate:115, mag:30, reserveMax:180, spread:0.024, auto:true,  range:110, type:'rifle' },
  SCAR:   { name:'SCAR-H', dmg:38, fireRate:130, mag:20, reserveMax:140, spread:0.022, auto:true,  range:140, type:'rifle' },
  HK416:  { name:'HK416',  dmg:26, fireRate:80,  mag:30, reserveMax:240, spread:0.016, auto:true,  range:125, type:'rifle' },
  MP5:    { name:'MP5',    dmg:18, fireRate:65,  mag:30, reserveMax:300, spread:0.025, auto:true,  range:55,  type:'smg' },
  P90:    { name:'P90',    dmg:16, fireRate:50,  mag:50, reserveMax:300, spread:0.024, auto:true,  range:55,  type:'smg' },
  M249:   { name:'M249',   dmg:22, fireRate:80,  mag:100,reserveMax:300, spread:0.03,  auto:true,  range:100, type:'lmg' },
  AWM:    { name:'AWM',    dmg:135,fireRate:1200,mag:5,  reserveMax:30,  spread:0.001, auto:false, range:300, type:'sniper' },
  BARRETT:{ name:'巴雷特',  dmg:200,fireRate:1500,mag:10, reserveMax:30,  spread:0.003, auto:false, range:340, type:'sniper' },
  M870:   { name:'M870',   dmg:18, fireRate:700, mag:7,  reserveMax:48,  spread:0.05,  auto:false, range:28,  type:'shotgun', pellets:8 },
  GLOCK:  { name:'Glock',  dmg:22, fireRate:120, mag:17, reserveMax:120, spread:0.02,  auto:false, range:50,  type:'pistol' },
  DEAGLE: { name:'沙漠之鹰',dmg:65, fireRate:300, mag:7,  reserveMax:42,  spread:0.012, auto:false, range:70,  type:'pistol' },
  RPG:    { name:'RPG-7',  dmg:280,fireRate:1500,mag:1,  reserveMax:5,   spread:0.005, auto:false, range:160, type:'rocket' },
};

export function viewmodelGun(wn){
  const w = W[wn];
  const g = new THREE.Group();
  const isS = w.type==='sniper', isSG = w.type==='shotgun', isP = w.type==='pistol', isL = w.type==='lmg', isR = w.type==='rocket';
  const len = isS ? 0.9 : isP ? 0.25 : isL ? 0.7 : isSG ? 0.7 : isR ? 1.1 : 0.55;
  const bm = new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.45, metalness:0.55 });
  const wd = new THREE.MeshStandardMaterial({ color:0x2a1f15, roughness:0.7 });

  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, len), bm));
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, len*0.9),
    new THREE.MeshStandardMaterial({ color:0x2a2a2a }));
  upper.position.y = 0.07; g.add(upper);

  if(!isP && !isR){
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.25), wd);
    stock.position.z = len/2 + 0.1; g.add(stock);
  }
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), bm);
  grip.position.set(0, -0.11, isP ? 0.05 : 0.18);
  grip.rotation.x = -0.18; g.add(grip);

  if(!isR){
    const mag = new THREE.Mesh(new THREE.BoxGeometry(isL?0.16:0.04, isL?0.28:0.16, isL?0.2:0.1), bm);
    mag.position.y = -0.13; g.add(mag);
  }

  const barL = isS ? 0.5 : isP ? 0.15 : isSG ? 0.45 : isR ? 0.7 : 0.3;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, barL, 8),
    new THREE.MeshStandardMaterial({ color:0x222, metalness:0.85, roughness:0.2 }));
  bar.rotation.x = Math.PI/2;
  bar.position.z = -len/2 - barL/2 + 0.1;
  g.add(bar);

  if(isS){
    const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 12), bm);
    sb.rotation.x = Math.PI/2;
    sb.position.set(0, 0.13, 0.05);
    g.add(sb);
  } else {
    const rs = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.02), bm);
    rs.position.set(0, 0.105, 0.15); g.add(rs);
    const fs = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.012), bm);
    fs.position.set(0, 0.115, -len/2 + 0.05); g.add(fs);
  }

  // hands
  const glove = new THREE.MeshStandardMaterial({ color:0x141414, roughness:0.95 });
  const sleeve = new THREE.MeshStandardMaterial({ color:0x3a4a35, roughness:0.85 });
  const hR = new THREE.Group();
  hR.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.09), glove));
  const sR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.18), sleeve);
  sR.position.z = 0.13; hR.add(sR);
  hR.position.set(0, -0.13, isP ? 0.05 : 0.18);
  g.add(hR);
  if(!isP){
    const hL = new THREE.Group();
    hL.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.1), glove));
    const sL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18), sleeve);
    sL.position.set(0.04, -0.04, 0.18);
    sL.rotation.z = -0.4; hL.add(sL);
    hL.position.set(-0.02, -0.05, -len/4);
    g.add(hL);
  }

  // muzzle flash
  const mf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4),
    new THREE.MeshBasicMaterial({ color:0xffcc66, transparent:true, opacity:0 }));
  mf.position.set(0, 0, -len/2 - barL);
  g.add(mf);
  const ml = new THREE.PointLight(0xffaa44, 0, 8);
  mf.add(ml);
  g.userData.muzzle = mf;
  g.userData.muzzleLight = ml;
  return g;
}

export const SQUAD_DEF = [
  { id:'price',  name:'普莱斯', icon:'P', color:'#a87a4a', skill:'战术烟雾',     cdMax:30, weapon:'M4A1', secondary:'GLOCK',
    opts:{ body:0x4a3a2a, vest:0x2a2018, hat:'boonie' } },
  { id:'ghost',  name:'幽灵',   icon:'G', color:'#444',    skill:'协助射击',     cdMax:25, weapon:'AWM',  secondary:'GLOCK',
    opts:{ body:0x1a1a1a, vest:0x0a0a0a, mask:'skull' } },
  { id:'soap',   name:'肥皂',   icon:'S', color:'#7a5a3a', skill:'C4 爆破',      cdMax:30, weapon:'AK47', secondary:'M870',
    opts:{ body:0x3a4a35, vest:0x2a3025, mohawk:true } },
  { id:'wangqr', name:'王启融', icon:'启',color:'#cc3a3a', skill:'重机枪压制',   cdMax:35, weapon:'M249', secondary:'DEAGLE',
    opts:{ body:0x6a2020, vest:0x8a1515, vestText:'ANW', helmet:0x1a1a1a } },
  { id:'wangjz', name:'王敬之', icon:'敬',color:'#3acc6a', skill:'群体回血+复活',cdMax:40, weapon:'SCAR', secondary:'GLOCK',
    opts:{ body:0x205020, vest:0x158a30, vestText:'ANW', helmet:0x1a1a1a } }
];
