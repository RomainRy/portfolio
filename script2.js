const selectedCircuit = localStorage.getItem('selectedCircuit');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xAAAAAA);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setSize(1260, 805);
document.body.appendChild(renderer.domElement);

camera.position.set(0, 5, -10);
camera.lookAt(0, 0, 0);

// Add lights
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight.position.set(0, 5, -10);
scene.add(directionalLight);


// Load and display the track model
const loader = new THREE.GLTFLoader();
let track, car, wall1;

loader.load(selectedCircuit, function (gltf) {
    track = gltf.scene;
    track.scale.set(1, 1, 1);
    track.position.set(0, 0, 0);
    scene.add(track);

    // Identify walls for collisions
    track.traverse((child) => {
        if (child.name === "collider1") wall1 = child;
        // if (child.name === "collider2") wall2 = child;
        // if (child.name === "collider3") wall3 = child;
        // if (child.name === "collider4") wall4 = child;
        // console.log(child.name);
        // console.log(child)
    });
}, undefined, function (error) {
    console.error(error);
});

let redirectionCube1, redirectionCube2;

loader.load(selectedCircuit, function (gltf) {
    track = gltf.scene;
    track.scale.set(1, 1, 1);
    track.position.set(0, 0, 0);
    scene.add(track);

    // Identifier les cubes de redirection
    track.traverse((child) => {
        if (child.name === "redirection") {
            redirectionCube1 = child; // Récupérer le premier cube de redirection
        }
        if (child.name === "redirection2") {
            redirectionCube2 = child; // Récupérer le deuxième cube de redirection
        }
    });
}, undefined, function (error) {
    console.error(error);
});


let redirectionColliderBox1, redirectionColliderBox2;

function createRedirectionColliders() {
    if (redirectionCube1) {
        redirectionColliderBox1 = new THREE.Box3().setFromObject(redirectionCube1); // Boîte de collision pour le premier cube
        // Agrandir la boîte de collision verticalement (ex. multiplier par 2 l'axe Y)
        redirectionColliderBox1.max.y += 2; // Augmenter la taille verticale
        redirectionColliderBox1.min.y -= 2; // Déplacer la limite inférieure vers le bas
    }
    if (redirectionCube2) {
        redirectionColliderBox2 = new THREE.Box3().setFromObject(redirectionCube2); // Boîte de collision pour le deuxième cube
        // Agrandir la boîte de collision verticalement (ex. multiplier par 2 l'axe Y)
        redirectionColliderBox2.max.y += 2; // Augmenter la taille verticale
        redirectionColliderBox2.min.y -= 2; // Déplacer la limite inférieure vers le bas
    }
}



let canRedirect = false; // Indique si la voiture est dans une zone de redirection
let currentRedirectURL = ""; // Stocke l'URL de la zone de redirection actuelle

function checkRedirectionCollisions() {
    if (carColliderBox) {
        if (redirectionColliderBox1 && carColliderBox.intersectsBox(redirectionColliderBox1)) {
            canRedirect = true;
            currentRedirectURL = "https://www.linkedin.com/in/romain-royer-70a17724b/";
        } else if (redirectionColliderBox2 && carColliderBox.intersectsBox(redirectionColliderBox2)) {
            canRedirect = true;
            currentRedirectURL = "https://github.com/RomainRy";
        } else {
            canRedirect = false;
            currentRedirectURL = "";
        }
    }
}

// Ajout d'un écouteur pour détecter l'appui sur "Entrée"
document.addEventListener('keydown', (event) => {
    if (event.key === "Enter" && canRedirect && currentRedirectURL) {
        window.location.href = currentRedirectURL;
    }
});





// Load and display the car model
loader.load('../voiture3.glb', function (gltf) {
    car = gltf.scene;
    car.scale.set(0.75, 0.75, 0.75); // Adjust the scale of the car
    car.position.set(0, 0, 0); // Set the initial position of the car
    scene.add(car);
}, undefined, function (error) {
    console.error(error);
});

// Collision boxes
let carColliderBox, wall1ColliderBox;

function createColliders() {
    if (car && wall1) {
        carColliderBox = new THREE.Box3().setFromObject(car);
        wall1ColliderBox = new THREE.Box3().setFromObject(wall1);
        // wall2ColliderBox = new THREE.Box3().setFromObject(wall2);
        // wall3ColliderBox = new THREE.Box3().setFromObject(wall3);
        // wall4ColliderBox = new THREE.Box3().setFromObject(wall4);
    }
}

// Variables pour le boost
const boostSpeed = 0.1; // Vitesse de boost supplémentaire
let isBoosting = false; // Indique si le boost est actif

// Variables pour le drift
let isDrifting = false;
const driftTurnSpeed = 0.02; // Vitesse de rotation plus modérée pendant le drift
const driftFriction = 0.9; // Moins de réduction de friction pour un drift plus contrôlé


// Car controls
const keys = {};
let speed = 0;
let maxSpeed = 0.05;
const acceleration = 0.001;
const deceleration = 0.0005;
const turnSpeed = 0.01;
let rotationSpeed = 0;
let isBlockedByWall = false;
let canMoveForward = true;
let canMoveBackward = true;

// Event listeners pour les touches
document.addEventListener('keydown', (event) => {
    keys[event.key] = true;

    // Activer le boost si "A" est pressée
    if (event.key === "a") {
        isBoosting = true;
    }

    // Activer le drift si "Z" est pressée
    if (event.key === "z") {
        isDrifting = true;
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.key] = false;

    // Désactiver le boost si "A" est relâchée
    if (event.key === "a") {
        isBoosting = false;
    }

    // Désactiver le drift si "Z" est relâchée
    if (event.key === "z") {
        isDrifting = false;
    }
});

// Raycaster for detecting the height of the terrain under the car
const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
let carHeight = 0.5;

// Variables for smoothing
let previousY = 0;
let previousRotationX = 0;

function adjustCarHeightAndTilt() {
    if (car && track) {
        // Set the ray's starting point and direction
        raycaster.set(car.position.clone().add(new THREE.Vector3(0, 1, 0)), downVector);

        // Intersect with the track model
        const intersects = raycaster.intersectObject(track, true);

        if (intersects.length > 0) {
            const intersect = intersects[0];

            // Smooth the height
            const targetY = intersect.point.y + carHeight;
            car.position.y = THREE.MathUtils.lerp(previousY, targetY, 0.2);
            previousY = car.position.y;

            // Calculate and smooth the tilt
            const normal = intersect.face.normal;
            const tiltAngle = -Math.atan2(normal.z, normal.y); // Tilt on the X axis
            car.rotation.x = THREE.MathUtils.lerp(previousRotationX, tiltAngle, 0.2);
            previousRotationX = car.rotation.x;
        }
    }
}

function updateCamera() {
    if (car) {
        const relativeCameraOffset = new THREE.Vector3(0, 3, -5); // 0, 7, -10
        const cameraPosition = car.position.clone().add(relativeCameraOffset.applyQuaternion(car.quaternion));
        camera.position.lerp(cameraPosition, 0.1);
        camera.lookAt(car.position.clone());
    }
}

function animate() {
    requestAnimationFrame(animate);

    createColliders();

    createRedirectionColliders(); // Créer les boîtes de collision pour les deux cubes de redirection

    checkRedirectionCollisions(); // Vérifier si la voiture entre en collision avec l'un des cubes de redirection

    isBlockedByWall = false;
    if (carColliderBox) {
        if (carColliderBox.intersectsBox(wall1ColliderBox)) {
            isBlockedByWall = true;
            speed = 0;
        }
    }

    if (keys.ArrowUp && !isBlockedByWall) {
        speed = Math.min(speed + acceleration, maxSpeed + (isBoosting ? boostSpeed : 0));
        canMoveForward = true;
    } else if (keys.ArrowDown) {
        speed = Math.max(speed - acceleration, -maxSpeed / 2);
        canMoveBackward = true;
    } else {
        speed = speed > 0 ? Math.max(speed - deceleration, 0) : Math.min(speed + deceleration, 0);
        canMoveForward = true;
        canMoveBackward = true;
    }

    // Gestion du drift
    let currentTurnSpeed = isDrifting ? driftTurnSpeed : turnSpeed; // Vitesse de rotation pendant le drift
    let frictionFactor = isDrifting ? driftFriction : 1; // Réduction de la friction pendant le drift


     // Gestion de la rotation
     if (speed !== 0) {
        if (keys.ArrowLeft) {
            rotationSpeed = currentTurnSpeed;
        } else if (keys.ArrowRight) {
            rotationSpeed = -currentTurnSpeed;
        } else {
            rotationSpeed = 0;
        }
    } else {
        rotationSpeed = 0;
    }

    // if (speed !== 0) {
    //     if (keys.ArrowLeft) {
    //         rotationSpeed = turnSpeed;
    //     } else if (keys.ArrowRight) {
    //         rotationSpeed = -turnSpeed;
    //     } else {
    //         rotationSpeed = 0;
    //     }
    // } else {
    //     rotationSpeed = 0;
    // }

     // Appliquer le mouvement et la rotation
     if (car) {
        if (canMoveForward && !isBlockedByWall) {
            car.rotation.y += rotationSpeed;
            car.position.x += Math.sin(car.rotation.y) * speed * frictionFactor;
            car.position.z += Math.cos(car.rotation.y) * speed * frictionFactor;
        }
        if (canMoveBackward) {
            car.rotation.y += rotationSpeed;
            car.position.x += Math.sin(car.rotation.y) * speed * frictionFactor;
            car.position.z += Math.cos(car.rotation.y) * speed * frictionFactor;
        }

        adjustCarHeightAndTilt();
    }

    

    updateCamera();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

