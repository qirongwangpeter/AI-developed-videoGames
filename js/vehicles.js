// Drivable Humvees.
import * as THREE from 'three';
import { state } from './state.js';
import { blocked } from './world.js';
import { explode, fireRay } from './combat.js';

function buildHumvee(){
  const g = new THREE.Group();
  const bm = new THREE.MeshStandardMaterial({ color:0x4a4530, roughness:0.85, metalness:0.3 });
  const dk = new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.4, metalness:0.6 });

  const ch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 5), bm);
  ch.position.y = 0.65; ch.castShadow = true; g.add(ch);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 2.4), bm);
  cab.position.set(0, 1.55, -0.4); cab.castShadow = true; g.add(cab);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.8), bm);
  hood.position.set(0, 1.15, 1.5); g.add(hood);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8),
    new THREE.MeshStandardMaterial({ color:0x223344, transparent:true, opacity:0.7, metalness:0.7 }));
  ws.position.set(0, 1.7, 0.7); ws.rotation.x = -0.4; g.add(ws);

  const wheels = [];
  for(const [x, z] of [[-1.1,1.5],[1.1,1.5],[-1.1,-1.5],[1.1,-1.5]]){
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), dk);
    w.rotation.z = Math.PI/2;
    w.position.set(x, 0.55, z);
    w.castShadow = true;
    g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;
  return g;
}

const SPAWNS = [
  [15,80,0], [-15,80,0], [40,30,1]
];

export function buildVehicles(){
  for(const [x, z, rot] of SPAWNS){
    const v = buildHumvee();
    v.position.set(x, 0, z);
    v.rotation.y = rot;
    state.scene.add(v);
    state.vehicles.push({
      group: v, pos: v.position, yaw: rot,
      speed: 0, steering: 0,
      occupied: null,
      maxSpeed: 32, accel: 14, brake: 18,
      hp: 300, exploded: false,
      lastShot: 0,
    });
  }
}

export function updateVehicleControl(dt, v){
  if(v.exploded) return;
  const k = state.keys;
  if(k.KeyW) v.speed += v.accel * dt;
  if(k.KeyS) v.speed -= v.brake * dt;
  v.speed *= (1 - 0.5 * dt);
  v.speed = Math.max(-v.maxSpeed*0.5, Math.min(v.maxSpeed, v.speed));
  let si = 0;
  if(k.KeyA) si -= 1;
  if(k.KeyD) si += 1;
  v.steering += (si - v.steering) * 0.2;
  v.yaw += v.steering * dt * (Math.abs(v.speed)/v.maxSpeed) * 1.8;

  const fx = -Math.sin(v.yaw) * v.speed * dt;
  const fz = -Math.cos(v.yaw) * v.speed * dt;
  if(!blocked(v.pos.x + fx, v.pos.z, 1.2)) v.pos.x += fx;
  else v.speed *= -0.3;
  if(!blocked(v.pos.x, v.pos.z + fz, 1.2)) v.pos.z += fz;
  else v.speed *= -0.3;

  v.group.position.copy(v.pos);
  v.group.rotation.y = v.yaw;
  if(v.group.userData.wheels){
    for(const w of v.group.userData.wheels) w.rotation.x += v.speed * dt * 1.5;
  }

  const a = state.active;
  if(a && a.inVehicle === v){ a.pos.copy(v.pos); a.yaw = v.yaw; }
  document.getElementById('veh-speed').textContent = Math.abs(v.speed * 3.6).toFixed(0);

  if(v.hp <= 0 && !v.exploded){
    v.exploded = true;
    explode(v.pos.clone(), 10, 180);
    if(a && a.inVehicle === v){
      a.inVehicle = null;
      a.group.visible = true;
      state.viewmodel.visible = true;
      document.getElementById('vehicle-hud').style.display = 'none';
    }
    v.occupied = null;
  }

  // turret fire
  if(state.mouseDown){
    const now = performance.now();
    if(now - v.lastShot > 100){
      v.lastShot = now;
      const start = v.pos.clone(); start.y += 2.4;
      const dir = new THREE.Vector3();
      state.camera.getWorldDirection(dir);
      const sp = 0.025;
      dir.x += (Math.random()-0.5)*sp;
      dir.y += (Math.random()-0.5)*sp;
      dir.z += (Math.random()-0.5)*sp;
      dir.normalize();
      fireRay(start, dir, 22, 100, 'player');
    }
  }
}

export function resetVehicles(){
  for(const v of state.vehicles){
    v.occupied = null; v.speed = 0; v.hp = 300; v.exploded = false;
  }
}
