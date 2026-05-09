// Ground, roads, buildings, props.
// All built progressively at startup so we get a smooth load with progress bar.
// During gameplay, distance-based visibility hides far objects (no streaming hitches).
import * as THREE from 'three';
import { state } from './state.js';

export function addCol(box, mesh){ state.colliders.push({box, mesh}); }

export function blocked(x, z, r=0.45){
  const cs = state.colliders;
  for(let i=0; i<cs.length; i++){
    const b = cs[i].box;
    const cx = Math.max(b.min.x, Math.min(x, b.max.x));
    const cz = Math.max(b.min.z, Math.min(z, b.max.z));
    const dx = x - cx, dz = z - cz;
    if(dx*dx + dz*dz < r*r) return true;
  }
  return false;
}

export function rayHit(o, dir, maxD){
  let hd = maxD, hc = null;
  const ray = new THREE.Ray(o, dir);
  const tmp = new THREE.Vector3();
  const cs = state.colliders;
  for(let i=0; i<cs.length; i++){
    const h = ray.intersectBox(cs[i].box, tmp);
    if(h){
      const d = o.distanceTo(h);
      if(d < hd){ hd = d; hc = cs[i]; }
    }
  }
  return { dist: hd, col: hc };
}

// All world props are tracked here so we can do distance-based visibility culling.
const visProps = [];

export function buildGround(){
  const g = new THREE.Mesh(
    new THREE.PlaneGeometry(state.MAP*2, state.MAP*2),
    new THREE.MeshStandardMaterial({ map: state.tex.sand, roughness: 0.97 })
  );
  g.rotation.x = -Math.PI/2;
  g.receiveShadow = true;
  state.scene.add(g);

  // roads
  function road(x1, z1, x2, z2, w=6){
    const len = Math.hypot(x2-x1, z2-z1);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, len),
      new THREE.MeshStandardMaterial({ color:0x6a503a, roughness:1, transparent:true, opacity:0.6 }));
    r.rotation.x = -Math.PI/2;
    r.position.set((x1+x2)/2, 0.02, (z1+z2)/2);
    r.rotation.z = -Math.atan2(x2-x1, z2-z1);
    r.receiveShadow = true;
    state.scene.add(r);
  }
  const M = state.MAP;
  road(-M, 0, M, 0, 8);
  road(0, -M, 0, M, 8);
  road(-M, -M, M, M, 5);
  road(M, -M, -M, M, 5);
}

function makeBuilding(x, z, w, d, h, tex){
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  state.scene.add(grp);
  const t = tex.clone();
  t.repeat.set(Math.max(1, w/3), Math.max(1, h/3));
  t.needsUpdate = true;
  const wm = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  const wt = 0.3, dW = 1.5;

  function wall(W, H, D, px, py, pz){
    const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wm);
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    grp.add(m);
    const box = new THREE.Box3().setFromObject(m);
    addCol(box, m);
  }

  // floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d),
    new THREE.MeshStandardMaterial({ color:0x4a3520, roughness:0.95 }));
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  grp.add(floor);

  // walls (front has door)
  wall((w-dW)/2, h, wt, -w/2 + (w-dW)/4, h/2, d/2);
  wall((w-dW)/2, h, wt,  w/2 - (w-dW)/4, h/2, d/2);
  wall(dW, h - 2.2, wt, 0, 2.2 + (h-2.2)/2, d/2);
  wall(w, h, wt, 0, h/2, -d/2);
  wall(wt, h, d, -w/2, h/2, 0);
  wall(wt, h, d,  w/2, h/2, 0);

  // roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.2, 0.2, d+0.2),
    new THREE.MeshStandardMaterial({ color:0x3a2515, roughness:0.95 }));
  roof.position.y = h;
  roof.castShadow = true;
  grp.add(roof);

  visProps.push({ group: grp, x, z, range: 220 });
}

function makeBarrel(x, z){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12),
    new THREE.MeshStandardMaterial({ color:0xa44030, roughness:0.6, metalness:0.3 }));
  m.position.set(x, 0.6, z);
  m.castShadow = m.receiveShadow = true;
  m.userData.explosive = true;
  m.userData.hp = 30;
  state.scene.add(m);
  const box = new THREE.Box3().setFromObject(m);
  addCol(box, m);
  visProps.push({ group: m, x, z, range: state.PROP_VISIBLE_RANGE });
}

function makeCrate(x, z, s){
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s),
    new THREE.MeshStandardMaterial({ color:0x8a6a3a, roughness:0.95 }));
  m.position.set(x, s/2, z);
  m.castShadow = m.receiveShadow = true;
  state.scene.add(m);
  const box = new THREE.Box3().setFromObject(m);
  addCol(box, m);
  visProps.push({ group: m, x, z, range: state.PROP_VISIBLE_RANGE });
}

function makeSandbag(x, z, len, rot){
  const grp = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color:0x8a7050, roughness:1 });
  const n = Math.ceil(len/0.6);
  for(let r=0;r<2;r++){
    for(let i=0;i<n;i++){
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.4), m);
      b.position.set(i*0.6 - n*0.3, 0.15 + r*0.32, (r%2)*0.05);
      b.castShadow = b.receiveShadow = true;
      grp.add(b);
    }
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = rot;
  state.scene.add(grp);

  // collision proxy
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(n*0.6, 0.7, 0.5));
  proxy.position.set(x, 0.35, z);
  proxy.rotation.y = rot;
  proxy.updateMatrixWorld();
  const box = new THREE.Box3().setFromObject(proxy);
  addCol(box, grp);

  visProps.push({ group: grp, x, z, range: state.PROP_VISIBLE_RANGE });
}

function makeRock(x, z, size){
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0),
    new THREE.MeshStandardMaterial({ color:0x8a7050, roughness:1, flatShading:true }));
  m.position.set(x, 0, z);
  m.scale.y = 0.7;
  m.rotation.y = Math.random() * Math.PI;
  m.castShadow = m.receiveShadow = true;
  state.scene.add(m);
  visProps.push({ group: m, x, z, range: state.PROP_VISIBLE_RANGE });
}

function makeFuelTank(x, z){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 5, 16),
    new THREE.MeshStandardMaterial({ color:0xddd5c0, roughness:0.6, metalness:0.4 }));
  m.position.set(x, 2.5, z);
  m.castShadow = m.receiveShadow = true;
  state.scene.add(m);
  const box = new THREE.Box3().setFromObject(m);
  addCol(box, m);
  visProps.push({ group: m, x, z, range: 250 });
}

// ---------- WORLD DATA + PROGRESSIVE BUILDER ----------
// Returns a generator of build steps so the caller can yield to the renderer.
export function* buildWorldGenerator(){
  yield { phase: '生成地面', work: () => buildGround() };

  // buildings
  const buildings = [
    [60,40,10,8,5,'wallA'], [80,50,8,6,4,'wallB'], [55,60,10,10,6,'wallA'],
    [-60,-50,12,10,5,'wallB'], [-70,-40,8,7,4,'wallA'], [-50,-60,9,8,5,'wallB'],
    [-60,55,10,8,4,'wallB'], [-75,65,8,7,5,'wallA'],
    [55,-55,12,10,6,'wallA'], [70,-65,9,7,5,'wallB'], [40,-70,9,7,5,'wallA'],
    [0,0,14,10,6,'wallA']
  ];
  for(const [x,z,w,d,h,tex] of buildings){
    yield { phase: '建造楼房', work: () => makeBuilding(x,z,w,d,h, state.tex[tex]) };
  }

  // sandbags
  const sandbags = [
    [20,15,8,0],[-20,-15,8,Math.PI/2],[40,-20,6,0],[-40,20,6,Math.PI/2],
    [0,40,10,0],[0,-40,10,0]
  ];
  for(const [x,z,l,r] of sandbags){
    yield { phase: '建造工事', work: () => makeSandbag(x,z,l,r) };
  }

  // fuel tanks
  for(const [x,z] of [[80,15],[-80,15],[60,-80],[-60,-80]]){
    yield { phase: '布置油罐', work: () => makeFuelTank(x,z) };
  }

  // random props (chunked)
  const RAND = 80;
  const propTasks = [];
  for(let i=0;i<RAND;i++){
    const x = (Math.random()-0.5)*state.MAP*1.6;
    const z = (Math.random()-0.5)*state.MAP*1.6;
    if(Math.hypot(x, z-100) < 10) continue;
    if(Math.abs(x) < 6 && Math.abs(z) < 6) continue;
    const isBarrel = Math.random() < 0.5;
    propTasks.push({ x, z, isBarrel, size: 0.9 + Math.random()*0.5 });
  }
  // batch 8 per yield
  for(let i=0;i<propTasks.length;i+=8){
    const chunk = propTasks.slice(i, i+8);
    yield {
      phase: '散布物资',
      work: () => chunk.forEach(t => t.isBarrel ? makeBarrel(t.x, t.z) : makeCrate(t.x, t.z, t.size))
    };
  }

  // distant rocks
  const rockTasks = [];
  for(let i=0;i<100;i++){
    rockTasks.push({
      x: (Math.random()-0.5)*state.MAP*1.7,
      z: (Math.random()-0.5)*state.MAP*1.7,
      s: 1 + Math.random()*2.5
    });
  }
  for(let i=0;i<rockTasks.length;i+=12){
    const chunk = rockTasks.slice(i, i+12);
    yield {
      phase: '散布岩石',
      work: () => chunk.forEach(t => makeRock(t.x, t.z, t.s))
    };
  }
}

// Per-frame distance-based visibility (cheap — just toggles .visible).
export function updateWorldVisibility(){
  if(!state.active) return;
  const px = state.active.pos.x, pz = state.active.pos.z;
  for(let i=0;i<visProps.length;i++){
    const p = visProps[i];
    const d = Math.hypot(p.x - px, p.z - pz);
    p.group.visible = d < p.range;
  }
}
