// Squad creation, active control switching, viewmodel.
import * as THREE from 'three';
import { state } from './state.js';
import { buildCharacter } from './character.js';
import { W, viewmodelGun, SQUAD_DEF } from './weapons.js';
import { log, updateSquadUI } from './ui.js';

export const VM_HIP = new THREE.Vector3(0.18, -0.18, -0.32);
export const VM_AIM = new THREE.Vector3(0, -0.07, -0.22);
export const VM_SPRINT = new THREE.Vector3(0.22, -0.22, -0.28);

export function buildSquad(){
  state.viewmodel = new THREE.Group();
  state.camera.add(state.viewmodel);
  state.viewmodel.position.copy(VM_HIP);

  SQUAD_DEF.forEach((d, i) => {
    const ch = buildCharacter({ ...d.opts, enemy: false });
    const sx = -6 + i*3;
    ch.position.set(sx, 0, 100);
    state.scene.add(ch);
    const sm = {
      def: d, group: ch,
      pos: ch.position,
      yaw: 0, pitch: 0,
      hp: 100, maxHp: 100,
      armor: 0, armorMax: 0, armorTier: null,
      helmet: 0, helmetMax: 0, helmetTier: null,
      vy: 0, onGround: true, stamina: 100, speedMod: 1,
      isAiming: false, isSprinting: false, isCrouched: false,
      weapons: [d.weapon, d.secondary], wIdx: 0,
      wState: {},
      lastShot: 0, reloading: false,
      grenades: 3, medkits: 2, cd: 0,
      dead: false,
      aiTimer: 0, aiOffset: new THREE.Vector3((i-2)*2, 0, 3),
      aiLastShot: 0, aiHealCd: 0,
      inVehicle: null, damageFlash: 0,
    };
    for(const wn of sm.weapons){
      sm.wState[wn] = { ammo: W[wn].mag, reserve: W[wn].reserveMax };
    }
    state.squad.push(sm);
  });
}

export function rebuildViewmodel(){
  if(!state.active) return;
  const wn = state.active.weapons[state.active.wIdx];
  if(state.vmGunWn === wn) return;
  if(state.vmGun) state.viewmodel.remove(state.vmGun);
  state.vmGun = viewmodelGun(wn);
  state.vmGunWn = wn;
  state.viewmodel.add(state.vmGun);
}

export function setActive(i){
  if(i < 0 || i >= state.squad.length || state.squad[i].dead) return;
  state.activeIdx = i;
  state.active = state.squad[i];
  state.squad.forEach((s, j) => { s.group.visible = (j !== i || !!s.inVehicle); });
  rebuildViewmodel();
  state.viewmodel.visible = !state.active.inVehicle;
  updateSquadUI();
  log('切换：' + state.active.def.name, state.active.def.color);
}

export function muzzleFlash(){
  if(!state.vmGun) return;
  const mf = state.vmGun.userData.muzzle;
  const ml = state.vmGun.userData.muzzleLight;
  mf.material.opacity = 1;
  ml.intensity = 4;
  setTimeout(() => { mf.material.opacity = 0; ml.intensity = 0; }, 60);
}
