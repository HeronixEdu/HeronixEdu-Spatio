// ═══════════════════════════════════════════
// MOUSE & KEYBOARD
// ═══════════════════════════════════════════
function setupEvents() {
  var c = renderer.domElement;

  c.addEventListener('mousedown', function(e) {
    e.preventDefault();
    mouse.down = true; mouse.btn = e.button;
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.moved = false;
    // Gizmo handles move/rotate/scale drag — no manual drag needed
  });

  c.addEventListener('mousemove', function(e) {
    if (!mouse.down) return;
    var dx = e.clientX - mouse.x;
    var dy = e.clientY - mouse.y;
    if (Math.abs(dx)+Math.abs(dy) > 1) mouse.moved = true;

    if (mouse.btn === 0) {
      if (draggingObj) {
        // Gizmo is handling the drag — don't interfere
      } else if (mode === 'pan') {
        // Pan mode: left-drag pans the view
        var sp = cam.r * 0.0012;
        var right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
        camTarget.addScaledVector(right, -dx*sp);
        camTarget.addScaledVector(camera.up, dy*sp);
        updateCamera();
      } else if (!draggingObj) {
        // Default: left-drag orbits
        cam.theta -= dx * 0.007;
        cam.phi = Math.max(0.05, Math.min(Math.PI-0.05, cam.phi + dy*0.007));
        updateCamera();
      }
    } else if (mouse.btn === 2) {
      var sp = cam.r * 0.0012;
      var right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
      camTarget.addScaledVector(right, -dx*sp);
      camTarget.addScaledVector(camera.up, dy*sp);
      updateCamera();
    }
    mouse.x = e.clientX; mouse.y = e.clientY;
  });

  c.addEventListener('mouseup', function(e) {
    if (!mouse.moved && mouse.btn === 0) handleClick(e);
    mouse.down = false; draggingObj = false;
  });

  c.addEventListener('wheel', function(e) {
    e.preventDefault();
    cam.r = Math.max(1.5, Math.min(90, cam.r + e.deltaY*0.025));
    updateCamera();
  }, {passive:false});

  c.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  // ─── TOUCH SUPPORT (tablets/Chromebooks) ───
  var touch = { active:false, startX:0, startY:0, lastX:0, lastY:0, fingers:0, pinchDist:0, moved:false };

  function getTouchCenter(touches) {
    var x=0, y=0;
    for (var i=0; i<touches.length; i++) { x+=touches[i].clientX; y+=touches[i].clientY; }
    return { x:x/touches.length, y:y/touches.length };
  }
  function getPinchDist(touches) {
    if (touches.length < 2) return 0;
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  c.addEventListener('touchstart', function(e) {
    e.preventDefault();
    touch.active = true;
    touch.fingers = e.touches.length;
    touch.moved = false;
    var ctr = getTouchCenter(e.touches);
    touch.startX = touch.lastX = ctr.x;
    touch.startY = touch.lastY = ctr.y;
    if (e.touches.length >= 2) {
      touch.pinchDist = getPinchDist(e.touches);
    }
  }, {passive:false});

  c.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!touch.active) return;
    var ctr = getTouchCenter(e.touches);
    var dx = ctr.x - touch.lastX;
    var dy = ctr.y - touch.lastY;
    if (Math.abs(dx)+Math.abs(dy) > 2) touch.moved = true;

    if (e.touches.length >= 2) {
      // 2-finger: pan + pinch zoom
      var sp = cam.r * 0.0015;
      var right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
      camTarget.addScaledVector(right, -dx*sp);
      camTarget.addScaledVector(camera.up, dy*sp);

      // Pinch zoom
      var newDist = getPinchDist(e.touches);
      if (touch.pinchDist > 0) {
        var scale = touch.pinchDist / newDist;
        cam.r = Math.max(1.5, Math.min(90, cam.r * scale));
      }
      touch.pinchDist = newDist;
      updateCamera();
    } else if (e.touches.length === 1) {
      if (mode === 'pan') {
        // Pan mode: 1-finger pans
        var sp = cam.r * 0.0015;
        var right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
        camTarget.addScaledVector(right, -dx*sp);
        camTarget.addScaledVector(camera.up, dy*sp);
        updateCamera();
      } else {
        // 1-finger: orbit
        cam.theta -= dx * 0.008;
        cam.phi = Math.max(0.05, Math.min(Math.PI-0.05, cam.phi + dy*0.008));
        updateCamera();
      }
    }
    touch.lastX = ctr.x;
    touch.lastY = ctr.y;
  }, {passive:false});

  c.addEventListener('touchend', function(e) {
    if (!touch.moved && touch.fingers === 1) {
      // Tap = click (select object)
      var fakeEvent = { clientX:touch.startX, clientY:touch.startY, shiftKey:false, ctrlKey:false };
      handleClick(fakeEvent);
    }
    touch.active = false;
    touch.fingers = 0;
    touch.pinchDist = 0;
  });

  document.addEventListener('keydown', function(e) {
    if (e.target.tagName==='INPUT') return;
    // Enter key checks coordinate challenge answer
    if (e.key === 'Enter' && typeof checkCoordAnswer === 'function' && coordChallenges) {
      e.preventDefault(); checkCoordAnswer(); return;
    }
    if (!selectedRoot) return;
    var step = e.shiftKey ? 0.1 : 0.5;
    var rStep = e.shiftKey ? 5 : 15;

    // Camera-relative movement: Right/Left move along screen X, Up/Down along screen Z
    // Get camera's right and forward vectors projected onto the XZ plane
    var camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; camDir.normalize();
    var camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0,1,0)).normalize();

    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if(mode==='move') { selectedRoot.position.addScaledVector(camRight, -step); }
        else if(mode==='rotate') selectedRoot.rotation.y-=rStep*Math.PI/180;
        break;
      case 'ArrowRight':
        e.preventDefault();
        if(mode==='move') { selectedRoot.position.addScaledVector(camRight, step); }
        else if(mode==='rotate') selectedRoot.rotation.y+=rStep*Math.PI/180;
        break;
      case 'ArrowUp':
        e.preventDefault();
        if(mode==='move') {
          if(e.altKey) selectedRoot.position.y+=step;
          else selectedRoot.position.addScaledVector(camDir, step);
        } else if(mode==='rotate') selectedRoot.rotation.x-=rStep*Math.PI/180;
        break;
      case 'ArrowDown':
        e.preventDefault();
        if(mode==='move') {
          if(e.altKey) selectedRoot.position.y-=step;
          else selectedRoot.position.addScaledVector(camDir, -step);
        } else if(mode==='rotate') selectedRoot.rotation.x+=rStep*Math.PI/180;
        break;
      case 'Delete': case 'Backspace': e.preventDefault(); deleteSelected(); return;
    }
    updatePropsDisplay();
  });
}

function raycastObjects(e) {
  var vp = document.getElementById('vp');
  var rect = vp.getBoundingClientRect();
  var ndc = new THREE.Vector2(
    ((e.clientX-rect.left)/rect.width)*2-1,
    -((e.clientY-rect.top)/rect.height)*2+1
  );
  var ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  var meshes = [];
  objects.forEach(function(o){ o.root.traverse(function(c){ if(c.isMesh&&!c.userData.helper) meshes.push(c); }); });
  var hits = ray.intersectObjects(meshes);
  return hits.length ? hits[0] : null;
}

function rayXZPlane(e, y) {
  y = y || 0;
  var vp = document.getElementById('vp');
  var rect = vp.getBoundingClientRect();
  var ndc = new THREE.Vector2(
    ((e.clientX-rect.left)/rect.width)*2-1,
    -((e.clientY-rect.top)/rect.height)*2+1
  );
  var ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  var plane = new THREE.Plane(new THREE.Vector3(0,1,0), -y);
  var pt = new THREE.Vector3();
  ray.ray.intersectPlane(plane, pt);
  return pt.lengthSq() ? pt : null;
}

function handleClick(e) {
  // Paint tool intercepts clicks
  if (typeof handlePaintClick === 'function' && paintMode) {
    if (handlePaintClick(e)) return;
  }
  // Ruler tool intercepts clicks
  if (typeof handleRulerClick === 'function' && rulerActive) {
    if (handleRulerClick(e)) return;
  }
  var hit = raycastObjects(e);
  if (hit) {
    var hitMesh = hit.object;
    var found = objects.find(function(o) {
      var yes=false;
      o.root.traverse(function(c){ if(c===hitMesh) yes=true; });
      return yes;
    });
    if (found) {
      if (e.shiftKey || e.ctrlKey) {
        toggleMultiSelect(found);
      } else {
        selectObj(found);
      }
      return;
    }
  }
  deselect();
}
