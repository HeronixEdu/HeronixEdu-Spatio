// ═══════════════════════════════════════════
// FACE PAINTING — Click a face to paint it a different color
// Paint bucket tool for per-face coloring
// ═══════════════════════════════════════════

var paintMode = false;
var paintColor = '#ef4444';

function togglePaintMode() {
  paintMode = !paintMode;
  // Disable ruler if paint is on (mutually exclusive)
  if (paintMode && typeof rulerActive !== 'undefined' && rulerActive) toggleRuler();
  var btn = document.getElementById('btn-paint');
  if (btn) btn.classList.toggle('active', paintMode);

  if (paintMode) {
    showToast('Paint mode ON — click faces to color them!', 'info');
    document.getElementById('vp').style.cursor = 'crosshair';
  } else {
    showToast('Paint mode OFF', 'info');
    document.getElementById('vp').style.cursor = '';
  }
}

function setPaintColor(hex) {
  paintColor = hex;
}

function handlePaintClick(e) {
  if (!paintMode) return false;

  var vp = document.getElementById('vp');
  var rect = vp.getBoundingClientRect();
  var ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );

  var ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);

  var meshes = [];
  objects.forEach(function(o) {
    o.root.traverse(function(c) {
      if (c.isMesh && !c.userData.helper) meshes.push(c);
    });
  });

  var hits = ray.intersectObjects(meshes);
  if (hits.length === 0) return false;

  var hit = hits[0];
  var mesh = hit.object;
  var faceIndex = hit.faceIndex;

  // Convert to per-face vertex colors
  enableVertexColors(mesh);

  // Paint the hit face
  var colors = mesh.geometry.attributes.color;
  var col = new THREE.Color(paintColor);

  if (mesh.geometry.index) {
    // Indexed geometry — paint the 3 vertices of the face
    var idx = mesh.geometry.index;
    var i0 = idx.getX(faceIndex * 3);
    var i1 = idx.getX(faceIndex * 3 + 1);
    var i2 = idx.getX(faceIndex * 3 + 2);
    colors.setXYZ(i0, col.r, col.g, col.b);
    colors.setXYZ(i1, col.r, col.g, col.b);
    colors.setXYZ(i2, col.r, col.g, col.b);
  } else {
    // Non-indexed — direct face vertices
    var base = faceIndex * 3;
    colors.setXYZ(base, col.r, col.g, col.b);
    colors.setXYZ(base + 1, col.r, col.g, col.b);
    colors.setXYZ(base + 2, col.r, col.g, col.b);
  }

  colors.needsUpdate = true;
  return true;
}

/**
 * Enable vertex colors on a mesh (convert from uniform material color)
 */
function enableVertexColors(mesh) {
  if (mesh.geometry.attributes.color) return; // Already has colors

  var pos = mesh.geometry.attributes.position;
  var count = pos.count;
  var colArray = new Float32Array(count * 3);

  // Fill with current material color
  var baseCol = mesh.material.color || new THREE.Color(0xcccccc);
  for (var i = 0; i < count; i++) {
    colArray[i * 3] = baseCol.r;
    colArray[i * 3 + 1] = baseCol.g;
    colArray[i * 3 + 2] = baseCol.b;
  }

  mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colArray, 3));

  // Switch material to use vertex colors (dispose old one)
  var oldMat = mesh.material;
  var oldRoughness = oldMat.roughness || 0.45;
  var oldMetalness = oldMat.metalness || 0.08;
  mesh.material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: oldRoughness,
    metalness: oldMetalness,
  });
  if (oldMat) oldMat.dispose();
}
