// ═══════════════════════════════════════════
// EDUCATION ENGINE — Live measurements, formulas, unit conversion
// Shows real math on selected objects so kids learn by doing
// ═══════════════════════════════════════════

var currentUnit = 'cm';   // Default display unit
var UNIT_SCALE = { mm:10, cm:1, inches:0.3937, feet:0.03281 };
var UNIT_LABELS = { mm:'mm', cm:'cm', inches:'in', feet:'ft' };

function setDisplayUnit(u) {
  currentUnit = u;
  updateMeasurements();
  showToast('Units: ' + UNIT_LABELS[u], 'info');
}

/**
 * Calculate volume from actual mesh triangles (works for ANY geometry including CSG/hollow)
 * Uses the divergence theorem: sum signed volumes of tetrahedra from each face to origin
 */
function calcMeshVolume(root) {
  var totalVol = 0;
  var totalSA = 0;
  root.updateWorldMatrix(true, true);
  root.traverse(function(c) {
    if (!c.isMesh || c.userData.helper) return;
    var geo = c.geometry;
    if (!geo) return;
    var cloned = geo.index ? geo.toNonIndexed() : geo;
    var pos = cloned.attributes.position;
    if (!pos) return;

    // Apply world transform
    var mat4 = c.matrixWorld;
    var va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();

    for (var i = 0; i < pos.count; i += 3) {
      va.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat4);
      vb.set(pos.getX(i+1), pos.getY(i+1), pos.getZ(i+1)).applyMatrix4(mat4);
      vc.set(pos.getX(i+2), pos.getY(i+2), pos.getZ(i+2)).applyMatrix4(mat4);

      // Signed volume of tetrahedron (triangle + origin)
      totalVol += (va.x*(vb.y*vc.z - vc.y*vb.z) - vb.x*(va.y*vc.z - vc.y*va.z) + vc.x*(va.y*vb.z - vb.y*va.z)) / 6.0;

      // Triangle area for surface area
      var ab = new THREE.Vector3().subVectors(vb, va);
      var ac = new THREE.Vector3().subVectors(vc, va);
      totalSA += ab.cross(ac).length() / 2.0;
    }
  });
  return { volume: Math.abs(totalVol), surfaceArea: totalSA };
}

/**
 * Calculate and display measurements for the selected object
 */
function updateMeasurements() {
  var container = document.getElementById('measurements');
  if (!container) return;

  if (!selectedRoot || selectedObjects.length !== 1) {
    container.innerHTML = '<div class="meas-empty">Select a shape to see measurements</div>';
    return;
  }

  var obj = selectedObjects[0];
  var s = UNIT_SCALE[currentUnit];
  var label = UNIT_LABELS[currentUnit];

  // Get bounding box for dimensions
  var box = new THREE.Box3().setFromObject(selectedRoot);
  var size = new THREE.Vector3();
  box.getSize(size);

  var w = size.x * s;
  var h = size.y * s;
  var d = size.z * s;

  // Calculate ACTUAL volume from mesh geometry (works for hollow/CSG too)
  var meshCalc = calcMeshVolume(selectedRoot);
  var volume = meshCalc.volume * s * s * s;     // scale³ for volume
  var surfaceArea = meshCalc.surfaceArea * s * s; // scale² for area

  // Determine which formula to show
  var formula = '', saFormula = '';
  var isHollow = (obj.type === 'group');

  switch(obj.type) {
    case 'box':
      formula = 'V = W × H × D';
      saFormula = 'SA = 2(WH + HD + WD)';
      break;
    case 'sphere':
      formula = 'V = ⁴⁄₃ × π × r³';
      saFormula = 'SA = 4 × π × r²';
      break;
    case 'cylinder':
      formula = 'V = π × r² × h';
      saFormula = 'SA = 2πr(r + h)';
      break;
    case 'cone':
      formula = 'V = ⅓ × π × r² × h';
      saFormula = 'SA = πr(r + slant)';
      break;
    case 'pyramid':
      formula = 'V = ⅓ × base × h';
      saFormula = 'SA = base + sides';
      break;
    case 'torus':
      formula = 'V = 2π²Rr²';
      saFormula = 'SA = 4π²Rr';
      break;
    case 'group':
      formula = 'V = mesh calculation (hollow/combined)';
      saFormula = 'SA = mesh calculation';
      break;
    default:
      formula = 'V = mesh calculation';
      saFormula = 'SA = mesh calculation';
      break;
  }

  var html =
    '<div class="meas-unit-row">' +
      '<span class="meas-label">Display Units</span>' +
      '<div class="meas-unit-btns">' +
        '<button class="meas-ubtn' + (currentUnit==='mm'?' active':'') + '" onclick="setDisplayUnit(\'mm\')">mm</button>' +
        '<button class="meas-ubtn' + (currentUnit==='cm'?' active':'') + '" onclick="setDisplayUnit(\'cm\')">cm</button>' +
        '<button class="meas-ubtn' + (currentUnit==='inches'?' active':'') + '" onclick="setDisplayUnit(\'inches\')">in</button>' +
        '<button class="meas-ubtn' + (currentUnit==='feet'?' active':'') + '" onclick="setDisplayUnit(\'feet\')">ft</button>' +
      '</div>' +
    '</div>' +

    '<div class="meas-section">' +
      '<div class="meas-title">📏 Dimensions</div>' +
      '<div class="meas-grid">' +
        '<span class="meas-dim-label" style="color:#ff8888">Width (X)</span><span class="meas-val">' + w.toFixed(2) + ' ' + label + '</span>' +
        '<span class="meas-dim-label" style="color:#5eff8a">Height (Y)</span><span class="meas-val">' + h.toFixed(2) + ' ' + label + '</span>' +
        '<span class="meas-dim-label" style="color:#7aabff">Depth (Z)</span><span class="meas-val">' + d.toFixed(2) + ' ' + label + '</span>' +
      '</div>' +
    '</div>' +

    '<div class="meas-section">' +
      '<div class="meas-title">📐 Volume' + (isHollow ? ' (hollow shape!)' : '') + '</div>' +
      '<div class="meas-formula">' + formula + '</div>' +
      '<div class="meas-result">' + volume.toFixed(2) + ' ' + label + '³</div>' +
      (currentUnit === 'cm' ? '<div class="meas-conv-row">💧 Liquid capacity: ' + volume.toFixed(1) + ' mL (' + (volume/236.6).toFixed(2) + ' cups)</div>' : '') +
      (currentUnit === 'mm' ? '<div class="meas-conv-row">💧 Liquid capacity: ' + (volume/1000).toFixed(2) + ' mL</div>' : '') +
    '</div>' +

    '<div class="meas-section">' +
      '<div class="meas-title">📄 Surface Area</div>' +
      '<div class="meas-formula">' + saFormula + '</div>' +
      '<div class="meas-result">' + surfaceArea.toFixed(2) + ' ' + label + '²</div>' +
    '</div>' +

    '<div class="meas-section">' +
      '<div class="meas-title">🔄 Unit Conversions</div>' +
      '<div class="meas-conv">' +
        fmtConv(w, 'Width') +
        fmtConv(h, 'Height') +
      '</div>' +
    '</div>';

  container.innerHTML = html;
}

function fmtConv(valInCurrentUnit, dimName) {
  // Convert from current unit back to cm, then to all units
  var cm = valInCurrentUnit / UNIT_SCALE[currentUnit];
  var mm = cm * 10;
  var inches = cm * 0.3937;
  var frac = toFraction(inches);
  return '<div class="meas-conv-row">' +
    '<span class="meas-conv-dim">' + dimName + ':</span> ' +
    mm.toFixed(1) + ' mm = ' +
    cm.toFixed(2) + ' cm = ' +
    inches.toFixed(3) + ' in' +
    (frac ? ' ≈ ' + frac + ' in' : '') +
  '</div>';
}

/**
 * Convert decimal inches to nearest fraction (1/16 precision)
 */
function toFraction(dec) {
  var whole = Math.floor(dec);
  var remainder = dec - whole;
  if (remainder < 0.03) return whole > 0 ? whole + '' : null;

  var best = '', bestDiff = 1;
  var denoms = [2, 4, 8, 16];
  for (var i = 0; i < denoms.length; i++) {
    var d = denoms[i];
    var n = Math.round(remainder * d);
    if (n === 0) continue;
    if (n === d) { whole++; return whole + ''; }
    var diff = Math.abs(remainder - n/d);
    if (diff < bestDiff) {
      bestDiff = diff;
      // Simplify fraction
      var gcd = gcdFn(n, d);
      best = (whole > 0 ? whole + ' ' : '') + (n/gcd) + '/' + (d/gcd);
    }
  }
  return best || null;
}

function gcdFn(a, b) { return b === 0 ? a : gcdFn(b, a % b); }
