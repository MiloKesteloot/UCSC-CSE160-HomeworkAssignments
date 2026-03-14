import * as THREE from 'three';
import {Controller, setUpScene, updateProps} from "./helpers.js";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.y = 2;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controller = new Controller(0.05, camera, renderer);

const props = setUpScene(scene);


function draw() {
  requestAnimationFrame(draw);
  controller.update();
  updateProps(props, camera);
  renderer.render(scene, camera);
}

draw();


