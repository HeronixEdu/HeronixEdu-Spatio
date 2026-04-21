// ═══════════════════════════════════════════
// ALIGN & DISTRIBUTE — Position multiple objects precisely
// ═══════════════════════════════════════════

function alignObjects(axis, mode) {
  // axis: 'x','y','z'  mode: 'min','center','max'
  if (selectedObjects.length < 2) {
    showToast('Select 2+ shapes to align (Shift+Click)', 'warning'); return;
  }

  saveUndo();

  // Get bounding boxes for all selected
  var boxes = selectedObjects.map(function(obj) {
    var box = new THREE.Box3().setFromObject(obj.root);
    return { obj:obj, box:box };
  });

  // Find the target value
  var target;
  if (mode === 'min') {
    target = Infinity;
    boxes.forEach(function(b) { target = Math.min(target, b.box.min[axis]); });
  } else if (mode === 'max') {
    target = -Infinity;
    boxes.forEach(function(b) { target = Math.max(target, b.box.max[axis]); });
  } else { // center
    var allMin = Infinity, allMax = -Infinity;
    boxes.forEach(function(b) {
      allMin = Math.min(allMin, b.box.min[axis]);
      allMax = Math.max(allMax, b.box.max[axis]);
    });
    target = (allMin + allMax) / 2;
  }

  // Apply alignment
  boxes.forEach(function(b) {
    var center = new THREE.Vector3();
    b.box.getCenter(center);
    var size = new THREE.Vector3();
    b.box.getSize(size);

    var offset;
    if (mode === 'min') offset = target - b.box.min[axis];
    else if (mode === 'max') offset = target - b.box.max[axis];
    else offset = target - center[axis];

    b.obj.root.position[axis] += offset;
  });

  updatePropsDisplay();
  var labels = {x:'X',y:'Y',z:'Z'};
  var modes = {min:'Left/Bottom',center:'Center',max:'Right/Top'};
  showToast('Aligned ' + selectedObjects.length + ' shapes: ' + labels[axis] + ' ' + modes[mode], 'success');
}

function distributeObjects(axis) {
  if (selectedObjects.length < 3) {
    showToast('Select 3+ shapes to distribute', 'warning'); return;
  }

  saveUndo();

  // Sort by position on the axis
  var sorted = selectedObjects.slice().sort(function(a, b) {
    return a.root.position[axis] - b.root.position[axis];
  });

  var first = sorted[0].root.position[axis];
  var last = sorted[sorted.length - 1].root.position[axis];
  var spacing = (last - first) / (sorted.length - 1);

  sorted.forEach(function(obj, i) {
    obj.root.position[axis] = first + spacing * i;
  });

  updatePropsDisplay();
  var labels = {x:'X',y:'Y',z:'Z'};
  showToast('Distributed ' + sorted.length + ' shapes evenly on ' + labels[axis], 'success');
}

/**
 * Show align/distribute dialog
 */
function showAlignDialog() {
  if (selectedObjects.length < 2) {
    showToast('Select 2+ shapes to align (Shift+Click)', 'warning'); return;
  }
  showModal({
    icon: '📐',
    title: 'Align & Distribute (' + selectedObjects.length + ' shapes)',
    message: 'Choose alignment:',
    buttons: [
      { label: '⬅ Align Left (X)', cls:'modal-btn-quiz', value:'x-min' },
      { label: '↔ Center X', cls:'modal-btn-quiz', value:'x-center' },
      { label: '⬆ Align Top (Y)', cls:'modal-btn-quiz', value:'y-max' },
      { label: '↕ Center Y', cls:'modal-btn-quiz', value:'y-center' },
    ],
    onResult: function(val) {
      if (!val) return;
      var parts = val.split('-');
      alignObjects(parts[0], parts[1]);
    }
  });
}

/**
 * Frame selected — zoom camera to fit the selected object
 */
function frameSelected() {
  if (!selectedRoot) {
    // Frame all objects
    if (objects.length === 0) return;
    var allBox = new THREE.Box3();
    objects.forEach(function(o) { allBox.expandByObject(o.root); });
    var center = new THREE.Vector3();
    var size = new THREE.Vector3();
    allBox.getCenter(center);
    allBox.getSize(size);
    camTarget.copy(center);
    cam.r = Math.max(size.x, size.y, size.z) * 2;
  } else {
    var box = new THREE.Box3().setFromObject(selectedRoot);
    var center = new THREE.Vector3();
    var size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    camTarget.copy(center);
    cam.r = Math.max(size.x, size.y, size.z) * 3 + 2;
  }
  updateCamera();
  showToast('Camera framed!', 'info');
}

/**
 * Reset camera to default position
 */
function resetCamera() {
  camTarget.set(0, 0, 0);
  cam.r = 22;
  cam.theta = -0.55;
  cam.phi = 1.05;
  updateCamera();
  showToast('Camera reset', 'info');
}
