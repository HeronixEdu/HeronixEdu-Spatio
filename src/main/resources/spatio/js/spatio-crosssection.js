// ═══════════════════════════════════════════
// CROSS-SECTION VIEWER — Slice shapes with a visible clipping plane
// Shows what 2D shape you get when cutting through a 3D object
// ═══════════════════════════════════════════

var crossSectionEnabled = false;
var clipPlane = null;
var clipHeight = 0.5;
var clipAxis = 'y';
var slicePlaneHelper = null; // Visible plane mesh

function toggleCrossSection() {
  crossSectionEnabled = !crossSectionEnabled;
  var btn = document.getElementById('btn-xsection');
  if (btn) btn.classList.toggle('active', crossSectionEnabled);

  if (crossSectionEnabled) {
    if (!clipPlane) {
      clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    }
    renderer.localClippingEnabled = true;
    applyCrossSection();
    showToast('Cross-section ON — drag the slider to slice!', 'info');
  } else {
    renderer.localClippingEnabled = false;
    removeSlicePlane();
    // Remove clipping from all materials
    objects.forEach(function(obj) {
      obj.root.traverse(function(c) {
        if (c.isMesh && c.material) {
          c.material.clippingPlanes = [];
          c.material.clipShadows = false;
          c.material.side = THREE.FrontSide;
          c.material.needsUpdate = true;
        }
      });
    });
    updateCrossSectionInfo();
    showToast('Cross-section OFF', 'info');
  }
}

function setCrossAxis(axis) {
  clipAxis = axis;
  // Update axis button highlights
  document.querySelectorAll('.xaxis-btn').forEach(function(b) { b.classList.remove('active'); });
  var active = document.querySelector('.xaxis-btn-' + axis);
  if (active) active.classList.add('active');
  if (crossSectionEnabled) applyCrossSection();
}

function setCrossHeight(val) {
  clipHeight = parseFloat(val);
  if (crossSectionEnabled) applyCrossSection();
}

function createSlicePlane(center, size, cutPos) {
  removeSlicePlane();

  var planeSize = Math.max(size.x, size.y, size.z) * 1.5 + 2;
  var geo = new THREE.PlaneGeometry(planeSize, planeSize);
  var mat = new THREE.MeshBasicMaterial({
    color: 0x29b6f6,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  slicePlaneHelper = new THREE.Mesh(geo, mat);
  slicePlaneHelper.userData.helper = true;

  // Position and orient based on axis
  switch(clipAxis) {
    case 'x':
      slicePlaneHelper.rotation.y = Math.PI / 2;
      slicePlaneHelper.position.set(cutPos, center.y, center.z);
      break;
    case 'y':
      slicePlaneHelper.rotation.x = -Math.PI / 2;
      slicePlaneHelper.position.set(center.x, cutPos, center.z);
      break;
    case 'z':
      slicePlaneHelper.position.set(center.x, center.y, cutPos);
      break;
  }

  // Add edge ring for visibility
  var edgeGeo = new THREE.RingGeometry(planeSize * 0.48, planeSize * 0.5, 64);
  var edgeMat = new THREE.MeshBasicMaterial({
    color: 0x29b6f6,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  var edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.userData.helper = true;
  slicePlaneHelper.add(edge);

  scene.add(slicePlaneHelper);
}

function removeSlicePlane() {
  if (slicePlaneHelper) {
    scene.remove(slicePlaneHelper);
    // Dispose all children (edge ring) + parent geometry/materials
    if (typeof disposeObject === 'function') disposeObject(slicePlaneHelper);
    slicePlaneHelper = null;
  }
}

function applyCrossSection() {
  if (!clipPlane) return;

  var center = new THREE.Vector3(0, 2, 0);
  var size = new THREE.Vector3(10, 10, 10);
  var extentMin = -5, extentMax = 10;

  if (selectedRoot) {
    var box = new THREE.Box3().setFromObject(selectedRoot);
    box.getCenter(center);
    box.getSize(size);
    switch(clipAxis) {
      case 'x': extentMin = box.min.x - 0.1; extentMax = box.max.x + 0.1; break;
      case 'y': extentMin = box.min.y - 0.1; extentMax = box.max.y + 0.1; break;
      case 'z': extentMin = box.min.z - 0.1; extentMax = box.max.z + 0.1; break;
    }
  }

  var cutPos = extentMin + (extentMax - extentMin) * clipHeight;

  switch(clipAxis) {
    case 'x': clipPlane.normal.set(-1, 0, 0); clipPlane.constant = cutPos; break;
    case 'y': clipPlane.normal.set(0, -1, 0); clipPlane.constant = cutPos; break;
    case 'z': clipPlane.normal.set(0, 0, -1); clipPlane.constant = cutPos; break;
  }

  // Show visible slice plane
  createSlicePlane(center, size, cutPos);

  // Apply clipping to all mesh materials
  objects.forEach(function(obj) {
    obj.root.traverse(function(c) {
      if (c.isMesh && c.material && !c.userData.helper) {
        c.material.clippingPlanes = [clipPlane];
        c.material.clipShadows = true;
        c.material.side = THREE.DoubleSide;
        c.material.needsUpdate = true;
      }
    });
  });

  updateCrossSectionInfo();
}

function calcCrossSectionArea(obj, cutPos) {
  // Estimate cross-section area based on shape type and cut position
  if (!obj || !selectedRoot) return 0;

  var box = new THREE.Box3().setFromObject(selectedRoot);
  var size = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(new THREE.Vector3());

  var s = UNIT_SCALE[currentUnit] || 1;

  switch(obj.type) {
    case 'box':
      // Rectangle cross-section
      if (clipAxis === 'y') return size.x * size.z * s * s;
      if (clipAxis === 'x') return size.y * size.z * s * s;
      return size.x * size.y * s * s;

    case 'sphere':
      // Circle cross-section — radius depends on where you cut
      var R = Math.max(size.x, size.y, size.z) / 2;
      var d = Math.abs(cutPos - (box.min[clipAxis] + box.max[clipAxis]) / 2);
      var r = Math.sqrt(Math.max(0, R*R - d*d));
      return Math.PI * r * r * s * s;

    case 'cylinder':
      if (clipAxis === 'y') {
        var r = Math.max(size.x, size.z) / 2;
        return Math.PI * r * r * s * s;
      }
      return size.y * Math.max(size.x, size.z) * s * s;

    case 'cone':
      if (clipAxis === 'y') {
        var t = (cutPos - box.min.y) / size.y;
        var r = (Math.max(size.x, size.z) / 2) * (1 - t);
        return Math.PI * r * r * s * s;
      }
      return 0.5 * size.y * Math.max(size.x, size.z) * s * s;

    default:
      return 0;
  }
}

function updateCrossSectionInfo() {
  var info = document.getElementById('xsection-info');
  if (!info) return;

  if (!crossSectionEnabled) {
    info.innerHTML = '<div class="meas-empty">Enable cross-section to see inside shapes</div>';
    return;
  }

  if (!selectedRoot || selectedObjects.length !== 1) {
    info.innerHTML = '<div class="meas-empty">Select a shape to see cross-section details</div>';
    return;
  }

  var obj = selectedObjects[0];
  var label = UNIT_LABELS[currentUnit] || 'cm';
  var csShape = '?', csInfo = '';

  switch(obj.type) {
    case 'box':
      csShape = 'Rectangle';
      csInfo = 'Cutting a box always gives a rectangle (or square)!';
      break;
    case 'sphere':
      csShape = 'Circle';
      csInfo = 'Cutting a sphere ALWAYS gives a circle, no matter the angle! The circle is biggest at the center.';
      break;
    case 'cylinder':
      csShape = clipAxis === 'y' ? 'Circle' : 'Rectangle';
      csInfo = clipAxis === 'y' ? 'Horizontal cut gives a circle' : 'Vertical cut gives a rectangle';
      break;
    case 'cone':
      csShape = clipAxis === 'y' ? 'Circle (varies)' : 'Triangle';
      csInfo = clipAxis === 'y' ? 'Horizontal cuts give circles — smaller near the tip!' : 'Vertical cut gives a triangle!';
      break;
    case 'torus':
      csShape = clipAxis === 'y' ? 'Two circles' : 'Oval / Ring';
      csInfo = 'A donut cut in half shows two circles!';
      break;
    case 'pyramid':
      csShape = clipAxis === 'y' ? 'Square (shrinking)' : 'Triangle';
      csInfo = clipAxis === 'y' ? 'Horizontal cuts give smaller squares higher up' : 'Vertical cut gives a triangle';
      break;
    default:
      csShape = 'Complex shape';
      csInfo = 'Try different axes and slider positions!';
  }

  // Calculate cross-section area
  var box = new THREE.Box3().setFromObject(selectedRoot);
  var extentMin, extentMax;
  switch(clipAxis) {
    case 'x': extentMin = box.min.x; extentMax = box.max.x; break;
    case 'y': extentMin = box.min.y; extentMax = box.max.y; break;
    case 'z': extentMin = box.min.z; extentMax = box.max.z; break;
  }
  var cutPos = extentMin + (extentMax - extentMin) * clipHeight;
  var area = calcCrossSectionArea(obj, cutPos);

  var html =
    '<div class="meas-section">' +
      '<div class="meas-title">&#9986; Cross-Section Result</div>' +
      '<div class="meas-result">' + csShape + '</div>' +
      '<p style="font-size:11px;color:#7a9ab8;margin-top:4px">' + csInfo + '</p>' +
    '</div>';

  if (area > 0) {
    html +=
      '<div class="meas-section">' +
        '<div class="meas-title">&#x1f4d0; Cross-Section Area</div>' +
        '<div class="meas-formula">A = calculated from shape at cut position</div>' +
        '<div class="meas-result">' + area.toFixed(2) + ' ' + label + '&#178;</div>' +
      '</div>';
  }

  html +=
    '<div class="meas-section">' +
      '<div class="meas-title">&#x1f52c; Did You Know?</div>' +
      '<p style="font-size:11px;color:#7a9ab8;line-height:1.6">' +
        getCrossSectionFact(obj.type) +
      '</p>' +
    '</div>';

  info.innerHTML = html;
}

function getCrossSectionFact(type) {
  var facts = {
    sphere: 'MRI and CT scanners work by taking cross-sections of your body &#8212; hundreds of circle-shaped "slices" that computers combine into a 3D image!',
    cylinder: 'Engineers use cross-sections to calculate how strong a beam or pipe is. The shape of the cross-section determines how much weight it can hold!',
    cone: 'The ancient Greeks discovered that cutting a cone at different angles gives you circles, ellipses, parabolas, and hyperbolas &#8212; the "conic sections" used in math for 2000+ years!',
    box: 'Architects draw cross-section views of buildings to show what the inside looks like. These are called "section drawings."',
    torus: 'If you cut a bagel perfectly in half with one cut (like a M&#246;bius strip path), you can get two interlocked rings!',
    pyramid: 'The Great Pyramid of Giza has a square cross-section at the base that\'s 230 meters on each side &#8212; that\'s over 2 football fields!',
  };
  return facts[type] || 'Cross-sections help engineers, doctors, and scientists understand the inside of 3D objects without cutting them apart!';
}
