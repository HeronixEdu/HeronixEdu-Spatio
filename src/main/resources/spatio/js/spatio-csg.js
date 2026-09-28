// ═══════════════════════════════════════════
// CSG — Constructive Solid Geometry
// Solid/Hole toggle, Group (boolean union/subtract), Ungroup
// ═══════════════════════════════════════════

/**
 * Toggle the selected object(s) between Solid and Hole.
 * Holes subtract from solids when grouped.
 */
function toggleHoleSelected() {
  if (selectedObjects.length === 0) return;
  saveUndo();

  selectedObjects.forEach(function(obj) {
    obj.isHole = !obj.isHole;
    applyHoleAppearance(obj);
  });

  updateCSGButtons();
}

/**
 * Apply the visual appearance for hole/solid state
 */
function applyHoleAppearance(obj) {
  obj.root.traverse(function(c) {
    if (!c.isMesh || c.userData.helper) return;

    if (obj.isHole) {
      // Store original color if not already stored
      if (!c.userData.originalColor) {
        c.userData.originalColor = c.material.color.getHex();
        c.userData.originalOpacity = c.material.opacity;
        c.userData.originalTransparent = c.material.transparent;
      }
      c.material = new THREE.MeshStandardMaterial({
        color: c.userData.originalColor,
        roughness: 0.45,
        metalness: 0.08,
        transparent: true,
        opacity: 0.35,
        wireframe: false,
        side: THREE.DoubleSide
      });
      // Add striped overlay via userData flag
      c.userData.isHoleMesh = true;
    } else {
      // Restore original appearance
      var origColor = c.userData.originalColor || 0x29b6f6;
      c.material = new THREE.MeshStandardMaterial({
        color: origColor,
        roughness: 0.45,
        metalness: 0.08
      });
      c.userData.isHoleMesh = false;
      delete c.userData.originalColor;
      delete c.userData.originalOpacity;
      delete c.userData.originalTransparent;
    }
  });
}

/**
 * Group selected objects using CSG boolean operations.
 * Solids are unioned together, then holes are subtracted.
 */
function groupSelected() {
  if (selectedObjects.length < 2) {
    showGroupNeedMore();
    return;
  }

  var solids = selectedObjects.filter(function(o) { return !o.isHole; });
  var holes = selectedObjects.filter(function(o) { return o.isHole; });

  if (solids.length === 0) {
    showGroupNeedSolid();
    return;
  }

  saveUndo();

  try {
    // Store original data for ungrouping
    var originalData = selectedObjects.map(function(obj) {
      var colorHex = null;
      obj.root.traverse(function(c) {
        if (c.isMesh && !c.userData.helper && !colorHex) {
          colorHex = c.userData.originalColor || c.material.color.getHex();
        }
      });
      return {
        type: obj.type,
        name: obj.name,
        isHole: obj.isHole,
        position: obj.root.position.clone(),
        rotation: obj.root.rotation.clone(),
        scale: obj.root.scale.clone(),
        color: colorHex
      };
    });

    // Get the color of the first solid for the result
    var resultColor = null;
    solids[0].root.traverse(function(c) {
      if (c.isMesh && !c.userData.helper && !resultColor) {
        resultColor = c.userData.originalColor || c.material.color.getHex();
      }
    });

    // Convert first solid to CSG
    var resultCSG = CSG.fromObject3D(solids[0].root);

    // Union remaining solids
    for (var i = 1; i < solids.length; i++) {
      var solidCSG = CSG.fromObject3D(solids[i].root);
      resultCSG = resultCSG.union(solidCSG);
    }

    // Subtract all holes
    for (var j = 0; j < holes.length; j++) {
      var holeCSG = CSG.fromObject3D(holes[j].root);
      resultCSG = resultCSG.subtract(holeCSG);
    }

    // Convert back to Three.js geometry
    var resultGeo = CSG.toGeometry(resultCSG);
    if (resultGeo.attributes.position.count === 0) {
      showEmptyResult();
      return;
    }

    resultGeo.computeVertexNormals();

    var resultMat = new THREE.MeshStandardMaterial({
      color: resultColor || 0x29b6f6,
      roughness: 0.45,
      metalness: 0.08
    });
    var resultMesh = new THREE.Mesh(resultGeo, resultMat);
    resultMesh.castShadow = true;
    resultMesh.receiveShadow = true;

    // Remove source objects from scene and registry (with dispose)
    selectedObjects.forEach(function(obj) {
      if (typeof disposeObject === 'function') disposeObject(obj.root);
      scene.remove(obj.root);
      var idx = objects.indexOf(obj);
      if (idx !== -1) objects.splice(idx, 1);
    });

    // Add result
    scene.add(resultMesh);
    var entry = {
      root: resultMesh,
      type: 'group',
      name: 'Group (' + (solids.length) + ' solid' + (solids.length>1?'s':'') +
            (holes.length ? ', ' + holes.length + ' hole' + (holes.length>1?'s':'') : '') + ')',
      isHole: false,
      groupId: null,
      originalData: originalData
    };
    objects.push(entry);
    updateObjCount();
    selectObj(entry);

  } catch(e) {
    console.error('CSG operation failed:', e);
    showCSGError(e.message);
  }
}

/**
 * Ungroup a previously grouped object, restoring the original shapes.
 */
function ungroupSelected() {
  if (selectedObjects.length !== 1) {
    showUngroupSelectOne();
    return;
  }

  var obj = selectedObjects[0];
  if (!obj.originalData || obj.type !== 'group') {
    showUngroupNotGroup();
    return;
  }

  saveUndo();

  var originals = obj.originalData;

  // Remove the grouped mesh
  scene.remove(obj.root);
  var idx = objects.indexOf(obj);
  if (idx !== -1) objects.splice(idx, 1);

  // Recreate original shapes
  var recreated = [];
  originals.forEach(function(data) {
    // Use addShape/addLetter to recreate, then apply stored transforms
    var prevLen = objects.length;

    if (data.type === 'letter') {
      var ch = data.name.replace('Letter ', '');
      addLetter(ch);
    } else {
      addShape(data.type);
    }

    if (objects.length > prevLen) {
      var newObj = objects[objects.length - 1];
      newObj.root.position.copy(data.position);
      newObj.root.rotation.copy(data.rotation);
      newObj.root.scale.copy(data.scale);
      newObj.isHole = data.isHole;

      // Apply color
      if (data.color !== null) {
        newObj.root.traverse(function(c) {
          if (c.isMesh && !c.userData.helper) {
            c.material.color.setHex(data.color);
          }
        });
      }

      // Apply hole appearance
      if (data.isHole) {
        applyHoleAppearance(newObj);
      }

      recreated.push(newObj);
    }
  });

  // Select all recreated objects
  if (recreated.length > 0) {
    deselect();
    selectObj(recreated[0]);
    for (var i = 1; i < recreated.length; i++) {
      toggleMultiSelect(recreated[i]);
    }
  }

  updateObjCount();
}
