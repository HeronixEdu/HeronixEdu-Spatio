// ═══════════════════════════════════════════
// SUBDIVISION / SMOOTH MODIFIER
// Subdivides mesh faces and smooths vertices
// Non-destructive — stores original geometry for reversal
// ═══════════════════════════════════════════

/**
 * Subdivide a BufferGeometry by splitting each triangle into 4
 */
function subdivideGeometry(geo) {
  if (geo.index) geo = geo.toNonIndexed();

  var pos = geo.attributes.position;
  var newPositions = [];

  for (var i = 0; i < pos.count; i += 3) {
    var a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    var b = new THREE.Vector3(pos.getX(i+1), pos.getY(i+1), pos.getZ(i+1));
    var c = new THREE.Vector3(pos.getX(i+2), pos.getY(i+2), pos.getZ(i+2));

    // Midpoints
    var ab = a.clone().add(b).multiplyScalar(0.5);
    var bc = b.clone().add(c).multiplyScalar(0.5);
    var ca = c.clone().add(a).multiplyScalar(0.5);

    // 4 new triangles
    pushTri(newPositions, a, ab, ca);
    pushTri(newPositions, ab, b, bc);
    pushTri(newPositions, ca, bc, c);
    pushTri(newPositions, ab, bc, ca);
  }

  var newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  newGeo.computeVertexNormals();
  return newGeo;
}

function pushTri(arr, a, b, c) {
  arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

/**
 * Smooth a BufferGeometry by averaging vertex positions with neighbors
 * Uses Laplacian smoothing
 */
function smoothGeometry(geo, factor) {
  factor = factor || 0.5;
  if (geo.index) geo = geo.toNonIndexed();

  var pos = geo.attributes.position;
  var count = pos.count;

  // Build adjacency: for each vertex, find neighbors sharing a triangle
  var neighbors = {};
  for (var i = 0; i < count; i += 3) {
    var idxs = [i, i+1, i+2];
    idxs.forEach(function(a) {
      var key = posKey(pos, a);
      if (!neighbors[key]) neighbors[key] = [];
      idxs.forEach(function(b) {
        if (a !== b) {
          var nk = posKey(pos, b);
          if (neighbors[key].indexOf(nk) === -1) neighbors[key].push(nk);
        }
      });
    });
  }

  // Build position lookup
  var posMap = {};
  for (var i = 0; i < count; i++) {
    var key = posKey(pos, i);
    if (!posMap[key]) posMap[key] = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
  }

  // Compute smoothed positions
  var smoothed = {};
  Object.keys(posMap).forEach(function(key) {
    var p = posMap[key];
    var nbs = neighbors[key] || [];
    if (nbs.length === 0) { smoothed[key] = p.clone(); return; }

    var avg = new THREE.Vector3();
    nbs.forEach(function(nk) {
      if (posMap[nk]) avg.add(posMap[nk]);
    });
    avg.divideScalar(nbs.length);
    smoothed[key] = p.clone().lerp(avg, factor);
  });

  // Apply smoothed positions
  var newPos = new Float32Array(count * 3);
  for (var i = 0; i < count; i++) {
    var key = posKey(pos, i);
    var sp = smoothed[key] || new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    newPos[i*3] = sp.x;
    newPos[i*3+1] = sp.y;
    newPos[i*3+2] = sp.z;
  }

  var newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
  newGeo.computeVertexNormals();
  return newGeo;
}

function posKey(pos, idx) {
  return pos.getX(idx).toFixed(4) + ',' + pos.getY(idx).toFixed(4) + ',' + pos.getZ(idx).toFixed(4);
}

/**
 * Apply subdivision + smoothing to the selected object
 * levels: 1-3 subdivisions, smoothFactor: 0-1
 */
function applySubdivide(levels, smoothFactor) {
  if (!selectedRoot || selectedObjects.length !== 1) {
    showToast('Select a shape first!', 'warning');
    return;
  }

  var obj = selectedObjects[0];
  if (!obj.root.isMesh) {
    // For groups, try the first mesh child
    var firstMesh = null;
    obj.root.traverse(function(c) { if (c.isMesh && !firstMesh) firstMesh = c; });
    if (!firstMesh) { showToast('Cannot smooth this shape', 'warning'); return; }
  }

  saveUndo();

  obj.root.traverse(function(c) {
    if (!c.isMesh || c.userData.helper) return;

    // Store original geometry for undo
    if (!c.userData.originalGeometry) {
      c.userData.originalGeometry = c.geometry.clone();
    }

    var geo = c.userData.originalGeometry.clone();

    // Subdivide (cap at 50,000 faces to prevent freeze)
    var MAX_FACES = 50000;
    for (var i = 0; i < (levels || 1); i++) {
      var faceCount = geo.attributes.position.count / 3;
      if (faceCount * 4 > MAX_FACES) {
        showToast('Max faces reached (' + faceCount + '). Cannot subdivide further.', 'warning');
        break;
      }
      geo = subdivideGeometry(geo);
    }

    // Smooth
    if (smoothFactor > 0) {
      for (var s = 0; s < 2; s++) {
        geo = smoothGeometry(geo, smoothFactor);
      }
    }

    c.geometry.dispose();
    c.geometry = geo;
  });

  if (selHelper) selHelper.update();
  showToast('Smoothed! (' + levels + 'x subdivide, ' + (smoothFactor*100).toFixed(0) + '% smooth)', 'success');
}

/**
 * Reset shape to original (unsmoothed) geometry
 */
function resetSubdivide() {
  if (!selectedRoot || selectedObjects.length !== 1) return;

  selectedRoot.traverse(function(c) {
    if (c.isMesh && c.userData.originalGeometry) {
      c.geometry.dispose();
      c.geometry = c.userData.originalGeometry.clone();
      delete c.userData.originalGeometry;
    }
  });

  if (selHelper) selHelper.update();
  showToast('Shape reset to original', 'info');
}
