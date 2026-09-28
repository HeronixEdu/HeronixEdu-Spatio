// ═══════════════════════════════════════════
// LIVE MIRROR MODIFIER — Build half, see the whole
// Creates a real-time mirrored clone across an axis
// ═══════════════════════════════════════════

var mirrorEnabled = false;
var mirrorAxis = 'x';     // x, y, or z
var mirrorClones = {};     // objectId -> { clone, sourceObj }

function toggleMirrorMode() {
  mirrorEnabled = !mirrorEnabled;
  var btn = document.getElementById('btn-mirror');
  if (btn) btn.classList.toggle('active', mirrorEnabled);

  if (mirrorEnabled) {
    updateMirrorClones();
    showToast('Mirror ON — build half, see the whole!', 'info');
  } else {
    removeAllMirrorClones();
    showToast('Mirror OFF', 'info');
  }
}

function setMirrorAxis(axis) {
  mirrorAxis = axis;
  document.querySelectorAll('.maxis-btn').forEach(function(b) { b.classList.remove('active'); });
  var active = document.querySelector('.maxis-btn-' + axis);
  if (active) active.classList.add('active');
  if (mirrorEnabled) updateMirrorClones();
}

function updateMirrorClones() {
  if (!mirrorEnabled) return;

  // Remove clones for objects that no longer exist
  var ids = Object.keys(mirrorClones);
  ids.forEach(function(id) {
    var entry = mirrorClones[id];
    var stillExists = objects.some(function(o) { return o === entry.sourceObj; });
    if (!stillExists) {
      scene.remove(entry.clone);
      delete mirrorClones[id];
    }
  });

  // Create/update clones for all objects
  objects.forEach(function(obj, idx) {
    var id = 'mirror_' + idx;
    var clone;

    if (mirrorClones[id] && mirrorClones[id].sourceObj === obj) {
      clone = mirrorClones[id].clone;
    } else {
      // Remove old clone (with dispose to prevent GPU leak)
      if (mirrorClones[id]) {
        if (typeof disposeObject === 'function') disposeObject(mirrorClones[id].clone);
        scene.remove(mirrorClones[id].clone);
      }
      // Create new clone
      clone = obj.root.clone(true);
      clone.userData.helper = true;
      clone.traverse(function(c) {
        c.userData.helper = true;
        if (c.isMesh) {
          c.material = c.material.clone();
          c.material.transparent = true;
          c.material.opacity = 0.4;
        }
      });
      scene.add(clone);
      mirrorClones[id] = { clone: clone, sourceObj: obj };
    }

    // Update clone transform to mirror the source
    clone.position.copy(obj.root.position);
    clone.rotation.copy(obj.root.rotation);
    clone.scale.copy(obj.root.scale);

    // Apply mirror on the chosen axis
    switch(mirrorAxis) {
      case 'x':
        clone.position.x = -obj.root.position.x;
        clone.scale.x = -obj.root.scale.x;
        break;
      case 'y':
        clone.position.y = -obj.root.position.y;
        clone.scale.y = -obj.root.scale.y;
        break;
      case 'z':
        clone.position.z = -obj.root.position.z;
        clone.scale.z = -obj.root.scale.z;
        break;
    }

    clone.visible = obj.root.visible;
  });
}

function removeAllMirrorClones() {
  Object.keys(mirrorClones).forEach(function(id) {
    if (typeof disposeObject === 'function') disposeObject(mirrorClones[id].clone);
    scene.remove(mirrorClones[id].clone);
  });
  mirrorClones = {};
}

/**
 * Apply mirror — merge clones into real objects (makes them permanent)
 */
function applyMirror() {
  if (!mirrorEnabled || Object.keys(mirrorClones).length === 0) {
    showToast('Enable mirror mode first!', 'warning');
    return;
  }

  saveUndo();

  var count = 0;
  Object.keys(mirrorClones).forEach(function(id) {
    var entry = mirrorClones[id];
    var clone = entry.clone;

    // Make the clone a real object
    clone.userData.helper = false;
    clone.traverse(function(c) {
      c.userData.helper = false;
      if (c.isMesh) {
        c.material.transparent = false;
        c.material.opacity = 1.0;
      }
    });

    var src = entry.sourceObj;
    objects.push({
      root: clone,
      type: src.type,
      name: src.name + ' (Mirror)',
      isHole: src.isHole,
      groupId: null,
      originalData: null,
      params: Object.assign({}, src.params || {})
    });
    count++;
  });

  mirrorClones = {};
  mirrorEnabled = false;
  var btn = document.getElementById('btn-mirror');
  if (btn) btn.classList.remove('active');

  updateObjCount();
  showToast('Mirror applied! ' + count + ' mirrored shapes added.', 'success');
}
