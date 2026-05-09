// Character mesh builder. Used by squad + enemies.
import * as THREE from 'three';

export function buildCharacter(opts){
  const g = new THREE.Group();
  const skin = opts.skin ?? 0xc9a070;
  const body = opts.body ?? 0x3a4a35;
  const vest = opts.vest ?? 0x2a3525;

  // legs
  const legM = new THREE.MeshStandardMaterial({ color: opts.enemy ? 0x2a1818 : 0x232a18, roughness: 0.85 });
  for(const sx of [-1, 1]){
    const lg = new THREE.Group();
    const u = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.5, 10), legM);
    u.position.y = -0.25; u.castShadow = true; lg.add(u);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), legM);
    k.position.y = -0.5; lg.add(k);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.5, 10), legM);
    l.position.y = -0.75; l.castShadow = true; lg.add(l);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x1a1410 }));
    bt.position.set(0, -1.04, 0.05); bt.castShadow = true; lg.add(bt);
    lg.position.set(sx*0.13, 0.95, 0);
    g.add(lg);
  }

  // torso & hips
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32),
    new THREE.MeshStandardMaterial({ color: body, roughness: 0.9 }));
  torso.position.y = 1.5; torso.castShadow = true; g.add(torso);
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.32),
    new THREE.MeshStandardMaterial({ color: body, roughness: 0.9 }));
  hips.position.y = 1.05; hips.castShadow = true; g.add(hips);

  // vest plates
  const vestMat = new THREE.MeshStandardMaterial({ color: vest, roughness: 0.9 });
  const cp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), vestMat);
  cp.position.set(0, 1.55, 0.18); cp.castShadow = true; g.add(cp);
  const bp = cp.clone(); bp.position.z = -0.18; g.add(bp);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.34), vestMat);
  sh.position.y = 1.78; sh.castShadow = true; g.add(sh);

  // ANW patch
  if(opts.vestText){
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#000'; ctx.font = 'bold 38px Arial'; ctx.textAlign = 'center';
    ctx.fillText(opts.vestText, 64, 46);
    const tex = new THREE.CanvasTexture(c);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21),
      new THREE.MeshBasicMaterial({ map: tex }));
    p.position.set(0, 1.55, 0.22); g.add(p);
    const pb = p.clone(); pb.position.z = -0.22; pb.rotation.y = Math.PI; g.add(pb);
  }

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 }));
  head.scale.set(1, 1.1, 0.95);
  head.position.y = 2.06; head.castShadow = true;
  g.add(head);

  if(!opts.mask){
    const eye = new THREE.MeshBasicMaterial({ color: 0x111 });
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), eye);
    eL.position.set(-0.06, 2.08, 0.165); g.add(eL);
    const eR = eL.clone(); eR.position.x = 0.06; g.add(eR);
  }

  // skull mask (Ghost)
  if(opts.mask === 'skull'){
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(20, 28, 8, 9, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(44, 28, 8, 9, 0, 0, Math.PI*2); ctx.fill();
    for(let i=0;i<5;i++) ctx.fillRect(18 + i*5, 46, 4, 8);
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.182, 12, 10),
      new THREE.MeshBasicMaterial({ map: tex }));
    m.scale.set(1, 1.1, 0.96); m.position.copy(head.position);
    g.add(m);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8, 0, Math.PI*2, 0, Math.PI*0.62),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 }));
    hood.position.y = 2.1; hood.castShadow = true;
    g.add(hood);
  }

  // mohawk (Soap)
  if(opts.mohawk){
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x2a1810 }));
    m.position.y = 2.22; m.castShadow = true;
    g.add(m);
  }

  // helmet
  if(opts.helmet){
    const hm = new THREE.MeshStandardMaterial({ color: opts.helmet, roughness: 0.55, metalness: 0.15 });
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI*2, 0, Math.PI*0.55), hm);
    h.position.y = 2.13; h.castShadow = true;
    g.add(h);
  }

  // boonie hat (Price)
  if(opts.hat === 'boonie'){
    const m = new THREE.MeshStandardMaterial({ color: 0x4a3a25, roughness: 0.95 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 14), m);
    brim.position.y = 2.18; brim.castShadow = true; g.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 14), m);
    top.position.y = 2.27; top.castShadow = true; g.add(top);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3a2a15 }));
    st.position.set(0, 1.97, 0.17); g.add(st);
  }

  // arms
  const armM = new THREE.MeshStandardMaterial({ color: body, roughness: 0.85 });
  for(const sx of [-1, 1]){
    const a = new THREE.Group();
    const u = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.4, 8), armM);
    u.position.y = -0.2; u.castShadow = true; a.add(u);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), armM);
    e.position.y = -0.4; a.add(e);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.38, 8), armM);
    l.position.y = -0.59; l.castShadow = true; a.add(l);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 }));
    gl.position.y = -0.83; gl.castShadow = true; a.add(gl);
    a.position.set(sx*0.32, 1.78, 0);
    a.rotation.x = -0.4;
    a.rotation.z = sx*0.1;
    g.add(a);
  }

  // gun (held)
  const gun = new THREE.Group();
  const gm = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45, metalness: 0.55 });
  gun.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.55), gm));
  const gbar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x222, metalness: 0.8, roughness: 0.2 }));
  gbar.rotation.x = Math.PI/2; gbar.position.z = -0.4;
  gun.add(gbar);
  gun.position.set(0.2, 1.45, -0.1);
  gun.castShadow = true;
  g.add(gun);

  return g;
}
