// Shared mutable game state. Imported by all modules.
import * as THREE from 'three';

export const state = {
  // Three.js core
  scene: null,
  camera: null,
  renderer: null,

  // textures (built once)
  tex: {},

  // entities
  squad: [],          // 5 squad members
  enemies: [],        // all enemies (some inactive far away)
  vehicles: [],
  pickups: [],
  bullets: [],        // tracer lines (visual)
  grenades: [],
  rockets: [],
  colliders: [],      // {box, mesh}

  // active control
  activeIdx: 0,
  active: null,
  viewmodel: null,
  vmGun: null,
  vmGunWn: null,

  // input
  keys: {},
  mouseDown: false,

  // game state
  gameStarted: false,
  isPaused: false,
  gameTime: 0,
  lastTime: 0,
  storyTriggered: { open:false, half:false, end:false },

  // last stand
  lastStandActive: false,
  lastStandTimer: 0,

  // perf
  fps: 0,
  frameCount: 0,
  fpsTimer: 0,

  // distance-based culling thresholds
  ENEMY_ACTIVE_RANGE: 110,
  PROP_VISIBLE_RANGE: 180,

  // map size
  MAP: 250,
};

// shared resources / shorthand vector pools for less GC pressure
export const tmpV1 = new THREE.Vector3();
export const tmpV2 = new THREE.Vector3();
export const tmpV3 = new THREE.Vector3();
