// Enemy spawning + per-frame AI.
// All enemies built at startup; each frame we toggle .visible based on distance
// to active player and only run AI for those within ENEMY_ACTIVE_RANGE.
import * as THREE from 'three';
import { state } from './state.js';
import { buildCharacter } from './character.js';
import { blocked } from './world.js';
import { fireRay } from './combat.js';

const PLACEMENTS = [
  [60,40,'rifle'], [70,50,'rifle'], [80,30,'smg'], [55,55,'shotgun'], [85,50,'sniper'],
  [-60,-50,'rifle'], [-70,-40,'smg'], [-50,-60,'rifle'], [-65,-55,'shotgun'], [-80,-50,'sniper'], [-55,-70,'heavy'],
  [-60,55,'rifle'], [-70,65,'smg'], [-50,70,'rifle'], [-75,55,'shotgun'],
  [55,-55,'heavy'], [70,-65,'rifle'], [40,-70,'rifle'], [60,-75,'sniper'], [75,-50,'rifle'],
  [0,0,'heavy'], [10,5,'rifle'], [-10,-5,'rifle'], [5,-10,'smg'],
  [30,30,'rifle'], [-30,-30,'rifle']
];

function spawnEnemy(x, z, type){
  let opts = { body:0x4a2a2a, vest:0x3a1a1a, helmet:0x1a1a1a, skin:0x8a6050, enemy:true };
  let weapon='AK47', hp=100, range=45, fireRate=550, acc=0.65, dmg=10, armor=0, helmetA=0, speed=3;
  if(type==='smg'){      weapon='MP5'; hp=80;  range=32; fireRate=300; acc=0.55; dmg=7; }
  else if(type==='sniper'){ weapon='AWM'; hp=70; range=110; fireRate=2200; acc=0.85; dmg=45; helmetA=50; opts.helmet=0x2a3a4a; speed=2; }
  else if(type==='shotgun'){ weapon='M870'; hp=140; range=18; fireRate=900; acc=0.55; dmg=20; armor=40; opts.body=0x5a3a3a; }
  else if(type==='heavy'){ weapon='M249'; hp=200; range=50; fireRate=170; acc=0.5; dmg=9; armor=100; helmetA=60; opts.helmet=0x111; opts.vest=0x333; speed=1.6; }

  const ch = buildCharacter(opts);
  ch.position.set(x, 0, z);
  state.scene.add(ch);
  state.enemies.push({
    group: ch, type, weapon,
    pos: ch.position,
    yaw: Math.random() * Math.PI * 2,
    hp, maxHp: hp, range, fireRate, accuracy: acc, dmg, speed,
    armor, armorMax: armor, helmetArmor: helmetA, helmetArmorMax: helmetA,
    state: 'idle', target: null,
    lastShot: 0, hitFlash: 0, marked: 0,
    detectRange: type === 'sniper' ? 100 : 45,
    raged: false, active: false,
    placement: [x, z, type], // for restart
  });
}

export function buildEnemies(){
  for(const p of PLACEMENTS) spawnEnemy(...p);
  // initially hidden — they activate when near
  for(const e of state.enemies) e.group.visible = false;
}

// Per-frame: only enemies within active range update + render
export function updateEnemyActiveStatus(){
  if(!state.active) return;
  const px = state.active.pos.x, pz = state.active.pos.z;
  const R = state.ENEMY_ACTIVE_RANGE;
  for(let i=0; i<state.enemies.length; i++){
    const e = state.enemies[i];
    if(e.hp <= 0){ e.group.visible = false; e.active = false; continue; }
    const d = Math.hypot(e.pos.x - px, e.pos.z - pz);
    e.active = d < R;
    e.group.visible = e.active;
  }
}

export function updateEnemies(dt){
  const active = state.active;
  if(!active) return;
  const now = performance.now();
  for(let i=0; i<state.enemies.length; i++){
    const e = state.enemies[i];
    if(e.hp <= 0 || !e.active) continue;
    if(e.hitFlash > 0) e.hitFlash -= dt;
    if(e.marked > 0) e.marked -= dt;

    // detect: pick closest non-dead squad member in range
    let bestF = null, bestD = Infinity;
    for(let j=0; j<state.squad.length; j++){
      const s = state.squad[j];
      if(s.dead) continue;
      const d = Math.hypot(s.pos.x - e.pos.x, s.pos.z - e.pos.z);
      if(d > e.detectRange) continue;
      if(d < bestD){ bestD = d; bestF = s; }
    }
    if(bestF){ e.state = 'aggro'; e.target = bestF; }

    if(e.state === 'aggro' && e.target){
      const dx = e.target.pos.x - e.pos.x, dz = e.target.pos.z - e.pos.z;
      const ty = Math.atan2(dx, dz);
      e.yaw += (ty - e.yaw) * 0.1;

      const idealMin = e.type==='sniper' ? 50 : e.type==='shotgun' ? 4 : 12;
      const idealMax = e.type==='sniper' ? 100 : e.type==='shotgun' ? 8 : 30;
      let mv = 0;
      if(bestD > idealMax) mv = 1;
      else if(bestD < idealMin) mv = -1;
      if(mv !== 0){
        const sx = Math.sin(e.yaw) * mv * e.speed * dt;
        const sz = Math.cos(e.yaw) * mv * e.speed * dt;
        if(!blocked(e.pos.x + sx, e.pos.z, 0.45)) e.pos.x += sx;
        if(!blocked(e.pos.x, e.pos.z + sz, 0.45)) e.pos.z += sz;
      }

      if(now - e.lastShot > e.fireRate && bestF){
        e.lastShot = now;
        const start = e.pos.clone(); start.y += 1.4;
        const aim = bestF.pos.clone(); aim.y += 1.4;
        aim.x += (Math.random() - 0.5) * (1 - e.accuracy) * 4;
        aim.z += (Math.random() - 0.5) * (1 - e.accuracy) * 4;
        if(e.type === 'shotgun'){
          for(let p=0; p<6; p++){
            const dir = aim.clone().sub(start);
            dir.x += (Math.random() - 0.5) * 1.2;
            dir.y += (Math.random() - 0.5) * 0.4;
            dir.z += (Math.random() - 0.5) * 1.2;
            dir.normalize();
            fireRay(start, dir, e.dmg, e.range, 'enemy');
          }
        } else {
          const dir = aim.sub(start).normalize();
          fireRay(start, dir, e.dmg, e.range, 'enemy');
        }
      }
    }
    e.group.position.copy(e.pos);
    e.group.rotation.y = e.yaw;
  }
}

export function resetEnemies(){
  state.enemies.forEach(e => {
    const [x, z] = e.placement;
    e.hp = e.maxHp; e.state = 'idle'; e.target = null;
    e.hitFlash = 0; e.marked = 0;
    e.armor = e.armorMax; e.helmetArmor = e.helmetArmorMax;
    e.raged = false;
    e.pos.set(x, 0, z);
    e.group.position.copy(e.pos);
    e.group.rotation.set(0, e.yaw, 0);
  });
}
