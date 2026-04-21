// ═══════════════════════════════════════════
// DISPOSE HELPER — Prevent memory leaks
// ═══════════════════════════════════════════
function disposeObject(obj3d) {
  if (!obj3d) return;
  obj3d.traverse(function(c) {
    if (c.geometry) c.geometry.dispose();
    if (c.material) {
      var mats = Array.isArray(c.material) ? c.material : [c.material];
      mats.forEach(function(m) { m.dispose(); });
    }
  });
}

// ═══════════════════════════════════════════
// DELETE / UNDO / DUPLICATE
// ═══════════════════════════════════════════
function deleteSelected() {
  if (!selectedRoot) return;
  // Stop animation if playing to prevent accessing deleted objects
  if (typeof animPlaying !== 'undefined' && animPlaying) {
    animPlaying = false;
    if (typeof animFrameId !== 'undefined' && animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    var playBtn = document.getElementById('btn-anim-play');
    if (playBtn) playBtn.textContent = '▶ Play';
  }
  saveUndo();
  // Don't dispose — undo may restore this object. Disposal happens on undo stack eviction.
  scene.remove(selectedRoot);
  if (selHelper) { scene.remove(selHelper); selHelper=null; }
  var idx = objects.findIndex(function(o){ return o.root===selectedRoot; });
  if (idx!==-1) objects.splice(idx,1);
  selectedRoot=null;
  document.getElementById('no-sel').style.display='block';
  document.getElementById('has-sel').style.display='none';
  updateObjCount();
}

function duplicateSelected() {
  if (!selectedRoot) return;
  saveUndo();
  var src = objects.find(function(o){ return o.root===selectedRoot; });
  if (!src) return;
  var clone = selectedRoot.clone(true);
  // Object3D.clone(true) leaves geometry/material references shared with the
  // original. Deep-clone them so disposing this duplicate later (on undo-stack
  // eviction) never frees buffers still used by the original.
  clone.traverse(function(c) {
    if (!c.isMesh) return;
    if (c.geometry) c.geometry = c.geometry.clone();
    if (c.material) {
      c.material = Array.isArray(c.material)
        ? c.material.map(function(m) { return m.clone(); })
        : c.material.clone();
    }
  });
  clone.position.x += 1.5;
  clone.position.z += 1.5;
  scene.add(clone);
  objects.push({root:clone, type:src.type, name:src.name+' Copy'});
  updateObjCount();
  selectObj(objects[objects.length-1]);
}

function saveUndo() {
  // Full state snapshot: which objects exist + their transforms
  var snap = {
    objectRefs: objects.map(function(o) { return o; }),
    transforms: objects.map(function(o) {
      return {
        px:o.root.position.x, py:o.root.position.y, pz:o.root.position.z,
        rx:o.root.rotation.x, ry:o.root.rotation.y, rz:o.root.rotation.z,
        sx:o.root.scale.x, sy:o.root.scale.y, sz:o.root.scale.z,
        vis:o.root.visible, isHole:o.isHole, name:o.name
      };
    })
  };
  undoStack.push(snap);
  // Evict old entries and dispose objects no longer referenced anywhere
  if (undoStack.length > 50) {
    var evicted = undoStack.shift();
    cleanupEvictedSnapshot(evicted);
  }
}

function cleanupEvictedSnapshot(snap) {
  // Find objects in this snapshot that are NOT in current scene or any remaining snapshot
  var liveRefs = new Set(objects);
  undoStack.forEach(function(s) {
    s.objectRefs.forEach(function(o) { liveRefs.add(o); });
  });
  snap.objectRefs.forEach(function(obj) {
    if (!liveRefs.has(obj)) {
      disposeObject(obj.root);
    }
  });
}

function undo() {
  if (!undoStack.length) { showToast('Nothing to undo!', 'info'); return; }
  var snap = undoStack.pop();

  // Remove objects that weren't in the snapshot
  for (var i = objects.length - 1; i >= 0; i--) {
    if (snap.objectRefs.indexOf(objects[i]) === -1) {
      scene.remove(objects[i].root);
      objects.splice(i, 1);
    }
  }

  // Re-add objects that were in snapshot but got removed
  snap.objectRefs.forEach(function(obj) {
    if (objects.indexOf(obj) === -1) {
      objects.push(obj);
      scene.add(obj.root);
    }
  });

  // Restore order and transforms
  objects.length = 0;
  snap.objectRefs.forEach(function(obj, idx) {
    objects.push(obj);
    var t = snap.transforms[idx];
    obj.root.position.set(t.px, t.py, t.pz);
    obj.root.rotation.set(t.rx, t.ry, t.rz);
    obj.root.scale.set(t.sx, t.sy, t.sz);
    obj.root.visible = t.vis;
    obj.isHole = t.isHole;
    obj.name = t.name;
  });

  deselect();
  updateObjCount();
  showToast('Undone!', 'info');
}

function clearScene() {
  if (!objects.length) return;
  showClearDialog(function(yes) {
    if (!yes) return;
    objects.forEach(function(o){ disposeObject(o.root); scene.remove(o.root); });
    objects=[];
    if(selHelper){scene.remove(selHelper);selHelper=null;}
    clearSelectionHelpers();
    selectedRoot=null;
    selectedObjects=[];
    undoStack=[];
    if (transformControl) { transformControl.detach(); transformControl.visible=false; }
    // Clean up mirror clones, ruler lines, cross-section
    if (typeof placeCounter !== 'undefined') placeCounter = 0;
    if (typeof removeAllMirrorClones === 'function') removeAllMirrorClones();
    if (typeof clearRulerLines === 'function') clearRulerLines();
    if (typeof crossSectionEnabled !== 'undefined' && crossSectionEnabled) toggleCrossSection();
    if (typeof animPlaying !== 'undefined' && animPlaying) {
      animPlaying = false;
      if (typeof animFrameId !== 'undefined' && animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    }
    document.getElementById('no-sel').style.display='block';
    document.getElementById('has-sel').style.display='none';
    updateObjCount();
  });
}

// ═══════════════════════════════════════════
// MODE
// ═══════════════════════════════════════════
function setMode(m) {
  mode = m;
  document.querySelectorAll('.tbtn').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('btn-'+m).classList.add('active');
  var labels = {
    select:'✦ SELECT MODE — Click an object to select it',
    move:'✥ MOVE MODE — Drag gizmo axes or Arrow Keys  |  Alt+↑↓ for up/down',
    rotate:'↻ ROTATE MODE — Drag gizmo rings or Arrow Keys',
    scale:'⤢ SCALE MODE — Drag gizmo handles or edit values below',
    pan:'✋ PAN MODE — Drag to move the view around',
  };
  document.getElementById('modebar').textContent = labels[m];

  // Update TransformControls gizmo mode
  if (transformControl) {
    var gizmoModes = { select:null, move:'translate', rotate:'rotate', scale:'scale' };
    if (gizmoModes[m]) {
      transformControl.setMode(gizmoModes[m]);
      // Re-mark gizmo children as helpers (mode change may rebuild internals)
      transformControl.traverse(function(c) { c.userData.helper = true; });
      // Attach to selected object immediately
      if (selectedRoot) {
        transformControl.attach(selectedRoot);
        transformControl.visible = true;
      } else {
        transformControl.visible = false;
      }
      if (snapEnabled && m === 'move') {
        transformControl.setTranslationSnap(snapSize);
      } else {
        transformControl.setTranslationSnap(null);
      }
      if (snapEnabled && m === 'rotate') {
        transformControl.setRotationSnap(THREE.MathUtils.degToRad(15));
      } else {
        transformControl.setRotationSnap(null);
      }
      if (snapEnabled && m === 'scale') {
        transformControl.setScaleSnap(0.1);
      } else {
        transformControl.setScaleSnap(null);
      }
    } else {
      transformControl.visible = false;
    }
  }
  var vpClass = '';
  if (m === 'move') vpClass = 'mode-move';
  else if (m === 'pan') vpClass = 'mode-pan';
  document.getElementById('vp').className = vpClass;
}

// ═══════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════
function swL(tab, btn) {
  // Left panel no longer uses tabs — all sections visible
  // Keep function for backwards compatibility
}

function swR(tab, btn) {
  ['props','measure','learn'].forEach(function(t){ document.getElementById('tab-'+t).classList.remove('on'); });
  if (tab === 'measure') updateMeasurements();
  document.querySelectorAll('#rp .ptab').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('tab-'+tab).classList.add('on');
  btn.classList.add('active');
}

function exitApp() {
  if (objects.length > 0) {
    showExitDialog();
  } else {
    if (window.close) window.close();
  }
}

// ═══════════════════════════════════════════
// WELCOME OVERLAY (first-time users)
// ═══════════════════════════════════════════
function showWelcomeOverlay() {
  var el = document.getElementById('welcome-overlay');
  if (el) el.style.display = 'flex';
}
function hideWelcome() {
  var el = document.getElementById('welcome-overlay');
  if (el) { el.style.opacity='0'; setTimeout(function(){ el.style.display='none'; }, 400); }
}

// ═══════════════════════════════════════════
// KEYBOARD SHORTCUTS PANEL
// ═══════════════════════════════════════════
function toggleShortcuts() {
  var el = document.getElementById('shortcuts-panel');
  if (!el) {
    el = document.createElement('div');
    el.id = 'shortcuts-panel';
    el.innerHTML =
      '<div class="sc-box">' +
        '<div class="sc-title">&#x2328; Keyboard Shortcuts</div>' +
        '<div class="sc-grid">' +
          '<div class="sc-key">Click</div><div class="sc-desc">Select object</div>' +
          '<div class="sc-key">Shift+Click</div><div class="sc-desc">Multi-select</div>' +
          '<div class="sc-key">&#8592; &#8593; &#8594; &#8595;</div><div class="sc-desc">Move / Rotate selected</div>' +
          '<div class="sc-key">Alt+&#8593;/&#8595;</div><div class="sc-desc">Move up / down</div>' +
          '<div class="sc-key">Shift+Arrow</div><div class="sc-desc">Fine movement (0.1)</div>' +
          '<div class="sc-key">Delete</div><div class="sc-desc">Delete selected</div>' +
          '<div class="sc-key">Left drag</div><div class="sc-desc">Orbit camera</div>' +
          '<div class="sc-key">Right drag</div><div class="sc-desc">Pan camera</div>' +
          '<div class="sc-key">Scroll</div><div class="sc-desc">Zoom in/out</div>' +
        '</div>' +
        '<button class="tut-btn tut-next" onclick="toggleShortcuts()">Got it!</button>' +
      '</div>';
    document.body.appendChild(el);
    el.onclick = function(e) { if (e.target === el) toggleShortcuts(); };
  }
  el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
}

function toggleCard(id) {
  document.getElementById(id).classList.toggle('open');
}

// ═══════════════════════════════════════════
// VIEW CUBE — Click to snap camera to standard views
// ═══════════════════════════════════════════
function setCameraView(name) {
  var dist = cam.r;
  switch(name) {
    case 'front':  cam.theta = 0;           cam.phi = Math.PI/2; break;
    case 'back':   cam.theta = Math.PI;     cam.phi = Math.PI/2; break;
    case 'right':  cam.theta = -Math.PI/2;  cam.phi = Math.PI/2; break;
    case 'left':   cam.theta = Math.PI/2;   cam.phi = Math.PI/2; break;
    case 'top':    cam.theta = 0;           cam.phi = 0.01; break;
    case 'bottom': cam.theta = 0;           cam.phi = Math.PI-0.01; break;
  }
  updateCamera();
}

// ═══════════════════════════════════════════
// SNAP TOGGLE
// ═══════════════════════════════════════════
function toggleSnap() {
  snapEnabled = !snapEnabled;
  var btn = document.getElementById('btn-snap');
  if (btn) {
    btn.classList.toggle('active', snapEnabled);
    btn.textContent = snapEnabled ? '⊞ Snap ON' : '⊞ Snap OFF';
  }
  // Update gizmo snapping
  if (transformControl) {
    if (snapEnabled) {
      if (mode === 'move') transformControl.setTranslationSnap(snapSize);
      if (mode === 'rotate') transformControl.setRotationSnap(THREE.MathUtils.degToRad(15));
      if (mode === 'scale') transformControl.setScaleSnap(0.1);
    } else {
      transformControl.setTranslationSnap(null);
      transformControl.setRotationSnap(null);
      transformControl.setScaleSnap(null);
    }
  }
}

function setSnapSize(size) {
  snapSize = parseFloat(size);
  if (transformControl && snapEnabled && mode === 'move') {
    transformControl.setTranslationSnap(snapSize);
  }
}

function buildUI() {
  // 3D Text tool
  if (typeof buildTextUI === 'function') buildTextUI();
  if (typeof preloadFonts === 'function') preloadFonts();
  // Material presets and expanded palette
  if (typeof buildMaterialPresets === 'function') buildMaterialPresets();
  if (typeof buildExpandedPalette === 'function') buildExpandedPalette();

  // Color swatches
  var sw = document.getElementById('swatches');
  PALETTE.forEach(function(hex){
    var s=document.createElement('div');
    s.className='sw'; s.style.background=hex; s.dataset.c=hex;
    s.title=hex;
    s.onclick=function(){ applyColor(hex); document.getElementById('cpick').value=hex; };
    sw.appendChild(s);
  });
}

// ═══════════════════════════════════════════
// SCENE TREE
// ═══════════════════════════════════════════
function refreshSceneTree() {
  var container = document.getElementById('scene-tree');
  var empty = document.getElementById('scene-empty');
  if (!container) return;

  container.innerHTML = '';

  if (objects.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  objects.forEach(function(obj, idx) {
    var row = document.createElement('div');
    row.className = 'st-row';
    if (selectedObjects.indexOf(obj) !== -1) row.classList.add('st-selected');

    // Type icon
    var icon = document.createElement('span');
    icon.className = 'st-icon';
    var icons = {box:'🟦',sphere:'🔵',cylinder:'🫙',cone:'🔺',torus:'🍩',
      pyramid:'🔷',wedge:'📐',tube:'🪣',star:'⭐',heart:'❤️',arrow:'➡️',
      ring:'💍',capsule:'💊',prism:'🔩',halfball:'⚾',bolt:'⚡',
      letter:'🔤',group:'📦'};
    icon.textContent = icons[obj.type] || '⬜';

    // Name
    var name = document.createElement('span');
    name.className = 'st-name';
    name.textContent = obj.name;

    // Hole badge
    if (obj.isHole) {
      var badge = document.createElement('span');
      badge.className = 'st-badge';
      badge.textContent = 'HOLE';
      name.appendChild(badge);
    }

    // Visibility toggle
    var vis = document.createElement('button');
    vis.className = 'st-vis';
    vis.textContent = obj.root.visible ? '👁' : '—';
    vis.onclick = function(e) {
      e.stopPropagation();
      obj.root.visible = !obj.root.visible;
      refreshSceneTree();
    };

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(vis);

    // Single click to select
    row.onclick = function() {
      selectObj(obj);
      refreshSceneTree();
    };

    // Double-click name to rename
    name.ondblclick = function(e) {
      e.stopPropagation();
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'st-rename';
      input.value = obj.name;
      input.onclick = function(ev) { ev.stopPropagation(); };
      input.onkeydown = function(ev) {
        if (ev.key === 'Enter') {
          obj.name = input.value || obj.name;
          refreshSceneTree();
        }
        if (ev.key === 'Escape') refreshSceneTree();
      };
      input.onblur = function() {
        obj.name = input.value || obj.name;
        refreshSceneTree();
      };
      name.textContent = '';
      name.appendChild(input);
      input.focus();
      input.select();
    };

    container.appendChild(row);
  });
}
