// Renderer / scene / camera / lights / sky / ground textures.
import * as THREE from 'three';
import { state } from './state.js';

export function initSetup(){
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 400);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.body.appendChild(renderer.domElement);
  scene.add(camera);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // sky
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(380, 24, 12),
    new THREE.ShaderMaterial({
      uniforms: { tc:{value:new THREE.Color(0x4a6a90)}, mc:{value:new THREE.Color(0xd9b888)}, bc:{value:new THREE.Color(0xb89066)} },
      vertexShader: `varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec3 v;uniform vec3 tc,mc,bc;void main(){float h=normalize(v).y;vec3 c;if(h>0.0)c=mix(mc,tc,smoothstep(0.0,0.6,h));else c=mix(mc,bc,smoothstep(0.0,-0.3,h));gl_FragColor=vec4(c,1.0);}`,
      side: THREE.BackSide, depthWrite: false
    })
  ));
  scene.fog = new THREE.Fog(0xd9b888, 80, 280);

  // lights
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.4);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 240;
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x6a4a25, 0.55));
  scene.add(new THREE.AmbientLight(0xb09060, 0.2));

  state.scene = scene;
  state.camera = camera;
  state.renderer = renderer;
}
