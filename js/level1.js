import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function loadLevel1(scene, world, playerBody) {

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

  // ----- CREATE THE WALLS -----
  // Function to help create walls at desired positions.
  function createWall(x, y, z, scaleX, scaleY, scaleZ) {

    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 })
    const wallGeometry = new THREE.BoxGeometry(scaleX, scaleY, scaleZ)
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(x, y, z);
    scene.add(wallMesh);


    const wallShape = new CANNON.Box(new CANNON.Vec3(scaleX / 2, scaleY / 2, scaleZ / 2));
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShape);
    wallBody.position.set(x, y, z);
    world.addBody(wallBody);
    return wallBody;
  }

  const floorGeometry = new THREE.BoxGeometry(100, 2, 100);
  const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x117711 });
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

  createWall(0, wallHeight / 2, -halfSize - wallThickness / 2, 100, wallHeight, wallThickness);
  createWall(0, wallHeight / 2, halfSize + wallThickness / 2, 100, wallHeight, wallThickness);
  createWall(-halfSize - wallThickness / 2, wallHeight / 2, 0, wallThickness, wallHeight, 100);
  createWall(halfSize + wallThickness / 2, wallHeight / 2, 0, wallThickness, wallHeight, 100);
  createWall(-15, 0, 15, wallThickness, wallHeight, 80);

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

  // first part
  createPlatform([7, 7], [-37.5, 0, 37.5])
  createPlatform([5, 5], [-37.5, 0, 24.5])
  createPlatform([5, 5], [-37.5, 0, 12.5])
  createPlatform([5, 5], [-37.5, 0, -1])
  createPlatform([5, 5], [-27.5, 0, -10])
  createPlatform([5, 5], [-27.5, 0, -21])
  createPlatform([5, 5], [-20.5, 0, -36])


}

