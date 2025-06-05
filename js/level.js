import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadLevel(scene, world, playerBody, showWinScreen) {
  const cellSize = 10;
  const platformStepUp = 2;
  const mazeWidth = 10;
  const mazeHeight = 10;
  const rotatingObstacles = [];
  const textureLoader = new THREE.TextureLoader()
  const gltfLoader = new GLTFLoader();
  const cactusPositions = [];

  function createPlatform(size, position) {
    const platformShape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, 0.5, size[1] / 2));
    const platformBody = new CANNON.Body({ mass: 0, shape: platformShape, position: new CANNON.Vec3(...position) });
    world.addBody(platformBody);

    const platformGeometry = new THREE.BoxGeometry(size[0], 1, size[1]);
    const platformMaterial = new THREE.MeshPhongMaterial({
      color: 0x555555,
      shininess: 20,
      map: textureLoader.load("/ICG-Project/models/BrickWall11_1K_BaseColor.png"),
      normalMap: textureLoader.load("/ICG-Project/models/BrickWall11_1K_Normal.png"),
      aoMap: textureLoader.load("/ICG-Project/models/BrickWall11_1K_AO.png"),
      roughnessMap: textureLoader.load("/ICG-Project/models/BrickWall11_1K_Roughness.png")
    });
    const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
    platformMesh.position.set(...position);
    platformMesh.castShadow = true;
    platformMesh.receiveShadow = true;
    scene.add(platformMesh);
  }

  function createWall(x, y, z, scaleX, scaleY, scaleZ) {
    const wallMaterial = new THREE.MeshPhongMaterial({
      color: 0x888888,
      shininess: 20,
      map: textureLoader.load("/ICG-Project/models/brick_color.jpg"),
      normalMap: textureLoader.load("/ICG-Project/models/brick_normal.jpg"),
      aoMap: textureLoader.load("/ICG-Project/models/BrickWall11_1K_AO.jpg"),
      roughnessMap: textureLoader.load("/ICG-Project/models/brick_rough.jpg")
    });
    const wallGeometry = new THREE.BoxGeometry(scaleX, 5, scaleZ);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallMesh.position.set(x, y - 5, z);
    scene.add(wallMesh);

    const wallShape = new CANNON.Box(new CANNON.Vec3(scaleX / 2, scaleY / 2, scaleZ / 2));
    const wallBody = new CANNON.Body({ mass: 0 });
    wallBody.addShape(wallShape);
    wallBody.position.set(x, y, z);
    world.addBody(wallBody);
  }

  function generateMaze(width, height) {
    const maze = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ visited: false, walls: { N: true, S: true, E: true, W: true } }))
    );

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    function carve(x, y) {
      maze[y][x].visited = true;
      for (const [dx, dy, dir, opp] of shuffle([
        [0, -1, "N", "S"],
        [0, 1, "S", "N"],
        [1, 0, "E", "W"],
        [-1, 0, "W", "E"]
      ])) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && !maze[ny][nx].visited) {
          maze[y][x].walls[dir] = false;
          maze[ny][nx].walls[opp] = false;
          carve(nx, ny);
        }
      }
    }

    carve(0, 0);
    return maze;
  }

  function solveMaze(maze) {
    const height = maze.length, width = maze[0].length;
    const path = [];
    const visited = Array.from({ length: height }, () => Array(width).fill(false));

    function dfs(x, y) {
      if (x === width - 1 && y === height - 1) {
        path.push([x, y]);
        return true;
      }
      visited[y][x] = true;
      const directions = [
        [0, -1, "N"],
        [0, 1, "S"],
        [1, 0, "E"],
        [-1, 0, "W"]
      ];

      for (const [dx, dy, dir] of directions) {
        const nx = x + dx, ny = y + dy;
        if (maze[y][x].walls[dir] === false &&
          nx >= 0 && ny >= 0 && nx < width && ny < height &&
          !visited[ny][nx]) {
          if (dfs(nx, ny)) {
            path.push([x, y]);
            return true;
          }
        }
      }
      return false;
    }

    dfs(0, 0);
    return path.reverse();
  }

  function createWallsAroundPath(path, maze) {
    const size = cellSize;
    const obstaclePositions = [];
    const minDist = size * 1.2; // minimum center‐to‐center distance

    for (const [x, y] of path) {
      const cell = maze[y][x];
      const cx = x * size;
      const cz = y * size;

      // build the walls
      if (cell.walls.N) createWall(cx, 5, cz - size / 2, size, 10, 1);
      if (cell.walls.S) createWall(cx, 5, cz + size / 2, size, 10, 1);
      if (cell.walls.E) createWall(cx + size / 2, 5, cz, 1, 10, size);
      if (cell.walls.W) createWall(cx - size / 2, 5, cz, 1, 10, size);

      // detect a corner (two perpendicular walls)
      const isCorner =
        (cell.walls.N && cell.walls.E) ||
        (cell.walls.E && cell.walls.S) ||
        (cell.walls.S && cell.walls.W) ||
        (cell.walls.W && cell.walls.N);

      if (isCorner && Math.random() < 0.2) {
        // compute corner world‐coords
        // we offset ±size/2 on X/Z depending on which two walls are present
        const offsetX = (cell.walls.E ? 1 : -1) * size / 2;
        const offsetZ = (cell.walls.S ? 1 : -1) * size / 2;
        const pos = [cx + offsetX, 3, cz + offsetZ];

        // check against all existing obstacles
        const tooClose = obstaclePositions.some(p => {
          const dx = p[0] - pos[0];
          const dz = p[2] - pos[2];
          return Math.hypot(dx, dz) < minDist;
        });

        const startX = path[0][0] * size;
        const startZ = path[0][1] * size;
        const dxStart = pos[0] - startX;
        const dzStart = pos[2] - startZ;
        const distToStart = Math.hypot(dxStart, dzStart);
        const tooCloseToStart = distToStart < size * 3;

        if (!tooClose && !tooCloseToStart) {
          createRotatingObstacle(pos);
          obstaclePositions.push(pos);
        }
      }
    }
  }

  function createRotatingObstacle(position) {
    const height = 14;
    const width = 1;
    const depth = 14;

    // — THREE.js mesh —
    const geometry = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      map: textureLoader.load("/ICG-Project/models/barrier.jpg"),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    scene.add(mesh);

    // — CANNON.js body (kinematic so we can manually spin it) —
    const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
    const shape = new CANNON.Box(halfExtents);
    const body = new CANNON.Body({
      mass: 0,             // zero mass → static/kinematic
      type: CANNON.Body.KINEMATIC
    });
    body.addShape(shape);
    body.position.set(...position);
    world.addBody(body);

    // Random spin speed around Y axis
    const speed = Math.random() * 0.005 + 0.010;

    // Store all three so we can animate & sync
    rotatingObstacles.push({ mesh, body, speed });
  }

  function placePlatformsFromPath(path) {
    let y = 0;
    let old_y = 0;
    for (let i = 0; i < path.length; i++) {
      const [x, z] = path[i];
      const platformX = x * cellSize;
      const platformZ = z * cellSize;
      createPlatform([5, 5], [platformX, y, platformZ]);


      y = old_y + Math.random() * platformStepUp - 1;
      if (y < 0) {
        y = old_y
      }
      old_y = y;
    }

    function createWinTrigger(x, z) {
      const triggerShape = new CANNON.Box(new CANNON.Vec3(2.5, 100, 2.5)); // match platform size
      const triggerBody = new CANNON.Body({
        mass: 0,
        collisionResponse: false // this makes it a trigger
      });
      triggerBody.addShape(triggerShape);
      triggerBody.position.set(x, 1, z);
      triggerBody.isTrigger = true;

      triggerBody.addEventListener("collide", (e) => {
        if (e.body === playerBody) {
          showWinScreen();
        }
      });

      world.addBody(triggerBody);

      // // Optional: Make the trigger visible
      // const triggerGeometry = new THREE.BoxGeometry(5, 100, 5);
      // const triggerMaterial = new THREE.MeshBasicMaterial({
      //   color: 0x00ff00,
      //   opacity: 0.3,
      //   transparent: true
      // });
      // const triggerMesh = new THREE.Mesh(triggerGeometry, triggerMaterial);
      // triggerMesh.position.set(x, 1, z);
      // scene.add(triggerMesh);

    }


    const [startX, startZ] = path[0];
    playerBody.position.set(startX * cellSize, 5, startZ * cellSize);

    // Create a win trigger at the last platform
    const [goalX, goalZ] = path[path.length - 1];
    createWinTrigger(goalX * cellSize, goalZ * cellSize);
    playerBody.position.set(path[0][0] * cellSize, 5, path[0][1] * cellSize);
  }


  function placeCacti(maze, path) {
    const pathSet = new Set(path.map(([x, y]) => `${x},${y}`));

    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[0].length; x++) {
        // Skip path cells
        if (pathSet.has(`${x},${y}`)) continue;
        if (Math.random() < 0.1) { // 10% chance to spawn cactus in each empty cell
          const worldX = x * cellSize;
          const worldZ = y * cellSize;
          const pos = [worldX, 0, worldZ];

          cactusPositions.push(pos);

          gltfLoader.load('/ICG-Project/models/cactus1.glb', (gltf) => {
            const model = gltf.scene;
            model.scale.set(0.2, 0.2, 0.2);
            model.position.set(...pos);
            model.traverse(child => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ color: 0x228b22 });
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            scene.add(model);
          });
        }
      }
    }
  }

  const texture = textureLoader.load("/ICG-Project/models/sand.jpg");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10); // Increase values to make texture smaller (repeat more)

  // STATIC FLOOR
  const floorGeometry = new THREE.BoxGeometry(150, 2, 150);
  const floorMaterial = new THREE.MeshPhongMaterial({
    color: 0x888888,
    shininess: 10,
    map: texture
  });
  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  floorMesh.position.set(50, -1, 50);
  scene.add(floorMesh);

  const floorShape = new CANNON.Box(new CANNON.Vec3(500, 1, 500));
  const floorBody = new CANNON.Body({ mass: 0, isTrigger: true });
  floorBody.addShape(floorShape);
  floorBody.position.set(50, -1, 50);
  world.addBody(floorBody);

  floorBody.addEventListener("collide", () => {
    resetPlayer(playerBody);
  });

  function resetPlayer(body) {
    body.position.set(0, 5, 0);
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
  }

  // LIGHT & SKY
  const spotlight = new THREE.SpotLight(0xffffff, 2, 0, Math.PI / 2, 0, 0);
  spotlight.position.set(-30, 66, -42);
  spotlight.castShadow = true
  scene.add(spotlight);

  const sky = new Sky();
  sky.scale.setScalar(45000);
  const phi = THREE.MathUtils.degToRad(0);
  const theta = THREE.MathUtils.degToRad(180);
  const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms.sunPosition.value = sunPosition;
  scene.add(sky);

  // MAZE
  const maze = generateMaze(mazeWidth, mazeHeight);
  const path = solveMaze(maze);
  placePlatformsFromPath(path);
  createWallsAroundPath(path, maze);
  placeCacti(maze, path)

  // ROTATION LOOP: Call this inside your animation loop
  scene.userData.update = function () {
    for (const { mesh, body, speed } of rotatingObstacles) {
      mesh.rotation.y += speed;

      body.quaternion.copy(mesh.quaternion);

    }
  };
}

