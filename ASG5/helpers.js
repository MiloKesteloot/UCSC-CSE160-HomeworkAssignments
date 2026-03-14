import * as THREE from 'three';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export class Controller {
  constructor(walkSpeed, camera, renderer) {
    this.walkSpeed = walkSpeed;

    // Camera look controls
    this.controls = new PointerLockControls(camera, renderer.domElement);
    document.addEventListener("click", () => {this.controls.lock()});

    // Movement code
    this.movementButtons = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'];
    this.pressedKeys = [];
    document.addEventListener("keydown", (event) => {
      if (!this.movementButtons.includes(event.code)) return;
      if (this.pressedKeys.includes(event.code)) return;
      this.pressedKeys.push(event.code);
    });
    document.addEventListener("keyup", (event) => {
      if (!this.movementButtons.includes(event.code)) return;
      const index = this.pressedKeys.indexOf(event.code);
      if (index === -1) return;
      this.pressedKeys.splice(index, 1);
    });
  }

  update() {
    if (this.pressedKeys.includes('ArrowUp') || this.pressedKeys.includes('KeyW')) {
      this.controls.moveForward(this.walkSpeed);
    }
    if (this.pressedKeys.includes('ArrowDown') || this.pressedKeys.includes('KeyS')) {
      this.controls.moveForward(-this.walkSpeed);
    }
    if (this.pressedKeys.includes('ArrowLeft') || this.pressedKeys.includes('KeyA')) {
      this.controls.moveRight(-this.walkSpeed);
    }
    if (this.pressedKeys.includes('ArrowRight') || this.pressedKeys.includes('KeyD')) {
      this.controls.moveRight(this.walkSpeed);
    }
  }
}

let s = null;

export function setUpScene(scene) {
  s = scene;

  {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      './assets/night/right.png',
      './assets/night/left.png',
      './assets/night/top.png',
      './assets/night/bottom.png',
      './assets/night/front.png',
      './assets/night/back.png',
    ]);
    scene.background = texture;
  }

  // Shapes
  const cube = new THREE.BoxGeometry();
  const sphere = new THREE.SphereGeometry();
  const cylinder = new THREE.CylinderGeometry();

// Materials
  const textureLoader = new THREE.TextureLoader();
  const textures = {
    grass: textureLoader.load('./assets/grass.png'),
    sky: textureLoader.load('./assets/sky.png'),
    night: textureLoader.load('./assets/night.png'),
    sun: textureLoader.load('./assets/sun.png'),
    moon: textureLoader.load('./assets/moon.png'),
    baseColor: textureLoader.load('./assets/bench/bench_basecolor.png'),
    aoMap: textureLoader.load('./assets/bench/bench_ao.png'),
    normalMap: textureLoader.load('./assets/bench/bench_normal.png'),
    metalnessMap: textureLoader.load('./assets/bench/bench_metalness.png'),
    roughnessMap: textureLoader.load('./assets/bench/bench_roughness.png'),
  }
  const materials = {
    green: new THREE.MeshStandardMaterial({color: 0x00ff00}),
    red: new THREE.MeshStandardMaterial({color: 0xffffff}),
    brown: new THREE.MeshStandardMaterial({color: 0xff8800}),
    white: new THREE.MeshStandardMaterial({color: 0xccccaa}),
    grass: new THREE.MeshStandardMaterial({map: textures.grass}),
    sky: new THREE.MeshBasicMaterial({map: textures.sky, side: THREE.BackSide, transparent: true, opacity: 0.9}),
    night: new THREE.MeshBasicMaterial({map: textures.night, side: THREE.BackSide}),
    sun: new THREE.SpriteMaterial({map: textures.sun}),
    moon: new THREE.SpriteMaterial({map: textures.moon}),
    bench: new THREE.MeshStandardMaterial({
      map: textures.baseColor,
      aoMap: textures.aoMap,
      normalMap: textures.normalMap,
      metalnessMap: textures.metalnessMap,
      roughnessMap: textures.roughnessMap,
    }),
  }

  const floorRadius = 8;

  // Floor
  addShape(cube, materials.grass, 0, 0, 0, floorRadius*2, 0.01, floorRadius*2);
  // Walls
  addShape(cube, materials.red, 0, 2, floorRadius, floorRadius*2, 4, 1);
  addShape(cube, materials.red, 0, 2, -floorRadius, floorRadius*2, 4, 1);
  addShape(cube, materials.red, floorRadius, 2, 0, 1, 4, floorRadius*2);
  addShape(cube, materials.red, -floorRadius, 2, 0, 1, 4, floorRadius*2);
  // Door
  const doorTop = addShape(cylinder, materials.brown, 0, 2, -floorRadius + 0.5, 1, 0.4, 1);
  doorTop.rotation.x = rot(90);
  addShape(cube, materials.brown, 0, 1, -floorRadius + 0.5, 2, 2, 0.4);
  //Pillars
  const pillarPosition = floorRadius - 2;
  const pillarSections = [
    {height: 0.2, width: 0.7},
    {height: 1.6, width: 0.5},
    {height: 0.2, width: 0.7},
  ]
  let pillarY = 0;
  let pillarHeight = 0;
  for (const pillarSection of pillarSections) {
    pillarHeight = pillarSection.height;
    pillarY += pillarHeight / 2;
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 1) {
        addShape(cylinder, materials.white,
          x * pillarPosition, pillarY, z * pillarPosition,
          pillarSection.width, pillarHeight, pillarSection.width);
      }
    }
    pillarY += pillarHeight / 2;
  }
  const sphereSize = 0.3;
  pillarY += sphereSize;
  const colors = [0xff7777, 0x77ff77, 0x7777ff, 0x77ffff, 0xff77ff, 0xffff77];
  const pointLights = [];
  let i = 0;
  for (let x = -1; x <= 1; x += 2) {
    for (let z = -1; z <= 1; z += 1) {
      addShape(sphere, new THREE.MeshStandardMaterial({color: colors[i%colors.length]}),
        x * pillarPosition, pillarY, z * pillarPosition,
        sphereSize, sphereSize, sphereSize);
      const pointLight = new THREE.PointLight(colors[i%colors.length],
        1, 4);
      pointLight.position.set(x * pillarPosition, pillarY, z * pillarPosition);
      scene.add(pointLight);
      pointLights.push(pointLight);
      i++;
    }
  }

  // Statue
  const loaderMTL = new MTLLoader();
  const statueScale = 0.065;

  loaderMTL.load('./assets/bench/Bench.mtl', (mtl) => {
    mtl.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(mtl);
    objLoader.load('./assets/bench/Bench.obj', (object) => {
      object.scale.set(statueScale, statueScale, statueScale);
      object.position.set(0, -0.13, 6.5);
      object.rotation.set(0, Math.PI, 0);
      scene.add(object);
    });
  });

  // Sky
  const skybox = addShape(cube, materials.sky, 0, 0, 0, 130, 10, 130);
  skybox.material.depthWrite = false;
  skybox.renderOrder = -2;
  // const nightbox = addShape(cube, materials.night, 0, 0, 0, 140, 12, 140);
  // nightbox.material.depthWrite = false;
  // nightbox.renderOrder = -3;

  // Sun
  const lightDirection = [0, 0, -floorRadius*2 + 2];
  const sun = new THREE.Sprite(materials.sun);
  sun.position.set(...lightDirection);
  sun.scale.set(5, 5, 5);
  sun.material.depthTest = true;
  sun.renderOrder = -1;
  scene.add(sun);

  const moon = new THREE.Sprite(materials.moon);
  moon.position.set(...negate(lightDirection));
  moon.scale.set(1.4, 1.4, 1.4);
  moon.material.depthTest = true;
  moon.renderOrder = -1;
  scene.add(moon);

  // Lighting
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(...lightDirection);
  scene.add(directionalLight);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  // Water
  const width = 2;
  const segments = 50;
  const waterGeom = new THREE.PlaneGeometry(
    width,
    width,
    segments,
    segments,
  );
  waterGeom.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x3aa7ff,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    flatShading: true
  });

  const water = new THREE.Mesh(waterGeom, waterMat);
  water.position.z = -4;
  water.position.y = 0.3;
  scene.add(water);

  addShape(cube, materials.white, 0, 0.1, -4, 2, 0.2, 2);
  addShape(cube, materials.white, 1.1, 0.2, -4, 0.2, 0.4, 2);
  addShape(cube, materials.white, -1.1, 0.2, -4, 0.2, 0.4, 2);
  addShape(cube, materials.white, 0, 0.2, -4 + 1.1, 2.4, 0.4, 0.2);
  addShape(cube, materials.white, 0, 0.2, -4 - 1.1, 2.4, 0.4, 0.2);

  return {
    skybox: skybox,
    time: 0,
    sun: sun,
    moon: moon,
    directionalLight: directionalLight,
    sunPosition: lightDirection,
    pointLights: pointLights,
    waterGeom: waterGeom,
  }
}

function negate(l) {
  l = [...l];
  for (let i = 0; i < l.length; i++) {
    l[i] *= -1;
  }
  return l;
}

function rot(deg) {
  return deg * Math.PI / 180;
}

function addShape(geometry, material, x, y, z, sx, sy, sz) {
  const cube = new THREE.Mesh(geometry, material);
  cube.position.x = x;
  cube.position.y = y;
  cube.position.z = z;
  cube.scale.x = sx;
  cube.scale.y = sy;
  cube.scale.z = sz;
  s.add(cube);
  return cube;
}

function rotateVec(vec, angle) {
  const [x, y, z] = vec;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  vec[1] = y * cos - z * sin;
  vec[2] = y * sin + z * cos;

  return vec;
}

export function updateProps(props, camera) {
  props.skybox.position.copy(camera.position);

  const daylightSpeed = 0.002;
  props.time += daylightSpeed;
  rotateVec(props.sunPosition, daylightSpeed);

  const pos = props.waterGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    const time = props.time * 10;

    // The idea for these waves was from me, but some of the specific constants were given by Claude
    const wave1 =
      Math.sin(x * 14 + time * 1.6) * 0.004;

    const wave2 =
      Math.cos(z * 11 + time * 1.2) * 0.003;

    const wave3 =
      Math.sin((x + z) * 8 + time * 0.8) * 0.002;

    const wave4 =
      Math.cos(Math.sqrt(x*x + z*z) * 20 - time * 2.0) * 0.0015;

    const wave = wave1 + wave2 + wave3 + wave4;

    pos.setY(i, wave*4);
  }

  pos.needsUpdate = true;
  props.waterGeom.computeVertexNormals();

  props.directionalLight.position.set(...props.sunPosition);
  props.sun.position.x = camera.position.x + props.sunPosition[0];
  props.sun.position.y = camera.position.y + props.sunPosition[1];
  props.sun.position.z = camera.position.z + props.sunPosition[2];
  props.moon.position.x = camera.position.x - props.sunPosition[0];
  props.moon.position.y = camera.position.y - props.sunPosition[1];
  props.moon.position.z = camera.position.z - props.sunPosition[2];

  const nightColor = 0.99;

  const daylightCycleColors = [
    {t: 0, color: new THREE.Color(0x333333), sun: 0, night: 0},
    {t: 4, color: new THREE.Color(0x333333), sun: 0, night: 0},
    {t: 6, color: new THREE.Color(0xff6633), sun: 0, night: nightColor},
    {t: 8, color: new THREE.Color(0xffffff), sun: 1, night: nightColor},
    {t: 24-8, color: new THREE.Color(0xffffff), sun: 1, night: nightColor},
    {t: 24-6, color: new THREE.Color(0xff6633), sun: 0, night: nightColor},
    {t: 24-4, color: new THREE.Color(0x333333), sun: 0, night: 0},
  ];

  let mappedTime = (props.time/Math.PI/2*24)+6;
  mappedTime %= 24;
  const color = lerpColors(daylightCycleColors, mappedTime);
  props.skybox.material.color.copy(color.color);
  props.directionalLight.intensity = color.sun;
  props.skybox.material.opacity = color.night;

  for (const pointLight of props.pointLights) {
    if (mappedTime > 3.8 && mappedTime < 24-4) {
      pointLight.intensity = 0;
    } else {
      pointLight.intensity = 1;
    }
  }
}

// I got advice from Claude about the logic for this function
function lerpColors(colors, t) {
  for (let i = 0; i < colors.length - 1; i++) {
    const a = colors[i];
    const b = colors[(i + 1)%colors.length];

    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t);

      const color = a.color.clone();
      color.lerp(b.color, f);

      return {color: color, sun: lerp(a.sun, b.sun, f), night: lerp(a.night, b.night, f)};
    }
  }

  return {
    color: colors[colors.length - 1].color.clone(),
    sun: colors[colors.length - 1].sun,
    night: colors[colors.length - 1].night,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
