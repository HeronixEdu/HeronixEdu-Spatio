// ═══════════════════════════════════════════
// SHAPE PARAMETER SYSTEM (OpenSCAD Customizer-style)
// Each shape type has editable geometry parameters with sliders
// ═══════════════════════════════════════════

// Default params for each shape type
var SHAPE_DEFAULTS = {
  box:      { width:2, height:2, depth:2 },
  sphere:   { radius:1.2, segments:36 },
  cylinder: { radius:0.9, height:2.5, segments:36 },
  cone:     { radius:1.1, height:2.5, segments:36 },
  torus:    { radius:1.1, tube:0.38, segments:54 },
  pyramid:  { radius:1.3, height:2.5 },
  capsule:  { radius:0.65, bodyHeight:1.6 },
  ring:     { radius:1.3, tube:0.22, segments:54 },
};

// Slider definitions per shape type: {label, key, min, max, step}
var SHAPE_SLIDERS = {
  box: [
    { label:'Width',  key:'width',  min:0.2, max:10, step:0.1 },
    { label:'Height', key:'height', min:0.2, max:10, step:0.1 },
    { label:'Depth',  key:'depth',  min:0.2, max:10, step:0.1 },
  ],
  sphere: [
    { label:'Radius',   key:'radius',   min:0.2, max:5, step:0.1 },
    { label:'Smoothness', key:'segments', min:8, max:64, step:4 },
  ],
  cylinder: [
    { label:'Radius', key:'radius', min:0.1, max:5, step:0.1 },
    { label:'Height', key:'height', min:0.2, max:10, step:0.1 },
    { label:'Smoothness', key:'segments', min:6, max:64, step:2 },
  ],
  cone: [
    { label:'Radius', key:'radius', min:0.2, max:5, step:0.1 },
    { label:'Height', key:'height', min:0.2, max:10, step:0.1 },
    { label:'Smoothness', key:'segments', min:6, max:64, step:2 },
  ],
  torus: [
    { label:'Ring Radius', key:'radius', min:0.3, max:5, step:0.1 },
    { label:'Tube Radius', key:'tube',   min:0.05, max:2, step:0.05 },
    { label:'Smoothness',  key:'segments', min:12, max:64, step:4 },
  ],
  pyramid: [
    { label:'Base Size', key:'radius', min:0.3, max:5, step:0.1 },
    { label:'Height',    key:'height', min:0.2, max:10, step:0.1 },
  ],
  capsule: [
    { label:'Radius',      key:'radius',     min:0.1, max:3, step:0.05 },
    { label:'Body Height',  key:'bodyHeight', min:0.2, max:8, step:0.1 },
  ],
  ring: [
    { label:'Ring Radius', key:'radius', min:0.3, max:5, step:0.1 },
    { label:'Thickness',   key:'tube',   min:0.05, max:1, step:0.05 },
    { label:'Smoothness',  key:'segments', min:12, max:64, step:4 },
  ],
};

/**
 * Build the parameter sliders panel for the currently selected object
 */
function buildParamSliders() {
  var container = document.getElementById('param-sliders');
  if (!container) return;
  container.innerHTML = '';

  if (selectedObjects.length !== 1) return;
  var obj = selectedObjects[0];
  var sliders = SHAPE_SLIDERS[obj.type];
  if (!sliders) return;

  // Ensure params exist on the object
  if (!obj.params || Object.keys(obj.params).length === 0) {
    obj.params = Object.assign({}, SHAPE_DEFAULTS[obj.type] || {});
  }

  sliders.forEach(function(def) {
    var row = document.createElement('div');
    row.className = 'param-row';

    var label = document.createElement('label');
    label.className = 'param-label';
    label.textContent = def.label;

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'param-slider';
    slider.min = def.min;
    slider.max = def.max;
    slider.step = def.step;
    slider.value = obj.params[def.key] || def.min;

    var valDisplay = document.createElement('span');
    valDisplay.className = 'param-val';
    valDisplay.textContent = parseFloat(slider.value).toFixed(1);

    slider.oninput = function() {
      valDisplay.textContent = parseFloat(slider.value).toFixed(1);
      obj.params[def.key] = parseFloat(slider.value);
      rebuildShapeGeometry(obj);
    };

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(valDisplay);
    container.appendChild(row);
  });
}

/**
 * Rebuild a shape's geometry from its stored params
 */
function rebuildShapeGeometry(obj) {
  var p = obj.params;
  if (!p) return;

  var newGeo = null;
  switch(obj.type) {
    case 'box':
      newGeo = new THREE.BoxGeometry(p.width||2, p.height||2, p.depth||2);
      break;
    case 'sphere':
      newGeo = new THREE.SphereGeometry(p.radius||1.2, p.segments||36, p.segments||36);
      break;
    case 'cylinder':
      newGeo = new THREE.CylinderGeometry(p.radius||0.9, p.radius||0.9, p.height||2.5, p.segments||36);
      break;
    case 'cone':
      newGeo = new THREE.ConeGeometry(p.radius||1.1, p.height||2.5, p.segments||36);
      break;
    case 'torus':
      newGeo = new THREE.TorusGeometry(p.radius||1.1, p.tube||0.38, 18, p.segments||54);
      break;
    case 'pyramid':
      newGeo = new THREE.ConeGeometry(p.radius||1.3, p.height||2.5, 4);
      break;
    case 'ring':
      newGeo = new THREE.TorusGeometry(p.radius||1.3, p.tube||0.22, 18, p.segments||54);
      break;
    default:
      return; // Can't rebuild complex shapes (extruded, groups, letters)
  }

  if (newGeo && obj.root.isMesh) {
    obj.root.geometry.dispose();
    obj.root.geometry = newGeo;
    // Update selection helper
    if (selHelper) selHelper.update();
  } else if (newGeo && obj.type === 'capsule') {
    // Capsule is a group — rebuild children
    rebuildCapsule(obj, p);
  }
}

function rebuildCapsule(obj, p) {
  var r = p.radius || 0.65;
  var bh = p.bodyHeight || 1.6;
  // Remove old children
  while(obj.root.children.length) {
    var c = obj.root.children[0];
    if (c.geometry) c.geometry.dispose();
    obj.root.remove(c);
  }
  // Rebuild
  var color = 0x29b6f6;
  var body = new THREE.Mesh(new THREE.CylinderGeometry(r,r,bh,30), stdMat(new THREE.Color(color)));
  var capT = new THREE.Mesh(new THREE.SphereGeometry(r,30,30), stdMat(new THREE.Color(color)));
  var capB = capT.clone();
  capT.position.y = bh/2; capB.position.y = -bh/2;
  body.castShadow=true; body.receiveShadow=true;
  capT.castShadow=true; capT.receiveShadow=true;
  capB.castShadow=true; capB.receiveShadow=true;
  obj.root.add(body,capT,capB);
  if (selHelper) selHelper.update();
}

// ═══════════════════════════════════════════
// MIRROR / FLIP
// ═══════════════════════════════════════════
function mirrorX() {
  if (!selectedRoot) return;
  saveUndo();
  selectedRoot.scale.x *= -1;
  updatePropsDisplay();
}
function mirrorY() {
  if (!selectedRoot) return;
  saveUndo();
  selectedRoot.scale.y *= -1;
  updatePropsDisplay();
}
function mirrorZ() {
  if (!selectedRoot) return;
  saveUndo();
  selectedRoot.scale.z *= -1;
  updatePropsDisplay();
}
