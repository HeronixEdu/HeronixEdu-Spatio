// ═══════════════════════════════════════════
// SAVE / LOAD PROJECT (.spatio files)
// ═══════════════════════════════════════════
//
// File format v3 (v1/v2 files still open):
// {
//   format: 'spatio', version: 3, appVersion: '1.0.0',
//   camera: { r, theta, phi, target:[x,y,z] },
//   objects: [{
//     type, name, isHole, visible,
//     position:[x,y,z], rotation:[x,y,z], scale:[x,y,z],   // scale may be negative (mirrored)
//     color:'#rrggbb',                                     // colour before hole see-through look
//     material:{ roughness, metalness, transparent, opacity [, emissive, emissiveIntensity] },
//     params:{...},                                        // slider values / text settings
//     originalData:[{ type, name, isHole, position, rotation, scale, color }],  // groups (Ungroup)
//     mesh: NODE     // only when the shape can't be rebuilt from type + params
//   }],
//   stamps: [...]
// }
// NODE = { geo:{ position:[], normal:[], uv:[], color:[], index:[], groups:[[start,count,mat]] },
//          mat:{ color, roughness, metalness, transparent, opacity, side, vertexColors [, emissive, emissiveIntensity] },
//          p:[x,y,z], r:[x,y,z], s:[x,y,z],   // local transform (child nodes only)
//          visible, children:[NODE] }
// 'normal' is left out when it can be recomputed exactly; geometry floats are rounded.

var SPATIO_FILE_VERSION = 3;
var SPATIO_MAX_OBJECTS = 500;
var SPATIO_MAX_VERTICES = 4000000;   // whole project — guards against huge/corrupt files
var SPATIO_MAX_NODE_DEPTH = 8;

// Shape types addShape() can build from scratch (params re-applied afterwards)
var REBUILDABLE_SHAPES = [
  'box','sphere','cylinder','cone','torus','pyramid','wedge','tube','star','heart','arrow',
  'ring','capsule','prism','halfball','bolt','dodecahedron','icosahedron','octahedron',
  'hexagon','pentagon','roundroof','paraboloid','trapezoid','crescent','diamond','egg',
  'spring','gear'
];

function saveProject() {
  if (!objects.length) { showNoShapesAlert(); return; }

  var json;
  try {
    var project = {
      format: 'spatio',
      version: SPATIO_FILE_VERSION,
      appVersion: '1.0.0',
      camera: { r:cam.r, theta:cam.theta, phi:cam.phi, target:[camTarget.x,camTarget.y,camTarget.z] },
      objects: objects.map(serializeObject),
      stamps: (typeof stampLibrary !== 'undefined') ? stampLibrary : [],
    };
    // Compact JSON — geometry arrays would be huge if pretty-printed
    json = JSON.stringify(project);
  } catch (e) {
    console.error('[Spatio] Could not build project file:', e);
    showSaveError();
    return;
  }
  dl('my_project.spatio', json, 'Project saved!');
}

// ── Save helpers ──

function numOr(v, fallback) {
  return (typeof v === 'number' && isFinite(v)) ? v : fallback;
}

function firstMaterial(mesh) {
  return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
}

// Material settings as the kid chose them (not the temporary hole look)
function serializeMaterial(mesh) {
  var m = firstMaterial(mesh) || {};
  var ud = mesh.userData || {};
  var out = {
    color: m.color ? '#' + m.color.getHexString() : '#29b6f6',
    roughness: numOr(m.roughness, 0.45),
    metalness: numOr(m.metalness, 0.08),
    transparent: ud.isHoleMesh ? !!ud.originalTransparent : !!m.transparent,
    opacity: ud.isHoleMesh ? numOr(ud.originalOpacity, 1) : numOr(m.opacity, 1),
    side: ud.isHoleMesh ? THREE.FrontSide : numOr(m.side, THREE.FrontSide),
    vertexColors: !!m.vertexColors
  };
  if (m.emissive && m.emissive.getHex() !== 0) {
    out.emissive = '#' + m.emissive.getHexString();
    out.emissiveIntensity = numOr(m.emissiveIntensity, 1);
  }
  return out;
}

function packAttribute(attr, factor) {
  var n = attr.count, size = attr.itemSize;
  var getters = ['getX','getY','getZ','getW'];
  var out = new Array(n * size);
  for (var i = 0; i < n; i++) {
    for (var k = 0; k < size; k++) {
      var v = Math.round(attr[getters[k]](i) * factor) / factor;
      out[i * size + k] = (v === 0) ? 0 : v;   // no "-0"
    }
  }
  return out;
}

// True when normals match what computeVertexNormals() would produce (so they can be skipped)
function normalsAreRecomputable(geo) {
  var nor = geo.attributes.normal;
  if (!nor) return true;
  var test = new THREE.BufferGeometry();
  test.setAttribute('position', geo.attributes.position);
  if (geo.index) test.setIndex(geo.index);
  test.computeVertexNormals();
  var ref = test.attributes.normal;
  for (var i = 0; i < nor.count; i++) {
    if (Math.abs(ref.getX(i) - nor.getX(i)) > 1e-3 ||
        Math.abs(ref.getY(i) - nor.getY(i)) > 1e-3 ||
        Math.abs(ref.getZ(i) - nor.getZ(i)) > 1e-3) return false;
  }
  return true;
}

function serializeGeometry(geo) {
  var a = geo.attributes;
  var g = { position: packAttribute(a.position, 1e5) };
  if (a.normal && !normalsAreRecomputable(geo)) g.normal = packAttribute(a.normal, 1e4);
  if (a.uv) g.uv = packAttribute(a.uv, 1e4);
  if (a.color) g.color = packAttribute(a.color, 1e4);
  if (geo.index) g.index = Array.prototype.slice.call(geo.index.array);
  if (geo.groups && geo.groups.length > 1) {
    g.groups = geo.groups.map(function(gr) { return [gr.start, gr.count, gr.materialIndex || 0]; });
  }
  return g;
}

function serializeNode(node, isRoot) {
  var n = {};
  if (!isRoot) {
    n.p = [node.position.x, node.position.y, node.position.z];
    n.r = [node.rotation.x, node.rotation.y, node.rotation.z];
    n.s = [node.scale.x, node.scale.y, node.scale.z];
    if (node.visible === false) n.visible = false;
  }
  if (node.isMesh && node.geometry && node.geometry.attributes.position) {
    n.geo = serializeGeometry(node.geometry);
    n.mat = serializeMaterial(node);
  }
  var kids = [];
  node.children.forEach(function(c) {
    if (c.userData && c.userData.helper) return;
    if (!c.isMesh && !c.isGroup && c.type !== 'Object3D') return;
    kids.push(serializeNode(c, false));
  });
  if (kids.length) n.children = kids;
  return n;
}

// Does this object need its triangles stored? (groups, SVG, painted/smoothed shapes, ...)
function needsMeshData(obj) {
  var modified = false;
  obj.root.traverse(function(c) {
    if (!c.isMesh || c.userData.helper || !c.geometry) return;
    // painted, smoothed, or loaded from stored triangles (keeps e.g. smoothing on re-save)
    if (c.geometry.attributes.color || c.userData.originalGeometry || c.userData.fromSavedMesh) modified = true;
  });
  if (modified) return true;
  if (REBUILDABLE_SHAPES.indexOf(obj.type) !== -1) return false;
  // Unpainted text is rebuilt from its settings — storing letter triangles is very large
  if (obj.type === 'text' && obj.params && typeof obj.params.text === 'string' && obj.params.text) return false;
  return true;
}

function vecArray(v) {
  return v ? [numOr(v.x, 0), numOr(v.y, 0), numOr(v.z, 0)] : [0, 0, 0];
}

function serializeObject(obj) {
  var matInfo = null;
  obj.root.traverse(function(c) {
    if (c.isMesh && !c.userData.helper && matInfo === null) matInfo = serializeMaterial(c);
  });
  var entry = {
    type: obj.type || 'unknown',
    name: obj.name,
    isHole: !!obj.isHole,
    visible: obj.root.visible !== false,
    position: [obj.root.position.x, obj.root.position.y, obj.root.position.z],
    rotation: [obj.root.rotation.x, obj.root.rotation.y, obj.root.rotation.z],
    scale: [obj.root.scale.x, obj.root.scale.y, obj.root.scale.z],
    color: matInfo ? matInfo.color : null,
    params: JSON.parse(JSON.stringify(obj.params || {}))
  };
  if (matInfo) {
    entry.material = { roughness:matInfo.roughness, metalness:matInfo.metalness,
                       transparent:matInfo.transparent, opacity:matInfo.opacity };
    if (matInfo.emissive) {
      entry.material.emissive = matInfo.emissive;
      entry.material.emissiveIntensity = matInfo.emissiveIntensity;
    }
  }
  if (Array.isArray(obj.originalData)) {
    entry.originalData = obj.originalData.map(function(d) {
      return {
        type: d.type, name: d.name, isHole: !!d.isHole,
        position: vecArray(d.position), rotation: vecArray(d.rotation), scale: vecArray(d.scale),
        color: (typeof d.color === 'number') ? d.color : null
      };
    });
  }
  if (needsMeshData(obj)) entry.mesh = serializeNode(obj.root, true);
  return entry;
}

function loadProject() {
  if (window.javaApp && window.javaApp.showOpenDialog) {
    window.javaApp.showOpenDialog().then(function(path) {
      if (!path) return;   // cancelled
      window.javaApp.readFile(path).then(function(content) {
        if (!content) { showProjectLoadError('Could not read file (empty or blocked)'); return; }
        doLoadProject(content);
      });
    });
  } else {
    // Browser fallback: file input
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.spatio';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) { doLoadProject(ev.target.result); };
      reader.onerror = function() { showToast('Could not read file', 'warning'); };
      reader.readAsText(file);
    };
    input.click();
  }
}

function validTriplet(arr) {
  return Array.isArray(arr) && arr.length >= 3 &&
    typeof arr[0] === 'number' && typeof arr[1] === 'number' && typeof arr[2] === 'number' &&
    isFinite(arr[0]) && isFinite(arr[1]) && isFinite(arr[2]);
}

// ── Load helpers ──

function clampNum(v, min, max, fallback) {
  if (typeof v !== 'number' || !isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function parseSavedColor(c) {
  if (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)) return new THREE.Color(c);
  if (typeof c === 'number' && isFinite(c) && c >= 0 && c <= 0xffffff) return new THREE.Color(c);
  return null;
}

// Copy only simple values; clamp slider values to the slider range (stops giant geometry)
function sanitizeParams(type, params) {
  var out = {};
  if (!params || typeof params !== 'object' || Array.isArray(params)) return out;
  Object.keys(params).forEach(function(k) {
    var v = params[k];
    if (typeof v === 'number' && isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') out[k] = v.substring(0, 100);
  });
  var sliders = (typeof SHAPE_SLIDERS !== 'undefined') ? SHAPE_SLIDERS[type] : null;
  if (sliders) {
    sliders.forEach(function(def) {
      if (typeof out[def.key] === 'number') out[def.key] = clampNum(out[def.key], def.min, def.max, def.min);
    });
  }
  return out;
}

function readNumArray(arr, itemSize, expectedCount) {
  if (!Array.isArray(arr) || arr.length === 0 || arr.length % itemSize !== 0) return null;
  if (expectedCount !== undefined && arr.length !== expectedCount * itemSize) return null;
  for (var i = 0; i < arr.length; i++) {
    if (typeof arr[i] !== 'number' || !isFinite(arr[i])) return null;
  }
  return arr;
}

function deserializeGeometry(g, budget) {
  if (!g || typeof g !== 'object') throw new Error('missing geometry');
  var pos = readNumArray(g.position, 3);
  if (!pos) throw new Error('bad position data');
  var count = pos.length / 3;
  budget.vertices += count;
  if (budget.vertices > SPATIO_MAX_VERTICES) throw new Error('project geometry too large');

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  var nor = g.normal ? readNumArray(g.normal, 3, count) : null;
  if (nor) geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  var uv = g.uv ? readNumArray(g.uv, 2, count) : null;
  if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  var col = g.color ? readNumArray(g.color, 3, count) : null;
  if (col) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (g.index) {
    var idx = readNumArray(g.index, 3);
    if (!idx) throw new Error('bad index data');
    for (var i = 0; i < idx.length; i++) {
      if (idx[i] < 0 || idx[i] >= count || Math.floor(idx[i]) !== idx[i]) throw new Error('bad index value');
    }
    geo.setIndex(idx);
  }
  if (Array.isArray(g.groups)) {
    g.groups.forEach(function(gr) {
      if (Array.isArray(gr) && gr.length >= 2 && isFinite(gr[0]) && isFinite(gr[1])) {
        geo.addGroup(gr[0], gr[1], isFinite(gr[2]) ? gr[2] : 0);
      }
    });
  }
  if (!nor) geo.computeVertexNormals();
  return geo;
}

function deserializeMaterial(m, hasVertexColors) {
  m = (m && typeof m === 'object') ? m : {};
  var side = THREE.FrontSide;
  if (m.side === THREE.DoubleSide) side = THREE.DoubleSide;
  else if (m.side === THREE.BackSide) side = THREE.BackSide;
  var opts = {
    color: parseSavedColor(m.color) || new THREE.Color(0x29b6f6),
    roughness: clampNum(m.roughness, 0, 1, 0.45),
    metalness: clampNum(m.metalness, 0, 1, 0.08),
    transparent: !!m.transparent,
    opacity: clampNum(m.opacity, 0, 1, 1),
    side: side
  };
  if (m.vertexColors && hasVertexColors) opts.vertexColors = true;
  var mat = new THREE.MeshStandardMaterial(opts);
  var em = parseSavedColor(m.emissive);
  if (em) {
    mat.emissive = em;
    mat.emissiveIntensity = clampNum(m.emissiveIntensity, 0, 10, 1);
  }
  return mat;
}

function buildNode(n, budget, depth) {
  if (!n || typeof n !== 'object') throw new Error('bad mesh node');
  if (depth > SPATIO_MAX_NODE_DEPTH) throw new Error('mesh nested too deep');
  var node;
  if (n.geo) {
    var geo = deserializeGeometry(n.geo, budget);
    node = new THREE.Mesh(geo, deserializeMaterial(n.mat, !!geo.attributes.color));
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData.fromSavedMesh = true;
  } else {
    node = new THREE.Group();
  }
  if (validTriplet(n.p)) node.position.set(n.p[0], n.p[1], n.p[2]);
  if (validTriplet(n.r)) node.rotation.set(n.r[0], n.r[1], n.r[2]);
  if (validTriplet(n.s)) node.scale.set(n.s[0], n.s[1], n.s[2]);
  if (n.visible === false) node.visible = false;
  if (Array.isArray(n.children)) {
    n.children.forEach(function(c) { node.add(buildNode(c, budget, depth + 1)); });
  }
  return node;
}

function lastAddedSince(prevLen) {
  if (objects.length <= prevLen) throw new Error('shape was not created');
  return objects[objects.length - 1];
}

// Shape with stored triangles — registered through the same path as other creators
function restoreMeshObject(data, budget) {
  var root = buildNode(data.mesh, budget, 0);
  var hasMesh = false;
  root.traverse(function(c) { if (c.isMesh) hasMesh = true; });
  if (!hasMesh) throw new Error('no geometry in mesh data');
  placeObj(root, 0);
  pushObj(root, data.type, data.type, sanitizeParams(data.type, data.params));
  return objects[objects.length - 1];
}

function restoreText(data) {
  var p = sanitizeParams('text', data.params);
  var txt = (typeof p.text === 'string' ? p.text : '').trim().substring(0, 30).replace(/[<>]/g, '');
  if (!txt) throw new Error('text object without text');
  var prevLen = objects.length;
  addText(txt);
  var obj = lastAddedSince(prevLen);
  var fontOk = (typeof FONT_INLINE_DATA !== 'undefined') && FONT_INLINE_DATA[p.font];
  obj.params = {
    text: txt,
    font: fontOk ? p.font : obj.params.font,
    size: clampNum(p.size, 0.1, 20, obj.params.size),
    depth: clampNum(p.depth, 0.05, 10, obj.params.depth),
    bevel: (typeof p.bevel === 'boolean') ? p.bevel : obj.params.bevel
  };
  rebuildTextGeometry(obj);
  return obj;
}

function restorePrimitive(data) {
  var prevLen = objects.length;
  addShape(data.type);
  var obj = lastAddedSince(prevLen);
  var params = sanitizeParams(data.type, data.params);
  if (Object.keys(params).length) {
    obj.params = params;
    if (typeof SHAPE_SLIDERS !== 'undefined' && SHAPE_SLIDERS[data.type]) rebuildShapeGeometry(obj);
  }
  return obj;
}

// Colour + material for shapes rebuilt from type/params (mesh data carries its own)
function applySavedColor(obj, data) {
  var col = parseSavedColor(data.color);
  if (!col) return;
  var m = (data.material && typeof data.material === 'object') ? data.material : null;
  var em = m ? parseSavedColor(m.emissive) : null;
  obj.root.traverse(function(c) {
    if (!c.isMesh || c.userData.helper) return;
    c.material.color.set(col);
    if (m) {
      c.material.roughness = clampNum(m.roughness, 0, 1, 0.45);
      c.material.metalness = clampNum(m.metalness, 0, 1, 0.08);
      c.material.transparent = !!m.transparent;
      c.material.opacity = clampNum(m.opacity, 0, 1, 1);
      if (m.transparent) c.material.side = THREE.DoubleSide;
      if (em) {
        c.material.emissive = em.clone();
        c.material.emissiveIntensity = clampNum(m.emissiveIntensity, 0, 10, 1);
      }
      c.material.needsUpdate = true;
    }
  });
}

function restoreOriginalData(list) {
  if (!Array.isArray(list)) return null;
  var out = [];
  list.forEach(function(d) {
    if (!d || typeof d.type !== 'string' ||
        !validTriplet(d.position) || !validTriplet(d.rotation) || !validTriplet(d.scale)) return;
    out.push({
      type: d.type,
      name: typeof d.name === 'string' ? d.name.substring(0, 100) : d.type,
      isHole: !!d.isHole,
      position: new THREE.Vector3(d.position[0], d.position[1], d.position[2]),
      rotation: new THREE.Euler(d.rotation[0], d.rotation[1], d.rotation[2]),
      scale: new THREE.Vector3(d.scale[0], d.scale[1], d.scale[2]),
      color: (typeof d.color === 'number' && isFinite(d.color)) ? d.color : null
    });
  });
  return out.length ? out : null;
}

// Build one saved object. Throws if it can't be restored.
function restoreObject(data, budget) {
  var obj;
  if (data.mesh) {
    obj = restoreMeshObject(data, budget);
  } else if (data.type === 'text') {
    obj = restoreText(data);
    applySavedColor(obj, data);
  } else if (data.type === 'letter') {
    // v1 files: single letters
    var prevLen = objects.length;
    addLetter(String(data.name || 'Letter A').replace('Letter ', '').substring(0, 30));
    obj = lastAddedSince(prevLen);
    applySavedColor(obj, data);
  } else if (REBUILDABLE_SHAPES.indexOf(data.type) !== -1) {
    obj = restorePrimitive(data);
    applySavedColor(obj, data);
  } else {
    // e.g. groups / SVG saved by an older version, which didn't store their shape
    throw new Error('no shape data for type "' + data.type + '"');
  }

  if (typeof data.name === 'string' && data.name) obj.name = data.name.substring(0, 100);
  obj.root.position.set(data.position[0], data.position[1], data.position[2]);
  obj.root.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
  obj.root.scale.set(data.scale[0], data.scale[1], data.scale[2]);
  obj.root.visible = data.visible !== false;
  obj.originalData = restoreOriginalData(data.originalData);
  obj.isHole = !!data.isHole;
  if (obj.isHole) applyHoleAppearance(obj);
  return obj;
}

// Remove everything from the current scene (and undo history) before loading
function resetSceneForLoad() {
  if (typeof transformControl !== 'undefined' && transformControl) {
    transformControl.detach();
    transformControl.visible = false;
  }
  var all = objects.slice();
  undoStack.forEach(function(s) {
    (s.objectRefs || []).forEach(function(o) { if (all.indexOf(o) === -1) all.push(o); });
  });
  all.forEach(function(o) {
    scene.remove(o.root);
    if (typeof disposeObject === 'function') disposeObject(o.root);
  });
  objects = [];
  clearSelectionHelpers();
  selHelper = null;
  selectedRoot = null;
  selectedObjects = [];
  undoStack = [];
  if (typeof placeCounter !== 'undefined') placeCounter = 0;
  if (typeof removeAllMirrorClones === 'function') removeAllMirrorClones();
  if (typeof clearRulerLines === 'function') clearRulerLines();
  if (typeof crossSectionEnabled !== 'undefined' && crossSectionEnabled) toggleCrossSection();
}

function doLoadProject(jsonStr) {
  try {
    var project = JSON.parse(jsonStr);
    if (!project || typeof project !== 'object' || !Array.isArray(project.objects)) {
      showProjectLoadError('Invalid project file format.');
      return;
    }
    var version = (project.version === undefined) ? 1 : project.version;   // v1 had no version field
    if (typeof version === 'number' && version > SPATIO_FILE_VERSION) {
      spatioAlert('🆕', 'Newer project file',
        'This file was saved by a newer Spatio Studio.\nUpdate the app to open it.');
      return;
    }
    if (version !== 1 && version !== 2 && version !== 3) {
      showProjectLoadError('Unsupported project version: ' + version);
      return;
    }
    // SECURITY: Limit number of objects to prevent DoS
    if (project.objects.length > SPATIO_MAX_OBJECTS) {
      showProjectLoadError('Project has too many objects (' + project.objects.length + '). Maximum is ' + SPATIO_MAX_OBJECTS + '.');
      return;
    }

    resetSceneForLoad();

    // Restore camera
    if (project.camera) {
      cam.r = clampNum(project.camera.r, 0.5, 200, 22);
      cam.theta = numOr(project.camera.theta, -0.55);
      cam.phi = clampNum(project.camera.phi, 0.01, Math.PI - 0.01, 1.05);
      if (validTriplet(project.camera.target)) {
        camTarget.set(project.camera.target[0], project.camera.target[1], project.camera.target[2]);
      }
      updateCamera();
    }

    // Recreate objects — per-entry guarded so one bad object doesn't abort the whole load
    var failed = [];
    var budget = { vertices: 0 };
    project.objects.forEach(function(data, i) {
      var label = (data && typeof data.name === 'string' && data.name) ? data.name.substring(0, 40)
                : (data && typeof data.type === 'string') ? data.type : 'Shape #' + (i + 1);
      if (!data || typeof data.type !== 'string' ||
          !validTriplet(data.position) || !validTriplet(data.rotation) || !validTriplet(data.scale)) {
        failed.push(label);
        return;
      }
      var prevLen = objects.length;
      try {
        restoreObject(data, budget);
      } catch(objErr) {
        // Roll back any partial add from this entry so the scene stays consistent
        console.error('[Spatio] Could not restore "' + label + '":', objErr);
        while (objects.length > prevLen) {
          var bad = objects.pop();
          scene.remove(bad.root);
          if (typeof disposeObject === 'function') disposeObject(bad.root);
        }
        failed.push(label);
      }
    });

    // Restore stamps if saved
    if (Array.isArray(project.stamps) && project.stamps.length > 0 && typeof stampLibrary !== 'undefined') {
      stampLibrary = project.stamps;
      if (typeof updateStampUI === 'function') updateStampUI();
    }

    // Loading must not be undoable piece by piece — start with a clean history
    undoStack = [];
    deselect();
    updateObjCount();
    if (failed.length > 0) {
      var list = failed.slice(0, 6).map(function(n) { return '• ' + n; }).join('\n');
      if (failed.length > 6) list += '\n…and ' + (failed.length - 6) + ' more';
      showToast('Project loaded — ' + objects.length + ' objects (' + failed.length + ' could not be restored)', 'warning');
      spatioAlert('⚠️', 'Some shapes couldn\'t be opened',
        'Loaded ' + objects.length + ' shape' + (objects.length !== 1 ? 's' : '') + '.\n' +
        failed.length + ' shape' + (failed.length !== 1 ? 's' : '') + ' couldn\'t be restored:\n\n' + list);
    } else {
      showToast('Project loaded! Keep creating!', 'success');
    }

  } catch(e) {
    showProjectLoadError(e.message);
    console.error(e);
  }
}

// ═══════════════════════════════════════════
// SCREENSHOT
// ═══════════════════════════════════════════
function takeScreenshot() {
  // Render one frame with preserveDrawingBuffer
  renderer.render(scene, camera);
  var dataUrl = renderer.domElement.toDataURL('image/png');

  // For JavaBridge, send the PNG data URL (Java decodes it to binary);
  // for browser, trigger a download straight from the data URL
  if (window.javaApp && window.javaApp.downloadFile) {
    dl('spatio_screenshot.png', dataUrl, 'Screenshot saved!');
  } else {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'spatio_screenshot.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
}

// ═══════════════════════════════════════════
// EXPORT — STL, OBJ, GLTF
// ═══════════════════════════════════════════
function getAllGeos() {
  var geos = [];
  objects.forEach(function(obj) {
    obj.root.updateWorldMatrix(true, true);
    obj.root.traverse(function(c) {
      if (!c.isMesh || c.userData.helper) return;
      var geo = c.geometry.clone();
      geo.applyMatrix4(c.matrixWorld);
      geos.push(geo.index ? geo.toNonIndexed() : geo);
    });
  });
  return geos;
}

function exportSTL() {
  if (!objects.length) { showNoShapesAlert(); return; }
  var geos = getAllGeos();
  var stl = 'solid SpatioStudio\n';
  geos.forEach(function(geo) {
    geo.computeVertexNormals();
    var pos = geo.attributes.position;
    var nor = geo.attributes.normal;
    for (var i=0; i<pos.count; i+=3) {
      var nx=(nor.getX(i)+nor.getX(i+1)+nor.getX(i+2))/3;
      var ny=(nor.getY(i)+nor.getY(i+1)+nor.getY(i+2))/3;
      var nz=(nor.getZ(i)+nor.getZ(i+1)+nor.getZ(i+2))/3;
      stl+='  facet normal '+nx.toFixed(6)+' '+ny.toFixed(6)+' '+nz.toFixed(6)+'\n    outer loop\n';
      for(var j=0;j<3;j++) stl+='      vertex '+pos.getX(i+j).toFixed(6)+' '+pos.getY(i+j).toFixed(6)+' '+pos.getZ(i+j).toFixed(6)+'\n';
      stl+='    endloop\n  endfacet\n';
    }
  });
  stl += 'endsolid SpatioStudio\n';
  dl('spatio_model.stl', stl, 'STL exported — ready for 3D printing!');
}

function exportOBJ() {
  if (!objects.length) { showNoShapesAlert(); return; }
  var geos = getAllGeos();
  var out='# Spatio Studio Model\n# Units: Three.js units\n\n';
  var vo=1;
  geos.forEach(function(geo,gi) {
    geo.computeVertexNormals();
    var pos=geo.attributes.position, nor=geo.attributes.normal;
    out+='o Object_'+(gi+1)+'\n';
    for(var i=0;i<pos.count;i++) out+='v '+pos.getX(i).toFixed(6)+' '+pos.getY(i).toFixed(6)+' '+pos.getZ(i).toFixed(6)+'\n';
    for(var i=0;i<nor.count;i++) out+='vn '+nor.getX(i).toFixed(6)+' '+nor.getY(i).toFixed(6)+' '+nor.getZ(i).toFixed(6)+'\n';
    for(var i=0;i<pos.count;i+=3){var a=vo+i,b=vo+i+1,c2=vo+i+2;out+='f '+a+'//'+a+' '+b+'//'+b+' '+c2+'//'+c2+'\n';}
    vo+=pos.count; out+='\n';
  });
  dl('spatio_model.obj', out, 'OBJ exported!');
}

function exportGLTF() {
  if (!objects.length) { showNoShapesAlert(); return; }
  // Build a temporary scene with just user objects
  var exportScene = new THREE.Scene();
  objects.forEach(function(obj) {
    exportScene.add(obj.root.clone(true));
  });
  var exporter = new THREE.GLTFExporter();
  exporter.parse(exportScene, function(result) {
    var output = JSON.stringify(result, null, 2);
    dl('spatio_model.gltf', output, 'GLTF exported — share in AR!');
  }, { binary: false });
}

function showSaveError() {
  spatioAlert('😟', 'Couldn\'t save',
    'Your file was NOT saved.\n\nTry saving again, and pick a different folder\n(like Documents) or a different file name.');
}

function dl(name, content, successMsg) {
  // Use JavaBridge if available (standalone app), otherwise fallback to blob URL.
  // Bridge contract: resolves with the saved path ('' = user cancelled), rejects on failure.
  if (window.javaApp && window.javaApp.downloadFile) {
    window.javaApp.downloadFile(name, content).then(function(savedPath) {
      if (typeof savedPath === 'string' && savedPath.length > 0) {
        // Show saved location — filename only for privacy, folder name only
        var folder = savedPath.replace(/\\/g, '/');
        var fileName = folder.split('/').pop();
        var dirParts = folder.substring(0, folder.lastIndexOf('/')).split('/');
        var shortDir = dirParts.length > 1 ? dirParts[dirParts.length - 1] : dirParts[0];
        // spatioAlert escapes the message itself
        spatioAlert('💾', 'Saved!',
          (successMsg || 'File saved successfully!') +
          '\n\n📄 File: ' + fileName +
          '\n📁 Folder: ' + shortDir
        );
      }
      // If empty — user cancelled, no message
    }, function(err) {
      console.error('[Spatio] Save failed:', err);
      showSaveError();
    });
  } else {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content],{type:'text/plain'}));
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast(successMsg || 'File saved!', 'success');
  }
}
