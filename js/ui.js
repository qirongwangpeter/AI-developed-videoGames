// HUD updates, log, minimap, end screen.
import { state } from './state.js';
import { W } from './weapons.js';

export function log(msg, color = '#ffb347'){
  const el = document.getElementById('log');
  if(!el) return;
  const e = document.createElement('div');
  e.className = 'log-entry';
  e.style.borderLeftColor = color;
  e.textContent = msg;
  el.prepend(e);
  setTimeout(() => e.remove(), 7000);
}

export function hitMarker(big){
  const hm = document.getElementById('hitmark');
  hm.textContent = big ? '★' : '✕';
  hm.style.color = big ? '#ff5' : '#fff';
  hm.style.opacity = 1;
  setTimeout(() => hm.style.opacity = 0, 130);
}

export function updateSquadUI(){
  const sq = document.getElementById('squad');
  if(!sq) return;
  sq.innerHTML = '';
  state.squad.forEach((s, i) => {
    const hpPct = Math.max(0, s.hp/s.maxHp*100);
    const div = document.createElement('div');
    div.className = 'member' + (i === state.activeIdx ? ' active' : '') + (s.dead ? ' dead' : '');
    const c = s.dead ? '#555' : hpPct > 50 ? '#5acc6a' : hpPct > 25 ? '#ffb347' : '#c8302a';
    div.innerHTML = `<div class="icon" style="background:${s.def.color}">${s.def.icon}</div>
      <div class="info"><div style="font-weight:bold">${i+1}. ${s.def.name}${s.dead ? ' [阵亡]' : ''}</div>
      <div class="hpb"><div class="hpf" style="width:${hpPct}%;background:${c}"></div></div>
      <div class="skill">${s.def.skill}</div></div>
      <div class="cd">${s.dead ? '—' : (s.cd > 0 ? Math.ceil(s.cd) + 's' : '就绪')}</div>`;
    sq.appendChild(div);
  });
}

export function updateWeaponUI(){
  const a = state.active;
  if(!a) return;
  const wn = a.weapons[a.wIdx], w = W[wn], s = a.wState[wn];
  document.getElementById('weapon-name').textContent = w.name;
  document.getElementById('ammo-cur').textContent = a.reloading ? '...' : s.ammo;
  document.getElementById('ammo-res').textContent = s.reserve;
  document.getElementById('weapon-mode').textContent = (a.isAiming ? '机瞄' : '腰射') + ' · ' + (w.auto ? '自动' : '单发');
  const sniperADS = a.isAiming && w.type === 'sniper' && Math.abs(state.camera.fov - 22) < 5;
  document.getElementById('scope').style.display = sniperADS ? 'block' : 'none';
  document.getElementById('crosshair').style.display = (a.isAiming || sniperADS) ? 'none' : 'block';
}

export function updateHpUI(){
  const a = state.active;
  if(!a) return;
  document.getElementById('hp-fill').style.width = Math.max(0, a.hp/a.maxHp*100) + '%';
  document.getElementById('armor-fill').style.width = a.armorMax > 0 ? (a.armor/a.armorMax*100) + '%' : '0%';
}

export function updateInvUI(){
  const a = state.active;
  if(!a) return;
  document.getElementById('iv-helmet').textContent = a.helmet > 0
    ? (a.helmetTier === 'heavy' ? '重' : '轻') + ' ' + Math.ceil(a.helmet) : '无';
  document.getElementById('iv-vest').textContent = a.armor > 0
    ? (a.armorTier === 'heavy' ? '重' : '轻') + ' ' + Math.ceil(a.armor) : '无';
  document.getElementById('iv-grenade').textContent = a.grenades;
  document.getElementById('iv-medkit').textContent = a.medkits;
}

export function updateStanceUI(){
  const a = state.active;
  if(!a) return;
  let s = '站立';
  if(a.inVehicle) s = '驾驶';
  else if(a.isCrouched) s = '蹲伏';
  else if(a.isSprinting) s = '冲刺';
  document.getElementById('stance').textContent = s;
}

export function updateObjectiveUI(){
  const a = state.enemies.filter(e => e.hp > 0).length;
  document.getElementById('obj-text').textContent =
    `清除全部敌人 (${state.enemies.length - a}/${state.enemies.length})`;
}

let mmCtx = null;
export function drawMinimap(){
  if(!mmCtx) mmCtx = document.getElementById('mmap').getContext('2d');
  mmCtx.clearRect(0, 0, 220, 220);
  mmCtx.fillStyle = 'rgba(180,140,90,0.35)';
  mmCtx.fillRect(0, 0, 220, 220);
  const a = state.active;
  if(!a) return;
  const range = 70, scale = 110/range;
  const w2m = (wx, wz) => [(wx-a.pos.x)*scale + 110, (wz-a.pos.z)*scale + 110];

  mmCtx.fillStyle = '#5a4a30';
  for(const c of state.colliders){
    const b = c.box;
    const [x1, y1] = w2m(b.min.x, b.min.z);
    const [x2, y2] = w2m(b.max.x, b.max.z);
    if(x1 > 220 || x2 < 0 || y1 > 220 || y2 < 0) continue;
    mmCtx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2-x1), Math.abs(y2-y1));
  }
  mmCtx.fillStyle = '#ffcc44';
  for(const p of state.pickups){
    const [x, y] = w2m(p.group.position.x, p.group.position.z);
    if(x < 0 || x > 220 || y < 0 || y > 220) continue;
    mmCtx.beginPath(); mmCtx.arc(x, y, 2, 0, Math.PI*2); mmCtx.fill();
  }
  for(const v of state.vehicles){
    const [x, y] = w2m(v.pos.x, v.pos.z);
    if(x < 0 || x > 220 || y < 0 || y > 220) continue;
    mmCtx.fillStyle = v.exploded ? '#444' : v.occupied ? '#5acc8a' : '#88aaff';
    mmCtx.fillRect(x-3, y-2, 6, 4);
  }
  state.squad.forEach((s, i) => {
    if(s.dead) return;
    const [x, y] = w2m(s.pos.x, s.pos.z);
    if(x < 0 || x > 220 || y < 0 || y > 220) return;
    mmCtx.fillStyle = i === state.activeIdx ? '#ffb347' : s.def.color;
    mmCtx.beginPath(); mmCtx.arc(x, y, 4, 0, Math.PI*2); mmCtx.fill();
  });
  for(const e of state.enemies){
    if(e.hp <= 0) continue;
    const [x, y] = w2m(e.pos.x, e.pos.z);
    if(x < 0 || x > 220 || y < 0 || y > 220) continue;
    mmCtx.fillStyle = e.marked > 0 ? '#5acc8a' : (e.state === 'aggro' ? '#ff5533' : '#cc3333');
    mmCtx.beginPath(); mmCtx.arc(x, y, 3, 0, Math.PI*2); mmCtx.fill();
  }
  const px = 110, py = 110;
  mmCtx.fillStyle = '#fff';
  mmCtx.beginPath();
  mmCtx.moveTo(px - Math.sin(a.yaw)*9, py - Math.cos(a.yaw)*9);
  mmCtx.lineTo(px - Math.sin(a.yaw + 2.5)*5, py - Math.cos(a.yaw + 2.5)*5);
  mmCtx.lineTo(px - Math.sin(a.yaw - 2.5)*5, py - Math.cos(a.yaw - 2.5)*5);
  mmCtx.fill();
}

export function endGame(victory){
  state.gameStarted = false;
  document.exitPointerLock?.();
  const es = document.getElementById('endscreen');
  es.style.display = 'flex';
  es.className = victory ? 'win' : 'lose';
  document.getElementById('end-title').textContent = victory ? '任务完成' : '行动失败';
  const k = state.enemies.length - state.enemies.filter(e => e.hp > 0).length;
  const live = state.squad.filter(s => !s.dead).length;
  document.getElementById('end-stats').innerHTML =
    `击杀：${k} / ${state.enemies.length}<br>存活：${live} / ${state.squad.length}<br>用时：${Math.floor(state.gameTime/60)}分${Math.floor(state.gameTime%60)}秒`;
}

export function togglePause(){
  if(!state.gameStarted) return;
  state.isPaused = !state.isPaused;
  if(state.isPaused) document.exitPointerLock?.();
  else state.renderer.domElement.requestPointerLock();
}

export function checkStory(){
  const k = state.enemies.length - state.enemies.filter(e => e.hp > 0).length;
  const t = state.enemies.length;
  const st = state.storyTriggered;
  if(!st.open && state.gameTime > 1){
    st.open = true;
    setTimeout(() => log('普莱斯：暗影小队就位。', '#a87a4a'), 200);
    setTimeout(() => log('幽灵：注意制高点。', '#888'), 2000);
    setTimeout(() => log('肥皂：到处都是炸药桶。', '#7a5a3a'), 4000);
    setTimeout(() => log('王启融：ANW 火力支援上线。', '#cc3a3a'), 6000);
    setTimeout(() => log('王敬之：医疗就绪。', '#3acc6a'), 8000);
  }
  if(!st.half && k >= Math.floor(t/2)){
    st.half = true;
    log('幽灵：他们在调动援军。', '#888');
  }
  if(!st.end && t-k <= 3 && t-k > 0){
    st.end = true;
    log('肥皂：就剩几个尾巴了！', '#7a5a3a');
  }
}
