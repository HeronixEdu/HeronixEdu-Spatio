// ═══════════════════════════════════════════
// OBJECT REGISTRY
// ═══════════════════════════════════════════
function pushObj(root, type, name, params) {
  objects.push({root:root, type:type, name:name, isHole:false, groupId:null, originalData:null, params:params||{}});
  updateObjCount();
}

function updateObjCount() {
  document.getElementById('obj-count').textContent = objects.length + ' object' + (objects.length!==1?'s':'');
}

// ═══════════════════════════════════════════
// SELECTION (single + multi)
// ═══════════════════════════════════════════
function clearSelectionHelpers() {
  if (selHelper) { scene.remove(selHelper); selHelper = null; }
  selectionHelpers.forEach(function(h) { scene.remove(h); });
  selectionHelpers = [];
}

function selectObj(obj) {
  clearSelectionHelpers();
  selectedObjects = [obj];

  selectedRoot = obj.root;
  selHelper = new THREE.BoxHelper(selectedRoot, 0x00d4ff);
  selHelper.userData.helper = true;
  scene.add(selHelper);

  document.getElementById('no-sel').style.display='none';
  document.getElementById('has-sel').style.display='block';
  updatePropsDisplay();
  updateCSGButtons();
  if (typeof buildParamSliders === 'function') buildParamSliders();
  if (typeof updateMeasurements === 'function') updateMeasurements();
  if (typeof updateDensityCalc === 'function') updateDensityCalc();

  // Attach transform gizmo
  if (typeof transformControl !== 'undefined' && transformControl && mode !== 'select') {
    transformControl.attach(selectedRoot);
    transformControl.visible = true;
  }
}

function toggleMultiSelect(obj) {
  var idx = selectedObjects.indexOf(obj);
  if (idx !== -1) {
    // Remove from selection
    selectedObjects.splice(idx, 1);
  } else {
    selectedObjects.push(obj);
  }

  if (selectedObjects.length === 0) {
    deselect();
    return;
  }

  // Set primary selected to last in list
  selectedRoot = selectedObjects[selectedObjects.length - 1].root;

  // Rebuild helpers
  clearSelectionHelpers();
  selectedObjects.forEach(function(o, i) {
    var color = (i === selectedObjects.length - 1) ? 0x00d4ff : 0xff9f43;
    var helper = new THREE.BoxHelper(o.root, color);
    helper.userData.helper = true;
    scene.add(helper);
    selectionHelpers.push(helper);
  });
  // Set primary helper
  selHelper = selectionHelpers[selectionHelpers.length - 1];

  document.getElementById('no-sel').style.display='none';
  document.getElementById('has-sel').style.display='block';
  updatePropsDisplay();
  updateCSGButtons();
}

function deselect() {
  clearSelectionHelpers();
  selectedRoot = null;
  selectedObjects = [];
  document.getElementById('no-sel').style.display='block';
  document.getElementById('has-sel').style.display='none';
  updateCSGButtons();

  // Detach transform gizmo
  if (typeof transformControl !== 'undefined' && transformControl) {
    transformControl.detach();
    transformControl.visible = false;
  }
}

function updatePropsDisplay() {
  if (!selectedRoot) return;
  var t = selectedRoot;
  var R2D = 180/Math.PI;
  document.getElementById('px').value = t.position.x.toFixed(2);
  document.getElementById('py').value = t.position.y.toFixed(2);
  document.getElementById('pz').value = t.position.z.toFixed(2);
  document.getElementById('rx').value = (t.rotation.x*R2D).toFixed(1);
  document.getElementById('ry').value = (t.rotation.y*R2D).toFixed(1);
  document.getElementById('rz').value = (t.rotation.z*R2D).toFixed(1);
  document.getElementById('sx').value = t.scale.x.toFixed(2);
  document.getElementById('sy').value = t.scale.y.toFixed(2);
  document.getElementById('sz').value = t.scale.z.toFixed(2);
}

function safeFloat(val, fallback) {
  var n = parseFloat(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
}

function applyXform() {
  if (!selectedRoot) return;
  var t = selectedRoot;
  var D2R = Math.PI/180;
  t.position.x = safeFloat(document.getElementById('px').value, 0);
  t.position.y = safeFloat(document.getElementById('py').value, 0);
  t.position.z = safeFloat(document.getElementById('pz').value, 0);
  t.rotation.x = safeFloat(document.getElementById('rx').value, 0) * D2R;
  t.rotation.y = safeFloat(document.getElementById('ry').value, 0) * D2R;
  t.rotation.z = safeFloat(document.getElementById('rz').value, 0) * D2R;
  t.scale.x = Math.max(0.01, safeFloat(document.getElementById('sx').value, 1));
  t.scale.y = Math.max(0.01, safeFloat(document.getElementById('sy').value, 1));
  t.scale.z = Math.max(0.01, safeFloat(document.getElementById('sz').value, 1));
}

function applyColor(hex) {
  if (!selectedRoot || !hex) return;
  var col = new THREE.Color(hex);
  // Apply to all selected objects
  selectedObjects.forEach(function(obj) {
    obj.root.traverse(function(c) {
      if (c.isMesh && !c.userData.helper) c.material.color.set(col);
    });
  });
  document.querySelectorAll('.sw').forEach(function(s){ s.classList.toggle('on', s.dataset.c===hex); });
}

function updateCSGButtons() {
  var holeBtn = document.getElementById('btn-hole');
  if (!holeBtn) return;

  if (selectedObjects.length === 0) {
    holeBtn.textContent = '◉ Solid';
    holeBtn.className = 'abtn btn-hole';
    return;
  }

  // Show hole state of primary selection
  var primary = selectedObjects[selectedObjects.length - 1];
  if (primary && primary.isHole) {
    holeBtn.textContent = '◌ Hole';
    holeBtn.className = 'abtn btn-hole is-hole';
  } else {
    holeBtn.textContent = '◉ Solid';
    holeBtn.className = 'abtn btn-hole';
  }
}
