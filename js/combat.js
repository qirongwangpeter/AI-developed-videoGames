// Bullet raycasting, grenade physics, rocket physics, explosions.
import * as THREE from 'three';
import { state } from './state.js';
import { rayHit } from './world.js';
import { setActive, muzzleFlash, rebuildViewmodel } from './squad.js';
import { W } from './weapons.js';
import { log, hitMarker, updateWeaponUI, updateInvUI, endGame } from './ui.js';

function tracer(a, b, color = 0xffcc66){
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  state.scene.add(l);
  state.bullets.push({ mesh: l, life: 0.08 });
}

export function fireRay(o, dir, dmg, range, source){
  let hd = range, hE = null, hS = null;
  const pool = source === 'enemy' ? state.squad : state.enemies;
  for(let i=0; i<pool.length; i++){
    const t = pool[i];
    if(t.dead || t.hp <= 0) continue;
    const cx = t.pos.x, cy = t.pos.y + 1.4, cz = t.pos.z;
    const dx = cx - o.x, dy = cy - o.y, dz = cz - o.z;
    const tt = dx*dir.x + dy*dir.y + dz*dir.z;
    if(tt < 0 || tt > hd) continue;
    const px = o.x + dir.x*tt, py = o.y + dir.y*tt, pz = o.z + dir.z*tt;
    const ddx = px-cx, ddy = py-cy, ddz = pz-cz;
    if(ddx*ddx + ddy*ddy + ddz*ddz < 0.36){ hd = tt; if(source==='enemy') hS = t; else hE = t; }
  }
  const r = rayHit(o, dir, hd);
  if(r.col){ hd = r.dist; hE = null; hS = null; }
  tracer(o.clone(), o.clone().add(dir.clone().multiplyScalar(hd)),
    source === 'enemy' ? 0xff5533 : 0xffcc66);

  if(hE){
    let d = dmg;
    const head = (o.y + dir.y * hd) > hE.pos.y + 1.85;
    if(head) d *= 2.5;
    if(head && hE.helmetArmor > 0){
      const red = hE.type === 'heavy' ? 0.7 : 0.5;
      const ab = Math.min(hE.helmetArmor, d*red);
      hE.helmetArmor -= ab; d -= ab;
    } else if(!head && hE.armor > 0){
      const red = hE.type === 'heavy' ? 0.6 : 0.4;
      const ab = Math.min(hE.armor, d*red);
      hE.armor -= ab; d -= ab;
    }
    if(state.lastStandActive) d *= 1.5;
    hE.hp -= d; hE.hitFlash = 0.15;
    hE.state = 'aggro';
    hE.target = state.active?.pos;
    if(hE.type === 'shotgun' && !hE.raged && hE.hp < hE.maxHp*0.5){
      hE.raged = true;
      hE.fireRate *= 0.5;
      hE.speed *= 1.5;
      log('霰弹兵狂暴！', '#c8302a');
    }
    if(source === 'player') hitMarker(head);
    if(hE.hp <= 0){
      hE.group.rotation.z = Math.PI/2;
      hE.group.position.y -= 0.2;
      for(const o2 of state.enemies){
        if(o2.hp > 0 && o2.pos.distanceTo(hE.pos) < 25){
          o2.state = 'aggro';
          o2.target = state.active?.pos;
        }
      }
      if(source === 'player') log(head ? '爆头击杀！' : '击杀', '#ffb347');
    }
    return;
  }
  if(hS){
    let d = dmg;
    const head = (o.y + dir.y * hd) > hS.pos.y + 1.85;
    if(head && hS.helmet > 0){
      const red = hS.helmetTier === 'heavy' ? 0.7 : 0.5;
      const ab = Math.min(hS.helmet, d*red);
      hS.helmet -= ab; d -= ab;
      if(hS.helmet <= 0){ hS.helmetTier = null; if(hS === state.active) log('头盔被击碎！', '#c8302a'); }
    } else if(!head && hS.armor > 0){
      const red = hS.armorTier === 'heavy' ? 0.6 : 0.4;
      const ab = Math.min(hS.armor, d*red);
      hS.armor -= ab; d -= ab;
      if(hS.armor <= 0){ hS.armorTier = null; hS.speedMod = 1; if(hS === state.active) log('防弹衣破碎', '#c8302a'); }
    }
    hS.hp -= d;
    if(hS === state.active) state.active.damageFlash = 0.4;
    if(hS.hp <= 0 && !hS.dead){
      hS.dead = true;
      hS.group.rotation.z = Math.PI/2;
      hS.group.position.y -= 0.2;
      log(hS.def.name + ' 阵亡！', '#c8302a');
      if(hS === state.active){
        const li = state.squad.findIndex(s => !s.dead);
        if(li >= 0) setActive(li);
        else endGame(false);
      }
    }
    return;
  }
  // explode barrel
  if(r.col && r.col.mesh.userData.explosive){
    r.col.mesh.userData.hp -= dmg;
    if(r.col.mesh.userData.hp <= 0){
      explode(r.col.mesh.position.clone(), 8, 100);
      const ci = state.colliders.indexOf(r.col);
      if(ci >= 0) state.colliders.splice(ci, 1);
      if(r.col.mesh.parent) r.col.mesh.parent.remove(r.col.mesh);
    }
  }
}

export function explode(pos, radius, dmg){
  const ex = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff8833, transparent: true, opacity: 1 }));
  ex.position.copy(pos);
  state.scene.add(ex);
  const lt = new THREE.PointLight(0xff8833, 12, 30);
  lt.position.copy(pos);
  state.scene.add(lt);
  let t = 0;
  const grow = () => {
    t += 0.05;
    ex.scale.setScalar(1 + t*radius);
    ex.material.opacity = 1 - t;
    lt.intensity = 12 * (1 - t);
    if(t < 1) requestAnimationFrame(grow);
    else { state.scene.remove(ex); state.scene.remove(lt); }
  };
  grow();

  for(const e of state.enemies){
    if(e.hp <= 0) continue;
    const d = e.pos.distanceTo(pos);
    if(d < radius){
      e.hp -= dmg * (1 - d/radius);
      e.hitFlash = 0.15;
      if(e.hp <= 0){ e.group.rotation.z = Math.PI/2; e.group.position.y -= 0.2; }
    }
  }
  for(const s of state.squad){
    if(s.dead) continue;
    const d = s.pos.distanceTo(pos);
    if(d < radius){
      s.hp -= dmg * 0.5 * (1 - d/radius);
      if(s === state.active) state.active.damageFlash = 0.4;
      if(s.hp <= 0 && !s.dead){
        s.dead = true;
        s.group.rotation.z = Math.PI/2;
        s.group.position.y -= 0.2;
        log(s.def.name + ' 阵亡', '#c8302a');
        if(s === state.active){
          const li = state.squad.findIndex(x => !x.dead);
          if(li >= 0) setActive(li);
          else endGame(false);
        }
      }
    }
  }
  for(const v of state.vehicles){
    const d = v.pos.distanceTo(pos);
    if(d < radius) v.hp -= dmg * (1 - d/radius);
  }
}

export function shootActive(){
  const a = state.active;
  if(!a) return;
  const wn = a.weapons[a.wIdx];
  const w = W[wn], s = a.wState[wn];
  if(a.reloading) return;
  if(s.ammo <= 0){ tryReload(); return; }
  const now = performance.now();
  if(now - a.lastShot < w.fireRate) return;
  a.lastShot = now;
  s.ammo--;
  muzzleFlash();
  const o = new THREE.Vector3(); state.camera.getWorldPosition(o);
  const dir = new THREE.Vector3(); state.camera.getWorldDirection(dir);
  const sp = w.spread * (a.isAiming ? 0.25 : 1);

  if(w.type === 'shotgun'){
    for(let p=0; p<(w.pellets||8); p++){
      const d = dir.clone();
      d.x += (Math.random()-0.5)*sp*4;
      d.y += (Math.random()-0.5)*sp*4;
      d.z += (Math.random()-0.5)*sp*4;
      d.normalize();
      fireRay(o, d, w.dmg, w.range, 'player');
    }
  } else if(w.type === 'rocket'){
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x444, emissive: 0xff6600, emissiveIntensity: 0.6 }));
    m.position.copy(o);
    state.scene.add(m);
    state.rockets.push({ pos: o.clone(), vel: dir.clone().multiplyScalar(60), life: 4, mesh: m, source: 'player', dmg: w.dmg });
  } else {
    const d = dir.clone();
    d.x += (Math.random()-0.5)*sp*2;
    d.y += (Math.random()-0.5)*sp*2;
    d.z += (Math.random()-0.5)*sp*2;
    d.normalize();
    fireRay(o, d, w.dmg, w.range, 'player');
  }
  updateWeaponUI();
}

export function tryReload(){
  const a = state.active;
  if(!a) return;
  const wn = a.weapons[a.wIdx], w = W[wn], s = a.wState[wn];
  if(a.reloading || s.ammo >= w.mag || s.reserve <= 0) return;
  a.reloading = true;
  log('换弹中...');
  setTimeout(() => {
    if(!a.reloading) return;
    const need = w.mag - s.ammo;
    const take = Math.min(need, s.reserve);
    s.ammo += take; s.reserve -= take;
    a.reloading = false;
    updateWeaponUI();
  }, 1800);
}

export function cycleWeapon(){
  const a = state.active;
  if(!a) return;
  a.wIdx = (a.wIdx + 1) % a.weapons.length;
  a.reloading = false;
  rebuildViewmodel();
  log('武器：' + W[a.weapons[a.wIdx]].name);
  updateWeaponUI();
}

export function throwGrenade(){
  const a = state.active;
  if(!a || a.grenades <= 0){ log('没有手雷', '#aa6'); return; }
  a.grenades--;
  const dir = new THREE.Vector3();
  state.camera.getWorldDirection(dir);
  const start = a.pos.clone(); start.y += 1.5;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x223322 }));
  m.position.copy(start);
  m.castShadow = true;
  state.scene.add(m);
  state.grenades.push({
    pos: start.clone(),
    vel: dir.clone().multiplyScalar(22).add(new THREE.Vector3(0, 5, 0)),
    life: 2.5, mesh: m, isC4: false
  });
  updateInvUI();
}

export function useMedkit(){
  const a = state.active;
  if(!a || a.medkits <= 0){ log('没有医疗包', '#aa6'); return; }
  if(a.hp >= a.maxHp){ log('生命已满', '#aa6'); return; }
  a.medkits--;
  a.hp = Math.min(a.maxHp, a.hp + 60);
  log('医疗包 +60', '#3acc6a');
  updateInvUI();
}

export function updateProjectiles(dt){
  for(let i=state.grenades.length - 1; i >= 0; i--){
    const g = state.grenades[i];
    g.life -= dt;
    g.vel.y -= 18*dt;
    g.pos.add(g.vel.clone().multiplyScalar(dt));
    if(g.pos.y < 0.15){
      g.pos.y = 0.15;
      g.vel.y *= -0.4; g.vel.x *= 0.7; g.vel.z *= 0.7;
    }
    g.mesh.position.copy(g.pos);
    if(g.life <= 0){
      explode(g.pos.clone(), g.isC4 ? 12 : 7, g.isC4 ? 200 : 90);
      state.scene.remove(g.mesh);
      state.grenades.splice(i, 1);
    }
  }
  for(let i=state.rockets.length - 1; i >= 0; i--){
    const r = state.rockets[i];
    r.life -= dt;
    r.pos.add(r.vel.clone().multiplyScalar(dt));
    r.mesh.position.copy(r.pos);
    let exp = false;
    for(const c of state.colliders) if(c.box.containsPoint(r.pos)){ exp = true; break; }
    if(!exp){
      for(const e of state.enemies) if(e.hp > 0 && r.pos.distanceTo(e.pos) < 1.5){ exp = true; break; }
    }
    if(r.pos.y < 0.2 || r.life <= 0) exp = true;
    if(exp){
      explode(r.pos.clone(), 11, r.dmg || 220);
      state.scene.remove(r.mesh);
      state.rockets.splice(i, 1);
    }
  }
  for(let i=state.bullets.length - 1; i >= 0; i--){
    const b = state.bullets[i];
    b.life -= dt;
    b.mesh.material.opacity *= 0.85;
    if(b.life <= 0){ state.scene.remove(b.mesh); state.bullets.splice(i, 1); }
  }
}
