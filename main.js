
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import { loadLevel1 } from './js/level1.js'

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

// Player setup
const playerRadius = 1;
const cylinderShape = new CANNON.Cylinder(playerRadius, playerRadius, 5);
const playerBody = new CANNON.Body({
  mass: 20,
  shape: cylinderShape,
  position: new CANNON.Vec3(-37, 5, 37),
  fixedRotation: true,
});
playerBody.linearDamping = 0; // Less friction for bhop
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

loadLevel1(scene, world, playerBody)

// Bunny Hop + Strafing Mechanics
let canJump = false;
const jumpVelocity = 5;
const baseSpeed = 5;
let speed = baseSpeed;
let colision = false

const contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
const yAxis = new CANNON.Vec3(0, 1, 0);
const xAxis = new CANNON.Vec3(1, 0, 0)
const zAxis = new CANNON.Vec3(0, 0, 1)
playerBody.addEventListener("collide", (event) => {
  const { contact } = event;


  if (contact.bi.id === playerBody.id) {
    contact.ni.negate(contactNormal);
  } else {
    contactNormal.copy(contact.ni);
  }

  if (contactNormal.dot(yAxis) > 0.5) {
    canJump = true;
  }
  // console.log(contactNormal)
  if (contactNormal.dot(xAxis) > 0.5) {
    // playerBody.position.x += 0.1
    playerBody.velocity.set(0, 0, 0)
    colision = true
  } else if (contactNormal.dot(xAxis) <= 0.5 && contactNormal.dot(xAxis) != 0) {
    // playerBody.position.x -= 0.1
    playerBody.velocity.set(0, 0, 0)
    colision = true
  }

  if (contactNormal.dot(zAxis) > 0.5) {
    // playerBody.position.z += 0.1
    playerBody.velocity.set(0, 0, 0)
    colision = true
  } else if (contactNormal.dot(zAxis) <= 0.5 && contactNormal.dot(zAxis) != 0) {
    // playerBody.position.z -= 0.1
    playerBody.velocity.set(0, 0, 0)
    colision = true
  }

});

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
    right.crossVectors(camera.up, forward);

    const moveDirection = new THREE.Vector3();

    // if (!colision) {

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
        speed += 0.012; // Gain speed mid-air
        moveDirection.add(forward);
      }
    }
    if (keysPressed["KeyD"]) {
      moveDirection.sub(right);
      if (!canJump) {
        speed += 0.012; // Gain speed mid-air
        moveDirection.add(forward);
      }
    }

    if (canJump && !keysPressed["Space"]) {
      speed = baseSpeed;
    }  // Reset speed only if jumping is possible

    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize();
      playerBody.velocity.x = moveDirection.x * speed;
      playerBody.velocity.z = moveDirection.z * speed;
    }

    // Jumping
    if (keysPressed["Space"] && canJump) {
      playerBody.velocity.y = jumpVelocity;
      canJump = false;
    }


    // }
    const currSpeed = Math.sqrt(
      playerBody.velocity.x ** 2 + playerBody.velocity.z ** 2
    );
    controls.getObject().position.copy(playerBody.position);
    playerMesh.position.copy(playerBody.position);

    playerBody.position.y += 0.001
    world.step(timeStep);


    // Update speed display
    document.getElementById("speedDisplay").innerText = `Speed: ${currSpeed.toFixed(2)}`;
  }

  renderer.render(scene, camera);
}
animate();

