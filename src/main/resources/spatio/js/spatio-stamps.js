// ═══════════════════════════════════════════
// STAMP LIBRARY — Save and reuse custom shapes
// ═══════════════════════════════════════════

var stampLibrary = []; // {name, type, params, colorHex, geometry JSON}

/**
 * Save the selected object as a stamp
 */
function saveAsStamp() {
  if (!selectedRoot || selectedObjects.length !== 1) {
    showToast('Select a shape to save as stamp!', 'warning'); return;
  }

  var obj = selectedObjects[0];
  var colorHex = '#29b6f6';
  obj.root.traverse(function(c) {
    if (c.isMesh && !c.userData.helper) {
      colorHex = '#' + c.material.color.getHexString();
    }
  });

  var name = sanitizeHTML((obj.name || 'Shape') + ' Stamp').substring(0, 30);

  stampLibrary.push({
    name: name,
    type: obj.type,
    params: Object.assign({}, obj.params || {}),
    color: colorHex,
    scale: { x:obj.root.scale.x, y:obj.root.scale.y, z:obj.root.scale.z },
    rotation: { x:obj.root.rotation.x, y:obj.root.rotation.y, z:obj.root.rotation.z },
  });

  updateStampUI();
  showToast('Stamp saved: "' + name + '" (' + stampLibrary.length + ' stamps)', 'success');
}

/**
 * Place a stamp from the library into the scene
 */
function placeStamp(index) {
  if (index >= stampLibrary.length) return;
  var stamp = stampLibrary[index];

  saveUndo();

  // Recreate the shape
  if (stamp.type === 'text') {
    addText(stamp.params.text || 'Stamp');
  } else {
    addShape(stamp.type);
  }

  if (objects.length > 0) {
    var obj = objects[objects.length - 1];
    obj.name = stamp.name;

    // Apply color
    var col = new THREE.Color(stamp.color);
    obj.root.traverse(function(c) {
      if (c.isMesh && !c.userData.helper) c.material.color.set(col);
    });

    // Apply scale and rotation
    if (stamp.scale) {
      obj.root.scale.set(stamp.scale.x, stamp.scale.y, stamp.scale.z);
    }
    if (stamp.rotation) {
      obj.root.rotation.set(stamp.rotation.x, stamp.rotation.y, stamp.rotation.z);
    }

    selectObj(obj);
  }

  showToast('Placed stamp: "' + stamp.name + '"', 'success');
}

/**
 * Delete a stamp from the library
 */
function deleteStamp(index) {
  var name = stampLibrary[index].name;
  stampLibrary.splice(index, 1);
  updateStampUI();
  showToast('Stamp "' + name + '" deleted', 'info');
}

/**
 * Update the stamp library UI in the left panel
 */
function updateStampUI() {
  var container = document.getElementById('stamp-list');
  if (!container) return;

  if (stampLibrary.length === 0) {
    container.innerHTML = '<div style="font-size:10px;color:var(--dim);padding:4px">No stamps yet. Select a shape and click "Save as Stamp".</div>';
    return;
  }

  container.innerHTML = '';
  stampLibrary.forEach(function(stamp, idx) {
    var row = document.createElement('div');
    row.className = 'stamp-row';

    var swatch = document.createElement('div');
    swatch.className = 'stamp-swatch';
    swatch.style.background = stamp.color;

    var name = document.createElement('span');
    name.className = 'stamp-name';
    name.textContent = stamp.name;

    var addBtn = document.createElement('button');
    addBtn.className = 'stamp-add';
    addBtn.textContent = '+';
    addBtn.title = 'Place stamp';
    addBtn.onclick = function(e) { e.stopPropagation(); placeStamp(idx); };

    var delBtn = document.createElement('button');
    delBtn.className = 'stamp-del';
    delBtn.textContent = '×';
    delBtn.title = 'Delete stamp';
    delBtn.onclick = function(e) { e.stopPropagation(); deleteStamp(idx); };

    row.appendChild(swatch);
    row.appendChild(name);
    row.appendChild(addBtn);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

