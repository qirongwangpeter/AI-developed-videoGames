// Keyboard / mouse / pointer-lock handlers.
import { state } from './state.js';
import { setActive } from './squad.js';
import { tryReload, cycleWeapon, throwGrenade, useMedkit } from './combat.js';
import { useSkill } from './ai.js';
import { interact } from './main.js';
import { togglePause } from './ui.js';

export function initInput(){
  addEventListener('keydown', e => {
    state.keys[e.code] = true;
    if(!state.gameStarted) return;
    if(e.code === 'KeyR') tryReload();
    if(e.code === 'KeyF') interact();
    if(e.code === 'Tab'){ e.preventDefault(); cycleWeapon(); }
    if(e.code === 'Digit1') setActive(0);
    if(e.code === 'Digit2') setActive(1);
    if(e.code === 'Digit3') setActive(2);
    if(e.code === 'Digit4') setActive(3);
    if(e.code === 'Digit5') setActive(4);
    if(e.code === 'KeyV') useSkill();
    if(e.code === 'KeyG') throwGrenade();
    if(e.code === 'KeyH') useMedkit();
    if(e.code === 'Escape') togglePause();
    if(e.code === 'Space' && state.active && state.active.onGround && !state.active.inVehicle){
      state.active.vy = 6;
      state.active.onGround = false;
    }
  });
  addEventListener('keyup', e => { state.keys[e.code] = false; });
  addEventListener('mousedown', e => {
    if(!state.gameStarted || state.isPaused) return;
    if(e.button === 0) state.mouseDown = true;
    if(e.button === 2 && state.active) state.active.isAiming = true;
  });
  addEventListener('mouseup', e => {
    if(e.button === 0) state.mouseDown = false;
    if(e.button === 2 && state.active) state.active.isAiming = false;
  });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('wheel', e => { if(state.gameStarted) e.preventDefault(); }, { passive: false });
  addEventListener('beforeunload', e => {
    if(state.gameStarted){ e.preventDefault(); e.returnValue = ''; }
  });
  addEventListener('mousemove', e => {
    if(document.pointerLockElement === state.renderer.domElement && state.active){
      state.active.yaw -= e.movementX * 0.0024;
      state.active.pitch += e.movementY * 0.0021;
      state.active.pitch = Math.max(-1.2, Math.min(1.2, state.active.pitch));
    }
  });
  state.renderer.domElement.addEventListener('click', () => {
    if(state.gameStarted && !state.isPaused) state.renderer.domElement.requestPointerLock();
  });
}
