// ═══════════════════════════════════════════
// SPATIO CORE — Scene, Camera, Lighting, Grid, Axis Widget
// ═══════════════════════════════════════════

// Global namespace
window.SPATIO = window.SPATIO || {};

// Pre-allocated reusable objects (avoid per-frame GC pressure)
var _reusableVec3A = new THREE.Vector3();
var _reusableVec3B = new THREE.Vector3();
var _reusableVec3C = new THREE.Vector3();
var _reusableRaycaster = new THREE.Raycaster();
var _reusableNDC = new THREE.Vector2();

// State
var scene, camera, renderer, selHelper;
var objects = [];
var selectedRoot = null;
var selectedObjects = [];    // multi-select: array of object entries
var selectionHelpers = [];   // BoxHelper instances for multi-select
var mode = 'select';
var undoStack = [];

var cam = { r:22, theta:-0.55, phi:1.05 };
var camTarget = new THREE.Vector3(0, 0, 0);
var mouse = { down:false, btn:0, x:0, y:0, moved:false };
var dragPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
var dragOffset = new THREE.Vector3();
var draggingObj = false;
var axCtx;
var transformControl = null;  // Three.js TransformControls gizmo
var snapEnabled = true;
var snapSize = 0.5;

function initThree() {
  var vp = document.getElementById('vp');
  var W = vp.clientWidth, H = vp.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08101e);
  scene.fog = new THREE.FogExp2(0x08101e, 0.012);

  camera = new THREE.PerspectiveCamera(54, W/H, 0.05, 400);
  updateCamera();

  renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  vp.appendChild(renderer.domElement);

  // Lights — richer, more vibrant for kids
  var amb = new THREE.AmbientLight(0x3a4a6a, 1.0);
  scene.add(amb);

  // Key light (warm sun)
  var sun = new THREE.DirectionalLight(0xfff5e8, 1.2);
  sun.position.set(12, 22, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.width = sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -25;
  sun.shadow.camera.right = sun.shadow.camera.top = 25;
  sun.shadow.bias = -0.001;
  sun.shadow.radius = 3; // Softer shadows
  scene.add(sun);

  // Cool fill (blue bounce light)
  var fill = new THREE.DirectionalLight(0x4488ff, 0.45);
  fill.position.set(-12, 6, -10);
  scene.add(fill);

  // Warm rim/back light (orange glow)
  var rim = new THREE.DirectionalLight(0xff7040, 0.3);
  rim.position.set(0, -8, -18);
  scene.add(rim);

  // Top highlight for extra dimension
  var top = new THREE.DirectionalLight(0xffffff, 0.2);
  top.position.set(0, 30, 0);
  scene.add(top);

  // Hemisphere light for natural sky/ground color
  var hemi = new THREE.HemisphereLight(0x8899cc, 0x223344, 0.3);
  scene.add(hemi);

  // Grid — subtle with colored center lines
  var g1 = new THREE.GridHelper(40, 40, 0x1e3050, 0x101c30);
  scene.add(g1);

  // Shadow receiver
  var gm = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.ShadowMaterial({ opacity:0.25 })
  );
  gm.rotation.x = -Math.PI/2;
  gm.receiveShadow = true;
  gm.userData.helper = true;
  scene.add(gm);

  // Axis widget
  var axCanvas = document.getElementById('axwidget');
  axCanvas.width = axCanvas.height = 78;
  axCtx = axCanvas.getContext('2d');

  // Transform Gizmo (Blender-style colored axes)
  if (typeof THREE.TransformControls !== 'undefined') {
    transformControl = new THREE.TransformControls(camera, renderer.domElement);
    transformControl.setSize(1.5);  // Chunky handles for kids
    transformControl.setSpace('world');  // World space is more intuitive
    transformControl.userData.helper = true;
    scene.add(transformControl);

    // Mark all gizmo parts as helpers so raycasting ignores them
    transformControl.traverse(function(c) { c.userData.helper = true; });

    // Disable orbit while dragging gizmo
    transformControl.addEventListener('dragging-changed', function(event) {
      draggingObj = event.value;
    });
    // Update properties panel when gizmo moves object
    transformControl.addEventListener('change', function() {
      if (selectedRoot) updatePropsDisplay();
    });
    // Save undo on gizmo drag start
    transformControl.addEventListener('mouseDown', function() {
      saveUndo();
    });
  }

  setupEvents();
  window.addEventListener('resize', onResize);
  animate();
}

function updateCamera() {
  var r = cam.r, theta = cam.theta, phi = cam.phi;
  camera.position.set(
    camTarget.x + r * Math.sin(phi) * Math.sin(theta),
    camTarget.y + r * Math.cos(phi),
    camTarget.z + r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(camTarget);
  // Required for TransformControls to stay aligned
  camera.updateMatrixWorld(true);
}

function animate() {
  requestAnimationFrame(animate);
  if (selHelper) selHelper.update();
  // Update mirror clones if enabled
  if (typeof updateMirrorClones === 'function' && mirrorEnabled) updateMirrorClones();
  // Keep gizmo synced — detach if object was removed from scene
  if (transformControl) {
    if (transformControl.object && !transformControl.object.parent) {
      transformControl.detach();
      transformControl.visible = false;
    }
  }
  renderer.render(scene, camera);
  drawAxis();
}

function onResize() {
  var vp = document.getElementById('vp');
  var W = vp.clientWidth, H = vp.clientHeight;
  camera.aspect = W/H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
}

// ═══════════════════════════════════════════
// AXIS WIDGET
// ═══════════════════════════════════════════
function drawAxis() {
  if (!axCtx) return;
  var ctx = axCtx, cx=39, cy=39, r=32;
  ctx.clearRect(0,0,78,78);

  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle='rgba(5,8,16,0.75)';
  ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.07)';
  ctx.lineWidth=1;
  ctx.stroke();

  var mv = camera.matrixWorldInverse;
  var ax = [
    {v:new THREE.Vector3(1,0,0), l:'X', c:'#ff6b6b'},
    {v:new THREE.Vector3(0,1,0), l:'Y', c:'#5eff8a'},
    {v:new THREE.Vector3(0,0,1), l:'Z', c:'#7aabff'},
  ].map(function(a) {
    var d = a.v.clone().applyMatrix4(mv);
    return {v:a.v, l:a.l, c:a.c, px:cx+d.x*26, py:cy-d.y*26, nz:d.z<0};
  }).sort(function(a,b){ return a.nz-b.nz ? 1 : -1; });

  ax.forEach(function(a) {
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(a.px,a.py);
    ctx.strokeStyle = a.nz ? a.c+'44' : a.c;
    ctx.lineWidth = a.nz ? 1.5 : 2.5;
    ctx.stroke();
    if (!a.nz) {
      ctx.font='bold 10px Nunito,sans-serif';
      ctx.fillStyle=a.c;
      ctx.fillText(a.l, a.px-4, a.py+4);
    }
  });
}
