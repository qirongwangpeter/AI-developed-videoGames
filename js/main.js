// Entry point: progressive load with progress bar, then game loop.
import * as THREE from 'three';
import { state } from './state.js';
import { initSetup } from './setup.js';
import { buildTextures } from './textures.js';
import { buildWorldGenerator, blocked, updateWorldVisibility } from './world.js';
import { buildSquad, setActive, VM_HIP, VM_AIM, VM_SPRINT } from './squad.js';
import { buildEnemies, updateEnemyActiveStatus, updateEnemies, resetEnemies } from './enemies.js';
import { buildVehicles, updateVehicleControl, resetVehicles } from './vehicles.js';
import { buildPickups, pickupItem, updatePickups } from './pickups.js';
import { shootActive, updateProjectiles } from './combat.js';
import { updateAIMate } from './ai.js';
import { initInput } from './input.js';
import { W } from './weapons.js';
import {
  log, drawMinimap, checkStory, endGame,
  updateSquadUI, updateWeaponUI, updateHpUI, updateInvUI, updateStanceUI, updateObjectiveUI
} from './ui.js';

// ============== INTERACT (export for input.js) ==============
export function interact(){
  const a = state.active;
  if(!a) return;
  if(a.inVehicle){
    const v = a.inVehicle; v.occupied = null; a.inVehicle = null;
    a.pos.set(v.pos.x + Math.cos(v.yaw)*2.5, 0, v.pos.z + Math.sin(v.yaw)*2.5);
    a.group.visible = true;
    state.viewmodel.visible = true;
    document.getElementById('vehicle-hud').style.display = 'none';
    log('离开载具');
    return;
  }
  for(const v of state.vehicles){
    if(v.occupied || v.exploded) continue;
    if(a.pos.distanceTo(v.pos) < 3.5){
      a.inVehicle = v; v.occupied = a;
      a.group.visible = false;
      state.viewmodel.visible = false;
      document.getElementById('vehicle-hud').style.display = 'block';
      log('进入载具');
      return;
    }
  }
  for(let i=state.pickups.length - 1; i >= 0; i--){
    const p = state.pickups[i];
    if(a.pos.distanceTo(p.group.position) < 2.2){
      pickupItem(p);
      state.scene.remove(p.group);
      state.pickups.splice(i, 1);
      return;
    }
  }
}

// ============== PLAYER UPDATE ==============
function updatePlayer(dt){
  const a = state.active;
  if(!a || a.dead) return;
  if(a.inVehicle){ updateVehicleControl(dt, a.inVehicle); return; }

  const k = state.keys;
  const moving = !!(k.KeyW || k.KeyA || k.KeyS || k.KeyD);
  if(a.isSprinting && moving) a.stamina = Math.max(0, a.stamina - dt*30);
  else a.stamina = Math.min(100, a.stamina + dt*22);
  a.isSprinting = !!k.ShiftLeft && a.stamina > 5 && !a.isAiming;
  a.isCrouched = !!k.ControlLeft;

  if(moving){
    let mdx = 0, mdz = 0;
    if(k.KeyW) mdz -= 1;
    if(k.KeyS) mdz += 1;
    if(k.KeyA) mdx -= 1;
    if(k.KeyD) mdx += 1;
    const ml = Math.hypot(mdx, mdz);
    if(ml > 0){ mdx /= ml; mdz /= ml; }
    const cs = Math.cos(a.yaw), sn = Math.sin(a.yaw);
    const mx = mdx*cs + mdz*sn;
    const mz = -mdx*sn + mdz*cs;
    let speed = 6 * (a.speedMod || 1);
    if(a.isSprinting) speed *= 1.7;
    if(a.isAiming) speed *= 0.5;
    if(a.isCrouched) speed *= 0.55;
    if(state.lastStandActive) speed *= 1.25;
    const nx = a.pos.x + mx*speed*dt;
    const nz = a.pos.z + mz*speed*dt;
    if(!blocked(nx, a.pos.z, 0.45)) a.pos.x = nx;
    if(!blocked(a.pos.x, nz, 0.45)) a.pos.z = nz;
  }

  if(!a.onGround){
    a.vy -= 22*dt;
    a.pos.y += a.vy*dt;
    if(a.pos.y <= 0){ a.pos.y = 0; a.vy = 0; a.onGround = true; }
  } else {
    a.pos.y = 0;
  }

  if(a.damageFlash > 0){
    a.damageFlash -= dt;
    document.getElementById('damage-vignette').style.opacity = Math.max(0, a.damageFlash);
  }

  if(state.mouseDown && !a.isSprinting){
    const w = W[a.weapons[a.wIdx]];
    if(w.auto) shootActive();
    else { shootActive(); state.mouseDown = false; }
  }

  const inCombat = state.enemies.some(e => e.hp > 0 && e.state === 'aggro' && e.pos.distanceTo(a.pos) < 35);
  if(!inCombat) a.hp = Math.min(a.maxHp, a.hp + dt*4);

  state.squad.forEach(s => { if(s.cd > 0) s.cd = Math.max(0, s.cd - dt); });

  // viewmodel
  let target = VM_HIP;
  if(a.isAiming) target = VM_AIM;
  else if(a.isSprinting && moving) target = VM_SPRINT;
  state.viewmodel.position.lerp(target, 0.25);
  state.viewmodel.rotation.z += ((a.isSprinting && moving ? -0.35 : 0) - state.viewmodel.rotation.z)*0.2;
  state.viewmodel.rotation.y += ((a.isSprinting && moving ? 0.3 : 0) - state.viewmodel.rotation.y)*0.2;
  if(moving && !a.isAiming){
    const t = performance.now()*0.008*(a.isSprinting ? 1.6 : 1);
    state.viewmodel.position.x += Math.sin(t)*0.012;
    state.viewmodel.position.y += Math.abs(Math.sin(t))*0.008;
  }

  // last stand
  const aliveSquad = state.squad.filter(s => !s.dead);
  const allLow = aliveSquad.length > 0 && aliveSquad.every(s => s.hp/s.maxHp < 0.2);
  if(allLow && !state.lastStandActive){
    state.lastStandActive = true;
    state.lastStandTimer = 60;
    log('★ 绝境反击 ★ 全队伤害 +50%', '#ff5533');
  }
  if(state.lastStandActive){
    state.lastStandTimer -= dt;
    if(state.lastStandTimer <= 0) state.lastStandActive = false;
  }

  a.group.position.copy(a.pos);
  a.group.rotation.y = a.yaw;
}

function updateCamera(){
  const a = state.active;
  if(!a) return;
  const ey = a.isCrouched ? 1.15 : 1.65;
  if(a.inVehicle){
    const v = a.inVehicle;
    const off = new THREE.Vector3(0, 1.65, 0.2);
    off.applyAxisAngle(new THREE.Vector3(0,1,0), v.yaw);
    state.camera.position.copy(v.pos).add(off);
  } else {
    state.camera.position.set(a.pos.x, a.pos.y + ey, a.pos.z);
  }
  state.camera.rotation.order = 'YXZ';
  state.camera.rotation.y = a.yaw;
  state.camera.rotation.x = -a.pitch;
  state.camera.rotation.z = 0;
  let tf = 75;
  if(a.isAiming){
    const w = W[a.weapons[a.wIdx]];
    tf = w.type === 'sniper' ? 22 : 45;
  }
  state.camera.fov += (tf - state.camera.fov)*0.25;
  state.camera.updateProjectionMatrix();
}

// ============== RESTART ==============
function restart(){
  document.getElementById('endscreen').style.display = 'none';
  state.lastStandActive = false;
  state.squad.forEach((s, i) => {
    s.hp = s.maxHp; s.armor = 0; s.armorMax = 0; s.helmet = 0; s.helmetMax = 0;
    s.armorTier = null; s.helmetTier = null; s.speedMod = 1;
    s.dead = false; s.cd = 0; s.grenades = 3; s.medkits = 2; s.wIdx = 0;
    s.pos.set(-6 + i*3, 0, 100);
    s.yaw = 0; s.pitch = 0; s.onGround = true; s.vy = 0; s.stamina = 100;
    s.weapons = [s.def.weapon, s.def.secondary]; s.wState = {};
    for(const wn of s.weapons) s.wState[wn] = { ammo: W[wn].mag, reserve: W[wn].reserveMax };
    s.group.rotation.set(0, 0, 0); s.group.position.copy(s.pos);
    s.group.visible = true; s.inVehicle = null; s.damageFlash = 0;
  });
  resetEnemies();
  resetVehicles();
  state.bullets.forEach(b => state.scene.remove(b.mesh)); state.bullets.length = 0;
  state.grenades.forEach(g => state.scene.remove(g.mesh)); state.grenades.length = 0;
  state.rockets.forEach(r => state.scene.remove(r.mesh)); state.rockets.length = 0;
  setActive(0);
  state.gameTime = 0; state.isPaused = false; state.gameStarted = true;
  state.storyTriggered = { open: false, half: false, end: false };
  state.renderer.domElement.requestPointerLock();
}

// ============== PROGRESSIVE LOAD ==============
async function progressiveLoad(){
  const fill = document.getElementById('loader-fill');
  const text = document.getElementById('loader-text');

  // Setup
  text.textContent = '初始化渲染器...';
  initSetup(); fill.style.width = '5%';
  await frame();

  text.textContent = '生成纹理...';
  buildTextures(); fill.style.width = '12%';
  await frame();

  // World — progressive (yields between batches)
  const gen = buildWorldGenerator();
  const steps = [];
  for(const step of gen) steps.push(step);
  for(let i=0; i<steps.length; i++){
    text.textContent = steps[i].phase + ' ' + (i+1) + '/' + steps.length;
    steps[i].work();
    fill.style.width = (12 + (i+1)/steps.length * 50) + '%';
    if(i % 4 === 0) await frame();
  }

  text.textContent = '生成小队...';
  buildSquad(); fill.style.width = '70%';
  await frame();

  text.textContent = '生成敌人...';
  buildEnemies(); fill.style.width = '82%';
  await frame();

  text.textContent = '布置载具与拾取...';
  buildVehicles();
  buildPickups();
  fill.style.width = '92%';
  await frame();

  text.textContent = '初始化输入...';
  initInput(); fill.style.width = '100%';
  await frame();

  // hide loader, show menu
  document.getElementById('loader').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
}

function frame(){ return new Promise(r => setTimeout(r, 16)); }

// ============== BUTTONS ==============
function bindButtons(){
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    setActive(0);
    state.gameStarted = true;
    state.renderer.domElement.requestPointerLock();
  });
  document.getElementById('restart-btn').addEventListener('click', restart);
}

// ============== MAIN LOOP ==============
function loop(){
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min(0.05, (now - state.lastTime)/1000);
  state.lastTime = now;

  state.frameCount++; state.fpsTimer += dt;
  if(state.fpsTimer >= 1){
    state.fps = state.frameCount;
    state.frameCount = 0; state.fpsTimer = 0;
    const perf = document.getElementById('perf');
    if(perf) perf.textContent = `FPS ${state.fps}`;
  }

  if(state.gameStarted && !state.isPaused && state.active){
    state.gameTime += dt;
    try {
      updateEnemyActiveStatus();
      updateWorldVisibility();
      updatePlayer(dt);
      state.squad.forEach(s => updateAIMate(s, dt));
      updateEnemies(dt);
      updateProjectiles(dt);
      updatePickups();
      updateCamera();
      drawMinimap();
      updateHpUI(); updateWeaponUI(); updateInvUI(); updateStanceUI(); updateObjectiveUI(); updateSquadUI();
      checkStory();
      if(state.enemies.every(e => e.hp <= 0)) endGame(true);
      if(state.squad.every(s => s.dead)) endGame(false);
    } catch(err){ console.error(err); }
  } else if(!state.gameStarted && state.camera){
    const t = now*0.0002;
    state.camera.position.set(Math.cos(t)*20, 12, Math.sin(t)*20);
    state.camera.lookAt(0, 2, 0);
  }

  if(state.renderer && state.scene && state.camera){
    state.renderer.render(state.scene, state.camera);
  }
}

// ============== BOOT ==============
function showError(err){
  const t = document.getElementById('loader-text');
  if(t){ t.textContent = '错误: ' + (err?.message || err); t.style.color = '#c8302a'; }
  console.error(err);
}
addEventListener('error', e => showError(e.error || e.message));
addEventListener('unhandledrejection', e => showError(e.reason));

async function boot(){
  try {
    state.lastTime = performance.now();
    loop();
    await progressiveLoad();
    bindButtons();
  } catch(err){
    showError(err);
  }
}
boot();
