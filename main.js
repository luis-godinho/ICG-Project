import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import { loadLevel } from './js/level.js';

// ----- THREE.JS SETUP -----
let scene, camera, renderer, controls;
scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa);

camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(63, 62, 14)
camera.lookAt(new THREE.Vector3(40, 0, 40))
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
let noclip = false;
let hasWon = false;

let sensitivity = 3
controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = sensitivity
scene.add(controls.getObject());


document.getElementById("playButton").addEventListener("click", () => controls.lock());

controls.addEventListener("lock", () => {
  document.getElementById("gameStart").style.display = "none";
  locked = false;

});
controls.addEventListener("unlock", () => {
  if (!hasWon) {
    document.getElementById("gameStart").style.display = "";
  }
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
document.addEventListener("keydown", (e) => {
  keysPressed[e.code] = true;

  if (e.code === "KeyN") {
    noclip = !noclip;
    if (noclip) {
      // disable physics by zeroing velocity and disabling gravity
      document.getElementById("coord").style.display = "block";
      playerBody.velocity.set(0, 0, 0);
      playerBody.type = CANNON.Body.STATIC;
    } else {
      document.getElementById("coord").style.display = "none";
      playerBody.type = CANNON.Body.DYNAMIC;
      playerBody.velocity.set(0, 0, 0);
    }
  }
});
document.addEventListener("keyup", (e) => keysPressed[e.code] = false);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function showWinScreen() {
  document.exitPointerLock();
  hasWon = true; // <--- Add this

  const winScreen = document.getElementById("winScreen");
  if (!winScreen) return;

  winScreen.style.display = "flex";

  const button = document.getElementById("playAgainButton");
  button.onclick = () => {
    winScreen.style.display = "none";
    hasWon = false;
    restartGame();
  };

  document.getElementById("gameStart").style.display = "none";
}

function restartGame() {
  // Remove all meshes from the scene
  location.reload()
  loadLevel(scene, world, playerBody, showWinScreen)
}

loadLevel(scene, world, playerBody, showWinScreen)

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
    colision = false
  }
  if (contactNormal.dot(xAxis) > 0.5) {
    playerBody.position.x += 0.1
    // playerBody.velocity.set(0, 0, 0)
    colision = true
  } else if (contactNormal.dot(xAxis) <= 0.5 && contactNormal.dot(xAxis) != 0) {
    playerBody.position.x -= 0.1
    // playerBody.velocity.set(0, 0, 0)
    colision = true
  }

  if (contactNormal.dot(zAxis) > 0.5) {
    playerBody.position.z += 0.1
    // playerBody.velocity.set(0, 0, 0)
    colision = true
  } else if (contactNormal.dot(zAxis) <= 0.5 && contactNormal.dot(zAxis) != 0) {
    playerBody.position.z -= 0.1
    // playerBody.velocity.set(0, 0, 0)
    colision = true
  }

});

const timeStep = 1 / 110;
const maxSpeed = 19
function animate() {
  requestAnimationFrame(animate);
  scene.userData.update()

  if (!locked) {

    if (noclip) {
      const moveSpeed = 0.15;
      const move = new THREE.Vector3();

      const forward = new THREE.Vector3();
      controls.getDirection(forward);
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, camera.up).normalize();

      if (keysPressed["KeyW"]) move.add(forward);
      if (keysPressed["KeyS"]) move.sub(forward);
      if (keysPressed["KeyA"]) move.sub(right);
      if (keysPressed["KeyD"]) move.add(right);
      if (keysPressed["Space"]) move.y += 1;
      if (keysPressed["ShiftLeft"]) move.y -= 1;

      move.normalize();
      move.multiplyScalar(moveSpeed);

      controls.getObject().position.add(move);
      playerBody.position.copy(controls.getObject().position);
      playerMesh.position.copy(playerBody.position);

      document.getElementById("speedDisplay").innerText = `Noclip: ON`;
    } else {
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
        if (speed > maxSpeed) {
          speed = maxSpeed;
        }

        if (colision) {
          speed = 0
        }
        playerBody.velocity.x = moveDirection.x * speed;
        playerBody.velocity.z = moveDirection.z * speed;
        // Cap the speed to a specific value
        // if (Math.abs(playerBody.velocity.x) > maxSpeed) {
        //   playerBody.velocity.x = playerBody.velocity.x / Math.abs(playerBody.velocity.x) * maxSpeed
        // }
        // if (Math.abs(playerBody.velocity.z) > 8) {
        //   playerBody.velocity.z = playerBody.velocity.z / Math.abs(playerBody.velocity.z) * maxSpeed
        // }
      }

      // Jumping
      if (keysPressed["Space"] && canJump) {
        playerBody.velocity.y = jumpVelocity;
        canJump = false;
      }
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
  }

  document.getElementById("coord").innerText = `x: ${playerBody.position.x.toFixed(0)} y: ${playerBody.position.y.toFixed(0)} z: ${playerBody.position.z.toFixed(0)} `;


  renderer.render(scene, camera);
}
animate();

