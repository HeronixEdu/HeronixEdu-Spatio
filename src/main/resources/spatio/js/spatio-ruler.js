// ═══════════════════════════════════════════
// RULER / DISTANCE MEASUREMENT TOOL
// Click two points to measure distance
// ═══════════════════════════════════════════

var rulerActive = false;
var rulerPoints = [];
var rulerLines = [];

function toggleRuler() {
  rulerActive = !rulerActive;
  // Disable paint if ruler is on (mutually exclusive)
  if (rulerActive && typeof paintMode !== 'undefined' && paintMode) togglePaintMode();
  var btn = document.getElementById('btn-ruler');
  if (btn) btn.classList.toggle('active', rulerActive);

  if (rulerActive) {
    rulerPoints = [];
    showToast('Ruler ON — click two objects to measure distance', 'info');
  } else {
    clearRulerLines();
    showToast('Ruler OFF', 'info');
  }
}

function handleRulerClick(e) {
  if (!rulerActive) return false;

  var hit = raycastObjects(e);
  if (!hit) return false;

  var point = hit.point.clone();
  rulerPoints.push(point);

  if (rulerPoints.length === 2) {
    drawRulerLine(rulerPoints[0], rulerPoints[1]);
    rulerPoints = [];
  } else {
    showToast('First point set — click second object', 'info');
  }

  return true; // Consumed the click
}

function drawRulerLine(a, b) {
  // Cap at 20 measurements to prevent memory leak
  if (rulerLines.length > 60) { // 3 objects per measurement × 20
    var oldest = rulerLines.splice(0, 3);
    oldest.forEach(function(o) { scene.remove(o); if(o.geometry)o.geometry.dispose(); if(o.material)o.material.dispose(); });
  }
  var dist = a.distanceTo(b);
  var s = UNIT_SCALE[currentUnit] || 1;
  var label = UNIT_LABELS[currentUnit] || 'cm';

  // Line geometry
  var geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  var mat = new THREE.LineBasicMaterial({ color: 0xffc744, linewidth: 2, depthTest: false });
  var line = new THREE.Line(geo, mat);
  line.userData.helper = true;
  line.renderOrder = 999;
  scene.add(line);

  // Endpoint markers
  var dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
  var dotMat = new THREE.MeshBasicMaterial({ color: 0xffc744, depthTest: false });
  var dot1 = new THREE.Mesh(dotGeo, dotMat);
  var dot2 = new THREE.Mesh(dotGeo, dotMat);
  dot1.position.copy(a); dot2.position.copy(b);
  dot1.userData.helper = true; dot2.userData.helper = true;
  dot1.renderOrder = 999; dot2.renderOrder = 999;
  scene.add(dot1); scene.add(dot2);

  rulerLines.push(line, dot1, dot2);

  // Show measurement
  var distScaled = dist * s;
  spatioAlert('📏', 'Distance Measured',
    'Distance: ' + distScaled.toFixed(2) + ' ' + label +
    '\n\nPoint A: (' + (a.x*s).toFixed(1) + ', ' + (a.y*s).toFixed(1) + ', ' + (a.z*s).toFixed(1) + ') ' + label +
    '\nPoint B: (' + (b.x*s).toFixed(1) + ', ' + (b.y*s).toFixed(1) + ', ' + (b.z*s).toFixed(1) + ') ' + label
  );
}

function clearRulerLines() {
  rulerLines.forEach(function(obj) {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  rulerLines = [];
  rulerPoints = [];
}
