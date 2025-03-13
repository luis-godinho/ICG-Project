
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';

// ----- THREE.JS SETUP -----
let scene, camera, renderer, controls;
scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa);

camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add basic lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

// ----- POINTER LOCK CONTROLS -----
controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

const instructions = document.getElementById("instructions");
instructions.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  instructions.style.display = "none";
});
controls.addEventListener("unlock", () => {
  instructions.style.display = "";
});

// ----- CANNON-ES PHYSICS SETUP -----
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});

// Create a static floor in physics
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0,
  shape: floorShape,
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// Visual floor (Three.js)
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// Create a player body (a sphere) in Cannon-es
const playerRadius = 1;
const sphereShape = new CANNON.Sphere(playerRadius);
const playerBody = new CANNON.Body({
  mass: 80,
  shape: sphereShape,
  position: new CANNON.Vec3(0, 5, 0),
  fixedRotation: true,
});
playerBody.linearDamping = 0.9;
world.addBody(playerBody);

// Optional: create a visible mesh for the player
const playerGeometry = new THREE.SphereGeometry(playerRadius, 32, 32);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(playerMesh);

// ----- INPUT HANDLING -----
const keysPressed = {};
document.addEventListener("keydown", (e) => {
  keysPressed[e.code] = true;
});
document.addEventListener("keyup", (e) => {
  keysPressed[e.code] = false;
});

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----- ANIMATION LOOP -----
const timeStep = 1 / 60;
function animate() {
  requestAnimationFrame(animate);

  // Calculate movement relative to camera's direction.
  const moveSpeed = 5;
  const forward = new THREE.Vector3();
  controls.getDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(camera.up, forward).normalize();

  const moveDirection = new THREE.Vector3();
  if (keysPressed["KeyW"]) moveDirection.add(forward);
  if (keysPressed["KeyS"]) moveDirection.sub(forward);
  if (keysPressed["KeyA"]) moveDirection.sub(right);
  if (keysPressed["KeyD"]) moveDirection.add(right);
  moveDirection.normalize();

  // Update the player body's horizontal velocity.
  playerBody.velocity.x = moveDirection.x * moveSpeed;
  playerBody.velocity.z = moveDirection.z * moveSpeed;

  // Step the physics world.
  world.step(timeStep);

  // Sync the camera (via PointerLockControls) and the player mesh with the physics body.
  controls.getObject().position.copy(playerBody.position);
  playerMesh.position.copy(playerBody.position);

  renderer.render(scene, camera);
}
animate();

