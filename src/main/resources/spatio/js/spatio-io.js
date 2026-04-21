// ═══════════════════════════════════════════
// SAVE / LOAD PROJECT (.spatio files)
// ═══════════════════════════════════════════
function saveProject() {
  if (!objects.length) { showNoShapesAlert(); return; }

  // Gather material info per object
  var project = {
    version: 2,
    appVersion: '1.0.0',
    camera: { r:cam.r, theta:cam.theta, phi:cam.phi, target:[camTarget.x,camTarget.y,camTarget.z] },
    objects: objects.map(function(obj) {
      var colorHex = null;
      var roughness = 0.45, metalness = 0.08, transparent = false, opacity = 1;
      obj.root.traverse(function(c) {
        if (c.isMesh && !c.userData.helper && colorHex === null) {
          colorHex = '#' + c.material.color.getHexString();
          roughness = c.material.roughness || 0.45;
          metalness = c.material.metalness || 0.08;
          transparent = c.material.transparent || false;
          opacity = c.material.opacity || 1;
        }
      });
      return {
        type: obj.type,
        name: obj.name,
        isHole: obj.isHole || false,
        position: [obj.root.position.x, obj.root.position.y, obj.root.position.z],
        rotation: [obj.root.rotation.x, obj.root.rotation.y, obj.root.rotation.z],
        scale: [obj.root.scale.x, obj.root.scale.y, obj.root.scale.z],
        color: colorHex,
        visible: obj.root.visible,
        params: obj.params || {},
        material: { roughness:roughness, metalness:metalness, transparent:transparent, opacity:opacity }
      };
    }),
    stamps: (typeof stampLibrary !== 'undefined') ? stampLibrary : [],
  };

  var json = JSON.stringify(project, null, 2);
  dl('my_project.spatio', json, 'Project saved!');
}

function loadProject() {
  if (window.javaApp && window.javaApp.showOpenDialog) {
    window.javaApp.showOpenDialog().then(function(path) {
      if (!path) return;
      window.javaApp.readFile(path).then(function(content) {
        if (!content) return;
        doLoadProject(content);
      });
    });
  } else {
    // Browser fallback: file input
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.spatio';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) { doLoadProject(ev.target.result); };
      reader.onerror = function() { showToast('Could not read file', 'warning'); };
      reader.readAsText(file);
    };
    input.click();
  }
}

function validTriplet(arr) {
  return Array.isArray(arr) && arr.length >= 3 &&
    typeof arr[0] === 'number' && typeof arr[1] === 'number' && typeof arr[2] === 'number' &&
    isFinite(arr[0]) && isFinite(arr[1]) && isFinite(arr[2]);
}

function doLoadProject(jsonStr) {
  try {
    var project = JSON.parse(jsonStr);
    if (project.version !== 2 || !Array.isArray(project.objects)) {
      showProjectLoadError(
        (typeof project.version === 'number' && project.version > 2)
          ? 'This file was saved by a newer Spatio Studio. Update the app to open it.'
          : 'Invalid project file format.'
      );
      return;
    }
    // SECURITY: Limit number of objects to prevent DoS
    if (project.objects.length > 500) {
      showProjectLoadError('Project has too many objects (' + project.objects.length + '). Maximum is 500.');
      return;
    }

    // Clear current scene
    objects.forEach(function(o) { scene.remove(o.root); });
    objects = [];
    if (selHelper) { scene.remove(selHelper); selHelper = null; }
    clearSelectionHelpers();
    selectedRoot = null;
    selectedObjects = [];
    undoStack = [];

    // Restore camera
    if (project.camera) {
      cam.r = project.camera.r || 22;
      cam.theta = project.camera.theta || -0.55;
      cam.phi = project.camera.phi || 1.05;
      if (validTriplet(project.camera.target)) {
        camTarget.set(project.camera.target[0], project.camera.target[1], project.camera.target[2]);
      }
      updateCamera();
    }

    // Recreate objects — per-entry guarded so one bad object doesn't abort the whole load
    var skipped = 0;
    project.objects.forEach(function(data) {
      if (!data || typeof data.type !== 'string' ||
          !validTriplet(data.position) || !validTriplet(data.rotation) || !validTriplet(data.scale)) {
        skipped++;
        return;
      }
      var prevLen = objects.length;
      try {
        if (data.type === 'letter') {
          var ch = (data.name || 'Letter A').replace('Letter ', '');
          addLetter(ch);
        } else if (data.type === 'group') {
          // Groups can't be recreated from type alone — add a box placeholder
          addShape('box');
          if (objects.length > prevLen) {
            objects[objects.length - 1].name = data.name;
            objects[objects.length - 1].type = 'group';
          }
        } else {
          addShape(data.type);
        }

        if (objects.length > prevLen) {
          var obj = objects[objects.length - 1];
          obj.name = data.name;
          obj.root.position.set(data.position[0], data.position[1], data.position[2]);
          obj.root.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
          obj.root.scale.set(data.scale[0], data.scale[1], data.scale[2]);
          if (data.visible === false) obj.root.visible = false;

          // Apply color and material
          if (data.color) {
            var col = new THREE.Color(data.color);
            obj.root.traverse(function(c) {
              if (c.isMesh && !c.userData.helper) {
                c.material.color.set(col);
                if (data.material) {
                  c.material.roughness = data.material.roughness || 0.45;
                  c.material.metalness = data.material.metalness || 0.08;
                  c.material.transparent = data.material.transparent || false;
                  c.material.opacity = data.material.opacity || 1;
                  if (data.material.transparent) c.material.side = THREE.DoubleSide;
                  c.material.needsUpdate = true;
                }
              }
            });
          }

          // Apply params
          if (data.params) obj.params = data.params;

          // Apply hole state
          obj.isHole = data.isHole || false;
          if (obj.isHole) applyHoleAppearance(obj);
        }
      } catch(objErr) {
        // Roll back any partial add from this entry so the scene stays consistent
        console.error('[Spatio] Skipping malformed object:', objErr);
        if (objects.length > prevLen) {
          var bad = objects[objects.length - 1];
          scene.remove(bad.root);
          objects.length = prevLen;
        }
        skipped++;
      }
    });

    // Restore stamps if saved
    if (project.stamps && project.stamps.length > 0 && typeof stampLibrary !== 'undefined') {
      stampLibrary = project.stamps;
      if (typeof updateStampUI === 'function') updateStampUI();
    }
    // project.animation from older files is silently ignored — animation
    // support was removed.

    deselect();
    updateObjCount();
    document.getElementById('no-sel').style.display = 'block';
    document.getElementById('has-sel').style.display = 'none';
    if (skipped > 0) {
      showToast('Project loaded — ' + objects.length + ' objects (' + skipped + ' skipped as malformed)', 'warning');
    } else {
      showToast('Project loaded! Keep creating!', 'success');
    }

  } catch(e) {
    showProjectLoadError(e.message);
    console.error(e);
  }
}

// ═══════════════════════════════════════════
// SCREENSHOT
// ═══════════════════════════════════════════
function takeScreenshot() {
  // Render one frame with preserveDrawingBuffer
  renderer.render(scene, camera);
  var dataUrl = renderer.domElement.toDataURL('image/png');

  // Convert base64 to downloadable content
  // For JavaBridge, we send as data URL; for browser, trigger download
  if (window.javaApp && window.javaApp.downloadFile) {
    // Send the base64 data - bridge will need to handle it
    window.javaApp.downloadFile('spatio_screenshot.png', dataUrl);
  } else {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'spatio_screenshot.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
}

// ═══════════════════════════════════════════
// EXPORT — STL, OBJ, GLTF
// ═══════════════════════════════════════════
function getAllGeos() {
  var geos = [];
  objects.forEach(function(obj) {
    obj.root.updateWorldMatrix(true, true);
    obj.root.traverse(function(c) {
      if (!c.isMesh || c.userData.helper) return;
      var geo = c.geometry.clone();
      geo.applyMatrix4(c.matrixWorld);
      geos.push(geo.index ? geo.toNonIndexed() : geo);
    });
  });
  return geos;
}

function exportSTL() {
  if (!objects.length) { showNoShapesAlert(); return; }
  var geos = getAllGeos();
  var stl = 'solid SpatioStudio\n';
  geos.forEach(function(geo) {
    geo.computeVertexNormals();
    var pos = geo.attributes.position;
    var nor = geo.attributes.normal;
    for (var i=0; i<pos.count; i+=3) {
      var nx=(nor.getX(i)+nor.getX(i+1)+nor.getX(i+2))/3;
      var ny=(nor.getY(i)+nor.getY(i+1)+nor.getY(i+2))/3;
      var nz=(nor.getZ(i)+nor.getZ(i+1)+nor.getZ(i+2))/3;
      stl+='  facet normal '+nx.toFixed(6)+' '+ny.toFixed(6)+' '+nz.toFixed(6)+'\n    outer loop\n';
      for(var j=0;j<3;j++) stl+='      vertex '+pos.getX(i+j).toFixed(6)+' '+pos.getY(i+j).toFixed(6)+' '+pos.getZ(i+j).toFixed(6)+'\n';
      stl+='    endloop\n  endfacet\n';
    }
  });
  stl += 'endsolid SpatioStudio\n';
  dl('spatio_model.stl', stl, 'STL exported — ready for 3D printing!');
}

function exportOBJ() {
  if (!objects.length) { showNoShapesAlert(); return; }
  var geos = getAllGeos();
  var out='# Spatio Studio Model\n# Units: Three.js units\n\n';
  var vo=1;
  geos.forEach(function(geo,gi) {
    geo.computeVertexNormals();
    var pos=geo.attributes.position, nor=geo.attributes.normal;
    out+='o Object_'+(gi+1)+'\n';
    for(var i=0;i<pos.count;i++) out+='v '+pos.getX(i).toFixed(6)+' '+pos.getY(i).toFixed(6)+' '+pos.getZ(i).toFixed(6)+'\n';
    for(var i=0;i<nor.count;i++) out+='vn '+nor.getX(i).toFixed(6)+' '+nor.getY(i).toFixed(6)+' '+nor.getZ(i).toFixed(6)+'\n';
    for(var i=0;i<pos.count;i+=3){var a=vo+i,b=vo+i+1,c2=vo+i+2;out+='f '+a+'//'+a+' '+b+'//'+b+' '+c2+'//'+c2+'\n';}
    vo+=pos.count; out+='\n';
  });
  dl('spatio_model.obj', out, 'OBJ exported!');
}

function exportGLTF() {
  if (!objects.length) { showNoShapesAlert(); return; }
  // Build a temporary scene with just user objects
  var exportScene = new THREE.Scene();
  objects.forEach(function(obj) {
    exportScene.add(obj.root.clone(true));
  });
  var exporter = new THREE.GLTFExporter();
  exporter.parse(exportScene, function(result) {
    var output = JSON.stringify(result, null, 2);
    dl('spatio_model.gltf', output, 'GLTF exported — share in AR!');
  }, { binary: false });
}

function dl(name, content, successMsg) {
  // Use JavaBridge if available (standalone app), otherwise fallback to blob URL
  if (window.javaApp && window.javaApp.downloadFile) {
    window.javaApp.downloadFile(name, content).then(function(savedPath) {
      if (savedPath && savedPath.length > 0) {
        // Show saved location — filename only for privacy, folder name only
        var folder = savedPath.replace(/\\/g, '/');
        var fileName = folder.split('/').pop();
        var dirParts = folder.substring(0, folder.lastIndexOf('/')).split('/');
        var shortDir = dirParts.length > 1 ? dirParts[dirParts.length - 1] : dirParts[0];
        spatioAlert('💾', 'Saved!',
          (successMsg || 'File saved successfully!') +
          '\n\n📄 File: ' + sanitizeHTML(fileName) +
          '\n📁 Folder: ' + sanitizeHTML(shortDir)
        );
      }
      // If empty — user cancelled, no message
    });
  } else {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content],{type:'text/plain'}));
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast(successMsg || 'File saved!', 'success');
  }
}
