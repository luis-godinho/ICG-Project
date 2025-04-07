import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';

export function loadLevel1(scene, world, playerBody) {

  function createPlatform(size, position) {
    const platformShape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, 0.5, size[1] / 2));
    const platformBody = new CANNON.Body({ mass: 0, shape: platformShape, position: new CANNON.Vec3(...position) });
    world.addBody(platformBody);

    const platformGeometry = new THREE.BoxGeometry(size[0], 1, size[1]);
    const platformMaterial = new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 1, receiveShadow: true });
    const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
    platformMesh.position.set(...position);
    platformMesh.castShadow = true
    scene.add(platformMesh);
  }

  // ----- CREATE THE WALLS -----
  // Function to help create walls at desired positions.
  function createWall(x, y, z, scaleX, scaleY, scaleZ) {

    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 1, receiveShadow: true })
    const wallGeometry = new THREE.BoxGeometry(scaleX, scaleY, scaleZ)
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.castShadow = true
    wallMesh.position.set(x, y, z);
    scene.add(wallMesh);


    const wallShape = new CANNON.Box(new CANNON.Vec3(scaleX / 2, scaleY / 2, scaleZ / 2));
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShape);
    wallBody.position.set(x, y, z);
    world.addBody(wallBody);
    return wallBody;
  }

  const loader = new GLTFLoader();

  const floorGeometry = new THREE.BoxGeometry(100, 2, 100);
  const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x117711, shininess: 1, receiveShadow: true });
  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  floorMesh.position.set(0, -1, 0);

  scene.add(floorMesh);

  const floorShape = new CANNON.Box(new CANNON.Vec3(50, 1, 50));
  const floorBody = new CANNON.Body({
    mass: 0, // static object
    isTrigger: true // setting this to false makes it act like a sensor/trigger
  });
  floorBody.addShape(floorShape);
  floorBody.position.set(0, -1, 0); // position it just below y=0
  world.addBody(floorBody);

  const wallThickness = 1;
  const wallHeight = 20;
  const halfSize = 50;

  // ----- SET UP THE FLOOR TRIGGER -----
  // When the player collides with the floor, we trigger a reset.
  // In this example, we assume the player’s physics body has a flag "isPlayer".
  floorBody.addEventListener("collide", function (event) {
    resetPlayer(playerBody)
  });

  function resetPlayer(body) {
    // Reset position (e.g., back to the starting point)
    body.position.set(-37, 5, 37);
    // Reset any movement
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
  }
  //
  // const light = new THREE.AmbientLight(0xFFFFFF, 1)
  // scene.add(light)
  //
  const spotlight = new THREE.SpotLight(0xFFFFFF, 1, 0, Math.PI / 2, 0, 0);
  spotlight.position.set(-30, 66, -42);
  scene.add(spotlight)

  const sky = new Sky();
  sky.scale.setScalar(450000);

  const phi = THREE.MathUtils.degToRad(45);
  const theta = THREE.MathUtils.degToRad(180);
  const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

  sky.material.uniforms.sunPosition.value = sunPosition;

  scene.add(sky);

  createWall(0, wallHeight / 2, -halfSize - wallThickness / 2, 100, wallHeight, wallThickness);
  createWall(0, wallHeight / 2, halfSize + wallThickness / 2, 100, wallHeight, wallThickness);
  createWall(-halfSize - wallThickness / 2, wallHeight / 2, 0, wallThickness, wallHeight, 100);
  createWall(halfSize + wallThickness / 2, wallHeight / 2, 0, wallThickness, wallHeight, 100);
  createWall(-15, wallHeight / 2, 13, wallThickness, wallHeight, 75);
  createWall(-10, wallHeight / 2, -14, 10, wallHeight, wallThickness);
  createWall(-4, wallHeight / 2, -4, 10, wallHeight, wallThickness);
  createWall(1, wallHeight / 2, -10, wallThickness, wallHeight, 80);
  createWall(-3, wallHeight / 2, 12, 8, wallHeight, wallThickness);

  // first part
  createPlatform([7, 7], [-37.5, 0, 37.5])
  createPlatform([5, 5], [-37.5, 0, 24.5])
  createPlatform([5, 5], [-37.5, 0, 12.5])
  createPlatform([5, 5], [-37.5, 0, -1])
  createPlatform([5, 5], [-27.5, 0, -10])
  createPlatform([5, 5], [-27.5, 0, -21])
  createPlatform([5, 5], [-20.5, 0, -36])

  // second part
  createPlatform([3, 3], [-10, 0, -21])
  createPlatform([4, 4], [-10, 0, -11])
  createPlatform([3, 3], [-5, 0, 4])
  createPlatform([5, 5], [-5, 0, 22])
  createPlatform([8, 8], [3, 0, 39])

  // third part
  createPlatform([30, 4], [23, 1, 23])
  createPlatform([30, 4], [23, 2, 13])

  createPlatform([6, 6], [11, 3, 1])
  createPlatform([6, 6], [28, 4, -7])
  createPlatform([6, 6], [12, 5, -22])
  createPlatform([9, 9], [23, 6, -39])


}

