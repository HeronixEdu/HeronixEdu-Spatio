// ═══════════════════════════════════════════
// ARRAY / PATTERN TOOL — Duplicate in lines, grids, circles
// ═══════════════════════════════════════════

/**
 * Create a linear array (like a fence or staircase)
 */
function arrayLinear(count, spacingX, spacingY, spacingZ) {
  if (!selectedRoot || selectedObjects.length !== 1 || !objects.length) {
    showToast('Select a shape first!', 'warning'); return;
  }
  count = count || 5;
  spacingX = spacingX || 2;
  spacingY = spacingY || 0;
  spacingZ = spacingZ || 0;

  saveUndo();
  var src = selectedObjects[0];
  var created = 0;

  for (var i = 1; i < count; i++) {
    var clone = src.root.clone(true);
    clone.position.x += spacingX * i;
    clone.position.y += spacingY * i;
    clone.position.z += spacingZ * i;
    clone.traverse(function(c) { if(c.isMesh) { c.castShadow=true; c.receiveShadow=true; } });
    scene.add(clone);
    objects.push({
      root: clone, type: src.type,
      name: src.name + ' [' + (i+1) + ']',
      isHole: false, groupId: null, originalData: null,
      params: Object.assign({}, src.params || {})
    });
    created++;
  }

  updateObjCount();
  showToast('Linear array: ' + created + ' copies!', 'success');
}

/**
 * Create a grid array (like floor tiles)
 */
function arrayGrid(cols, rows, spacingX, spacingZ) {
  if (!selectedRoot || selectedObjects.length !== 1) {
    showToast('Select a shape first!', 'warning'); return;
  }
  cols = cols || 3; rows = rows || 3;
  spacingX = spacingX || 2.5; spacingZ = spacingZ || 2.5;

  saveUndo();
  var src = selectedObjects[0];
  var created = 0;

  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue; // Skip original position
      var clone = src.root.clone(true);
      clone.position.x += spacingX * c;
      clone.position.z += spacingZ * r;
      clone.traverse(function(ch) { if(ch.isMesh) { ch.castShadow=true; ch.receiveShadow=true; } });
      scene.add(clone);
      objects.push({
        root: clone, type: src.type,
        name: src.name + ' [' + r + ',' + c + ']',
        isHole: false, groupId: null, originalData: null,
        params: Object.assign({}, src.params || {})
      });
      created++;
    }
  }

  updateObjCount();
  showToast('Grid array: ' + created + ' copies!', 'success');
}

/**
 * Create a circular array (like wheel spokes or clock numbers)
 */
function arrayCircular(count, radius) {
  if (!selectedRoot || selectedObjects.length !== 1) {
    showToast('Select a shape first!', 'warning'); return;
  }
  count = count || 8;
  radius = radius || 4;

  saveUndo();
  var src = selectedObjects[0];
  var centerX = src.root.position.x;
  var centerZ = src.root.position.z;
  var created = 0;

  for (var i = 1; i < count; i++) {
    var angle = (i / count) * Math.PI * 2;
    var clone = src.root.clone(true);
    clone.position.x = centerX + Math.cos(angle) * radius;
    clone.position.z = centerZ + Math.sin(angle) * radius;
    clone.rotation.y = -angle; // Face outward
    clone.traverse(function(c) { if(c.isMesh) { c.castShadow=true; c.receiveShadow=true; } });
    scene.add(clone);
    objects.push({
      root: clone, type: src.type,
      name: src.name + ' [' + (i+1) + '/' + count + ']',
      isHole: false, groupId: null, originalData: null,
      params: Object.assign({}, src.params || {})
    });
    created++;
  }

  // Also move original to first position in the circle
  src.root.position.x = centerX + radius;
  src.root.position.z = centerZ;

  updateObjCount();
  showToast('Circular array: ' + count + ' shapes in a ring!', 'success');
}

/**
 * Show the array options modal
 */
function showArrayDialog() {
  if (!selectedRoot || selectedObjects.length !== 1) {
    showToast('Select a shape first!', 'warning'); return;
  }
  showModal({
    icon: '🔢',
    title: 'Array / Pattern',
    message: 'Choose a pattern to duplicate the selected shape:',
    buttons: [
      { label: '📏 Line (5)', cls:'modal-btn-quiz', value:'linear' },
      { label: '⊞ Grid (3×3)', cls:'modal-btn-quiz', value:'grid' },
      { label: '⭕ Circle (8)', cls:'modal-btn-quiz', value:'circle' },
    ],
    onResult: function(val) {
      if (val === 'linear') arrayLinear(5, 2.5, 0, 0);
      else if (val === 'grid') arrayGrid(3, 3, 2.5, 2.5);
      else if (val === 'circle') arrayCircular(8, 5);
    }
  });
}
