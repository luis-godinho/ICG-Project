
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';

// ----- THREE.JS SETUP -----
let scene, camera, renderer, controls;
scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa);

camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

// ----- POINTER LOCK CONTROLS -----

let locked = true;

let sensitivity = 3
controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = sensitivity
scene.add(controls.getObject());


document.getElementById("instructions").addEventListener("click", () => controls.lock());

controls.addEventListener("lock", () => {
  document.getElementById("gameStart").style.display = "none";
  locked = false;

});
controls.addEventListener("unlock", () => {
  document.getElementById("gameStart").style.display = "";
  locked = true;
});

document.getElementById("slider").addEventListener("input", () => {
  document.getElementById("sliderValue").textContent = parseFloat(document.getElementById("slider").value).toFixed(1);
  sensitivity = parseFloat(document.getElementById("slider").value).toFixed(1);
  controls.pointerSpeed = sensitivity
});

// ----- CANNON-ES PHYSICS -----
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

function createPlatform(size, position) {
  const platformShape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, 0.5, size[1] / 2));
  const platformBody = new CANNON.Body({ mass: 0, shape: platformShape, position: new CANNON.Vec3(...position) });
  world.addBody(platformBody);

  const platformGeometry = new THREE.BoxGeometry(size[0], 1, size[1]);
  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
  platformMesh.position.set(...position);
  scene.add(platformMesh);
}

const platforms = [];
platforms.push(createPlatform([10, 10], [0, 0, 0]));  // Start platform
platforms.push(createPlatform([5, 5], [10, 2, -5]));  // Small jump
platforms.push(createPlatform([5, 5], [15, 4, -10])); // Medium jump
platforms.push(createPlatform([5, 5], [20, 6, -15])); // Higher jump
platforms.push(createPlatform([5, 5], [25, 8, -20])); // Even higher
platforms.push(createPlatform([10, 10], [35, 10, -25])); // Goal platform

// Player setup
const playerRadius = 1;
const sphereShape = new CANNON.Sphere(playerRadius);
const playerBody = new CANNON.Body({
  mass: 80,
  shape: sphereShape,
  position: new CANNON.Vec3(0, 5, 0),
  fixedRotation: true,
});
playerBody.linearDamping = 0.1; // Less friction for bhop
world.addBody(playerBody);

const playerMesh = new THREE.Mesh(
  new THREE.SphereGeometry(playerRadius, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
scene.add(playerMesh);

// Input Handling
const keysPressed = {};
document.addEventListener("keydown", (e) => keysPressed[e.code] = true);
document.addEventListener("keyup", (e) => keysPressed[e.code] = false);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bunny Hop + Strafing Mechanics
let canJump = false;
const jumpVelocity = 5;
const baseSpeed = 5;
let speed = baseSpeed;

playerBody.addEventListener("collide", () => canJump = true);

const timeStep = 1 / 110;
function animate() {
  requestAnimationFrame(animate);

  if (!locked) {

    // Movement
    const forward = new THREE.Vector3();
    controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).normalize();

    const moveDirection = new THREE.Vector3();


    // **No Speed from W Only**
    if (keysPressed["KeyW"]) {
      moveDirection.add(forward);
    }
    if (keysPressed["KeyS"]) {
      moveDirection.sub(forward);
    }

    // **Strafing**
    if (keysPressed["KeyA"]) {
      moveDirection.add(right);
      if (!canJump) {
        speed += 0.002; // Gain speed mid-air
        moveDirection.add(forward);
      }
    }
    if (keysPressed["KeyD"]) {
      moveDirection.sub(right);
      if (!canJump) {
        speed += 0.002; // Gain speed mid-air
        moveDirection.add(forward);
      }
    }

    if (canJump && !keysPressed["Space"]) {
      speed = baseSpeed;
      playerBody.velocity.x = moveDirection.x * speed;
      playerBody.velocity.z = moveDirection.z * speed;
    }  // Reset speed when touching ground

    if (moveDirection.lengthSq() > 0) {
      console.log(moveDirection)
      moveDirection.normalize();
      playerBody.velocity.x = moveDirection.x * speed;
      playerBody.velocity.z = moveDirection.z * speed;
    }

    // Jumping
    if (keysPressed["Space"] && canJump) {
      playerBody.velocity.y = jumpVelocity;
      canJump = false;
    }

    world.step(timeStep);
    controls.getObject().position.copy(playerBody.position);
    playerMesh.position.copy(playerBody.position);

    const currSpeed = Math.sqrt(
      playerBody.velocity.x ** 2 + playerBody.velocity.z ** 2
    );

    // Update speed display
    document.getElementById("speedDisplay").innerText = `Speed: ${currSpeed.toFixed(2)}`;
  }

  renderer.render(scene, camera);
}
animate();

