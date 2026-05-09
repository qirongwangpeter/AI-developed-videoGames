// AI for non-controlled squad members. Skills.
import * as THREE from 'three';
import { state } from './state.js';
import { blocked } from './world.js';
import { fireRay, explode } from './combat.js';
import { log, updateSquadUI } from './ui.js';

export function updateAIMate(sm, dt){
  if(sm.dead || sm === state.active || sm.inVehicle) return;
  if(sm.aiHealCd > 0) sm.aiHealCd -= dt;
  if(sm.def.id === 'wangjz' && sm.aiHealCd <= 0){
    for(const ally of state.squad){
      if(ally === sm || ally.dead) continue;
      if(ally.hp < ally.maxHp*0.4 && ally.pos.distanceTo(sm.pos) < 6){
        ally.hp = Math.min(ally.maxHp, ally.hp + 40);
        sm.aiHealCd = 6;
        log(`王敬之治疗 ${ally.def.name}`, '#3acc6a');
        break;
      }
    }
  }
  const role = sm.def.id;
  const myRange = role==='ghost' ? 100 : role==='wangqr' ? 55 : role==='soap' ? 40 : 50;
  const myFR    = role==='ghost' ? 1100: role==='wangqr' ? 130: role==='soap' ? 280: 350;
  const myAcc   = role==='ghost' ? 0.95: role==='wangqr' ? 0.65: 0.8;
  const myDmg   = role==='ghost' ? 75  : role==='wangqr' ? 13 : role==='soap' ? 24 : 22;

  let bestE = null, bestS = Infinity;
  for(const e of state.enemies){
    if(e.hp <= 0 || !e.active) continue;
    const d = e.pos.distanceTo(sm.pos);
    if(d > myRange) continue;
    const score = d - (e.marked ? 15 : 0);
    if(score < bestS){ bestS = score; bestE = e; }
  }

  sm.aiTimer -= dt;
  if(sm.aiTimer <= 0){
    sm.aiTimer = 3 + Math.random()*4;
    const a = Math.random() * Math.PI*2;
    const dist = 3 + Math.random()*5;
    sm.aiOffset.set(Math.cos(a)*dist, 0, Math.sin(a)*dist);
  }
  const target = state.active.pos.clone().add(sm.aiOffset);
  const dx = target.x - sm.pos.x, dz = target.z - sm.pos.z;
  const d = Math.hypot(dx, dz);
  const dToActive = sm.pos.distanceTo(state.active.pos);
  let speed = 4;
  if(dToActive > 18) speed = 8;
  if(bestE && dToActive < 12) speed = 2.2;
  if(d > 0.8){
    const sx = dx/d * speed * dt;
    const sz = dz/d * speed * dt;
    if(!blocked(sm.pos.x + sx, sm.pos.z, 0.45)) sm.pos.x += sx;
    if(!blocked(sm.pos.x, sm.pos.z + sz, 0.45)) sm.pos.z += sz;
  }
  let fx, fz;
  if(bestE){ fx = bestE.pos.x - sm.pos.x; fz = bestE.pos.z - sm.pos.z; }
  else { fx = dx; fz = dz; }
  const ty = Math.atan2(fx, fz);
  let dy = ty - sm.yaw;
  while(dy > Math.PI) dy -= Math.PI*2;
  while(dy < -Math.PI) dy += Math.PI*2;
  sm.yaw += dy*0.18;

  if(bestE){
    const now = performance.now();
    if(now - sm.aiLastShot > myFR){
      sm.aiLastShot = now;
      const start = sm.pos.clone(); start.y += 1.5;
      const aim = bestE.pos.clone(); aim.y += 1.4;
      aim.x += (Math.random()-0.5) * (1-myAcc) * 5;
      aim.z += (Math.random()-0.5) * (1-myAcc) * 5;
      const dir = aim.sub(start).normalize();
      fireRay(start, dir, myDmg * (state.lastStandActive ? 1.5 : 1), myRange, 'aimate');
    }
  }
  sm.group.position.copy(sm.pos);
  sm.group.rotation.y = sm.yaw;
}

function spawnSmoke(p){
  for(let i=0; i<15; i++){
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.7+Math.random()*0.4, 6, 4),
      new THREE.MeshBasicMaterial({ color:0xaaaaaa, transparent:true, opacity:0.7 }));
    s.position.copy(p);
    s.position.x += (Math.random()-0.5)*5;
    s.position.z += (Math.random()-0.5)*5;
    s.position.y = 0.5 + Math.random()*1.8;
    state.scene.add(s);
    let life = 5;
    const tick = () => {
      life -= 0.08;
      s.position.y += 0.03;
      s.scale.multiplyScalar(1.012);
      s.material.opacity *= 0.99;
      if(life > 0) requestAnimationFrame(tick);
      else state.scene.remove(s);
    };
    tick();
  }
}

export function useSkill(){
  const a = state.active;
  if(!a) return;
  const d = a.def;
  if(a.cd > 0){ log('冷却中', '#aa6'); return; }
  a.cd = d.cdMax;
  if(d.id === 'price'){
    spawnSmoke(a.pos.clone());
    state.squad.forEach(s => { if(!s.dead) s.armor = Math.max(s.armor, 50); });
    a.hp = Math.min(a.maxHp, a.hp + 30);
    log('普莱斯：战术烟雾', d.color);
  } else if(d.id === 'ghost'){
    state.enemies.forEach(e => { if(e.hp > 0) e.marked = 12; });
    const sorted = state.enemies.filter(e => e.hp > 0).sort((x,y) => x.hp - y.hp);
    let k = 0;
    for(let i=0; i<Math.min(3, sorted.length); i++){
      sorted[i].hp -= 70;
      sorted[i].hitFlash = 0.15;
      if(sorted[i].hp <= 0){
        sorted[i].group.rotation.z = Math.PI/2;
        sorted[i].group.position.y -= 0.2;
        k++;
      }
    }
    log(`幽灵：协助射击 (${k} 击杀)`, d.color);
  } else if(d.id === 'soap'){
    const dir = new THREE.Vector3();
    state.camera.getWorldDirection(dir);
    const s = a.pos.clone(); s.y += 1.4;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.15),
      new THREE.MeshStandardMaterial({ color:0xaa3333, emissive:0xaa3333, emissiveIntensity:0.4 }));
    m.position.copy(s);
    state.scene.add(m);
    state.grenades.push({
      pos: s.clone(),
      vel: dir.clone().multiplyScalar(18).add(new THREE.Vector3(0, 5, 0)),
      life: 1.2, mesh: m, isC4: true
    });
    log('肥皂：投掷 C4', d.color);
  } else if(d.id === 'wangqr'){
    const dir = new THREE.Vector3();
    state.camera.getWorldDirection(dir);
    for(const e of state.enemies){
      if(e.hp <= 0) continue;
      const t = e.pos.clone().sub(a.pos);
      const dist = t.length();
      if(dist > 55) continue;
      t.normalize();
      if(t.dot(dir) > 0.83){
        e.hp -= 60; e.hitFlash = 0.15;
        if(e.hp <= 0){ e.group.rotation.z = Math.PI/2; e.group.position.y -= 0.2; }
      }
    }
    log('王启融：重机枪压制', d.color);
  } else if(d.id === 'wangjz'){
    let r = 0;
    state.squad.forEach(s => {
      if(s.dead){
        s.dead = false;
        s.hp = s.maxHp*0.5;
        s.group.rotation.set(0, 0, 0);
        s.group.position.y = 0;
        s.pos.copy(a.pos).add(new THREE.Vector3((Math.random()-0.5)*4, 0, (Math.random()-0.5)*4));
        r++;
      } else {
        s.hp = Math.min(s.maxHp, s.hp + 60);
      }
    });
    log(`王敬之：群体回血+复活${r ? ` (${r})` : ''}`, d.color);
  }
  updateSquadUI();
}
