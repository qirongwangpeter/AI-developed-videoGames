// Pickup spawning + interaction.
import * as THREE from 'three';
import { state } from './state.js';
import { W, viewmodelGun } from './weapons.js';
import { rebuildViewmodel } from './squad.js';
import { log, updateInvUI, updateWeaponUI } from './ui.js';

function makePickup(x, z, type, subtype){
  const grp = new THREE.Group();
  let mesh;
  if(type === 'helmet'){
    const heavy = subtype === 'heavy';
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8, 0, Math.PI*2, 0, Math.PI*0.55),
      new THREE.MeshStandardMaterial({ color: heavy ? 0x1a2030 : 0x3a4540,
        emissive: heavy ? 0x4477aa : 0x224477, emissiveIntensity: 0.25 }));
  } else if(type === 'vest'){
    const heavy = subtype === 'heavy';
    mesh = new THREE.Mesh(new THREE.BoxGeometry(heavy?0.7:0.6, heavy?0.6:0.5, heavy?0.2:0.15),
      new THREE.MeshStandardMaterial({ color: heavy ? 0x2a2a2a : 0x556a4a,
        emissive: heavy ? 0x556677 : 0x335533, emissiveIntensity: 0.2 }));
  } else if(type === 'medkit'){
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0xaa0000, emissiveIntensity: 0.4 }));
  } else if(type === 'ammo'){
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x4a5a3a, emissive: 0xffaa44, emissiveIntensity: 0.25 }));
  } else { // weapon
    mesh = viewmodelGun(subtype);
    mesh.scale.setScalar(2);
    mesh.rotation.z = -Math.PI/2;
  }
  if(mesh){ mesh.castShadow = true; grp.add(mesh); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 12),
    new THREE.MeshBasicMaterial({ color:0xffcc44, transparent:true, opacity:0.5, side:THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2;
  ring.position.y = -0.3;
  grp.add(ring);
  grp.position.set(x, 0.7, z);
  state.scene.add(grp);
  state.pickups.push({ group: grp, type, subtype });
}

export function buildPickups(){
  makePickup(10, 15, 'helmet', 'light');
  makePickup(-10, 15, 'vest', 'light');
  makePickup(25, 30, 'helmet', 'heavy');
  makePickup(-25, 30, 'vest', 'heavy');
  makePickup(45, -25, 'helmet', 'heavy');
  makePickup(-45, -25, 'vest', 'heavy');
  makePickup(0, 30, 'medkit');
  makePickup(0, -30, 'medkit');
  makePickup(60, 0, 'medkit');
  makePickup(-60, 0, 'medkit');
  makePickup(20, 0, 'ammo');
  makePickup(-20, 0, 'ammo');
  // weapons
  makePickup(35, 40, 'weapon', 'SCAR');
  makePickup(-35, -40, 'weapon', 'BARRETT');
  makePickup(50, -30, 'weapon', 'RPG');
  makePickup(-50, 30, 'weapon', 'HK416');
  makePickup(0, 60, 'weapon', 'P90');
  makePickup(0, -60, 'weapon', 'M249');
  makePickup(70, 0, 'weapon', 'DEAGLE');
  makePickup(-70, 0, 'weapon', 'M870');
}

export function pickupItem(p){
  const a = state.active;
  if(!a) return;
  if(p.type === 'helmet'){
    const heavy = p.subtype === 'heavy';
    a.helmet = a.helmetMax = heavy ? 75 : 50;
    a.helmetTier = heavy ? 'heavy' : 'light';
    log(heavy ? '重型头盔 (+75)' : '轻型头盔 (+50)', '#5a8acc');
  } else if(p.type === 'vest'){
    const heavy = p.subtype === 'heavy';
    a.armor = a.armorMax = heavy ? 100 : 80;
    a.armorTier = heavy ? 'heavy' : 'light';
    a.speedMod = heavy ? 0.9 : 1;
    log(heavy ? '重型防弹衣 (-10% 速度)' : '轻型防弹衣', '#5a8acc');
  } else if(p.type === 'medkit'){
    a.medkits = Math.min(5, a.medkits + 1);
    log('+ 医疗包', '#3acc6a');
  } else if(p.type === 'ammo'){
    for(const wn of a.weapons){
      const w = W[wn], s = a.wState[wn];
      s.reserve = Math.min(w.reserveMax, s.reserve + w.mag*2);
    }
    a.grenades = Math.min(5, a.grenades + 1);
    log('+ 弹药', '#ffb347');
  } else if(p.type === 'weapon'){
    a.weapons[1] = p.subtype;
    a.wState[p.subtype] = { ammo: W[p.subtype].mag, reserve: W[p.subtype].reserveMax };
    a.wIdx = 1;
    rebuildViewmodel();
    log('+ ' + W[p.subtype].name, '#ffb347');
  }
  updateInvUI();
  updateWeaponUI();
}

export function updatePickups(){
  let prompt = '';
  const a = state.active;
  for(const p of state.pickups){
    p.group.rotation.y += 0.02;
    p.group.position.y = 0.7 + Math.sin(performance.now() * 0.003) * 0.1;
    if(a && !prompt){
      const d = Math.hypot(p.group.position.x - a.pos.x, p.group.position.z - a.pos.z);
      if(d < 2.2){
        const lbl = p.type==='helmet' ? (p.subtype==='heavy'?'重型头盔':'轻型头盔')
          : p.type==='vest' ? (p.subtype==='heavy'?'重型防弹衣':'轻型防弹衣')
          : p.type==='medkit' ? '医疗包'
          : p.type==='ammo' ? '弹药'
          : (W[p.subtype]?.name || '武器');
        prompt = `[F] 拾取 ${lbl}`;
      }
    }
  }
  if(a && !a.inVehicle){
    for(const v of state.vehicles){
      if(v.occupied || v.exploded) continue;
      const d = Math.hypot(v.pos.x - a.pos.x, v.pos.z - a.pos.z);
      if(d < 3.5 && !prompt){ prompt = '[F] 进入悍马'; break; }
    }
  }
  document.getElementById('prompt').textContent = prompt;
  document.getElementById('prompt').style.display = prompt ? 'block' : 'none';
}
