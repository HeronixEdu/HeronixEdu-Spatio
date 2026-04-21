// ═══════════════════════════════════════════
// SIMPLE ANIMATION TIMELINE
// Keyframe position/rotation at time points, play/pause/scrub
// ═══════════════════════════════════════════

var animTimeline = [];    // Array of keyframes: {time, objectStates:[{objIdx, pos, rot, scale}]}
var animPlaying = false;
var animTime = 0;
var animDuration = 3;     // seconds
var animLastTimestamp = 0;
var animFrameId = null;

/**
 * Add a keyframe at the current time with current object states
 */
function addKeyframe() {
  if (objects.length === 0) { showToast('Add shapes first!', 'warning'); return; }

  var states = objects.map(function(obj, idx) {
    return {
      objIdx: idx,
      px: obj.root.position.x, py: obj.root.position.y, pz: obj.root.position.z,
      rx: obj.root.rotation.x, ry: obj.root.rotation.y, rz: obj.root.rotation.z,
      sx: obj.root.scale.x, sy: obj.root.scale.y, sz: obj.root.scale.z,
    };
  });

  // Check if keyframe already exists at this time
  var existing = animTimeline.findIndex(function(kf) { return Math.abs(kf.time - animTime) < 0.05; });
  if (existing >= 0) {
    animTimeline[existing].objectStates = states;
    showToast('Keyframe updated at ' + animTime.toFixed(1) + 's', 'info');
  } else {
    animTimeline.push({ time: animTime, objectStates: states });
    animTimeline.sort(function(a, b) { return a.time - b.time; });
    showToast('Keyframe added at ' + animTime.toFixed(1) + 's (' + animTimeline.length + ' total)', 'success');
  }

  updateAnimUI();
}

/**
 * Remove the nearest keyframe to current time
 */
function removeKeyframe() {
  if (animTimeline.length === 0) return;
  var nearest = 0, nearestDist = Infinity;
  animTimeline.forEach(function(kf, i) {
    var d = Math.abs(kf.time - animTime);
    if (d < nearestDist) { nearestDist = d; nearest = i; }
  });
  animTimeline.splice(nearest, 1);
  showToast('Keyframe removed (' + animTimeline.length + ' remaining)', 'info');
  updateAnimUI();
}

/**
 * Play/pause animation
 */
function toggleAnimPlay() {
  if (animTimeline.length < 2) {
    showToast('Need at least 2 keyframes to play!', 'warning');
    return;
  }

  animPlaying = !animPlaying;
  var btn = document.getElementById('btn-anim-play');
  if (btn) btn.textContent = animPlaying ? '⏸ Pause' : '▶ Play';

  if (animPlaying) {
    animLastTimestamp = performance.now();
    animLoop();
  } else if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function animLoop() {
  if (!animPlaying) return;

  var now = performance.now();
  var dt = (now - animLastTimestamp) / 1000;
  animLastTimestamp = now;

  animTime += dt;
  if (animTime > animDuration) animTime = 0; // Loop

  interpolateKeyframes(animTime);
  updateAnimSlider();

  animFrameId = requestAnimationFrame(animLoop);
}

/**
 * Interpolate between keyframes at given time
 */
function interpolateKeyframes(t) {
  if (animTimeline.length === 0) return;
  if (animTimeline.length === 1) {
    applyKeyframe(animTimeline[0]);
    return;
  }

  // Find surrounding keyframes
  var before = animTimeline[0], after = animTimeline[animTimeline.length - 1];
  for (var i = 0; i < animTimeline.length - 1; i++) {
    if (animTimeline[i].time <= t && animTimeline[i+1].time >= t) {
      before = animTimeline[i];
      after = animTimeline[i+1];
      break;
    }
  }

  // Linear interpolation factor
  var range = after.time - before.time;
  var alpha = range > 0 ? (t - before.time) / range : 0;
  alpha = Math.max(0, Math.min(1, alpha));

  // Smooth easing
  alpha = alpha * alpha * (3 - 2 * alpha); // smoothstep

  // Interpolate each object
  before.objectStates.forEach(function(bs, idx) {
    if (idx >= objects.length) return;
    if (!objects[idx] || !objects[idx].root) return;
    var as = after.objectStates[idx];
    if (!as) return;
    var obj = objects[idx].root;

    obj.position.set(
      bs.px + (as.px - bs.px) * alpha,
      bs.py + (as.py - bs.py) * alpha,
      bs.pz + (as.pz - bs.pz) * alpha
    );
    obj.rotation.set(
      bs.rx + (as.rx - bs.rx) * alpha,
      bs.ry + (as.ry - bs.ry) * alpha,
      bs.rz + (as.rz - bs.rz) * alpha
    );
    obj.scale.set(
      bs.sx + (as.sx - bs.sx) * alpha,
      bs.sy + (as.sy - bs.sy) * alpha,
      bs.sz + (as.sz - bs.sz) * alpha
    );
  });

  if (selectedRoot) updatePropsDisplay();
}

function applyKeyframe(kf) {
  kf.objectStates.forEach(function(s, idx) {
    if (idx >= objects.length) return;
    var obj = objects[idx].root;
    obj.position.set(s.px, s.py, s.pz);
    obj.rotation.set(s.rx, s.ry, s.rz);
    obj.scale.set(s.sx, s.sy, s.sz);
  });
}

function setAnimTime(val) {
  animTime = parseFloat(val);
  if (animTimeline.length > 0 && !animPlaying) {
    interpolateKeyframes(animTime);
  }
  updateAnimTimeDisplay();
}

function setAnimDuration(val) {
  animDuration = parseFloat(val);
}

function updateAnimSlider() {
  var slider = document.getElementById('anim-scrub');
  if (slider) {
    slider.max = animDuration;
    slider.value = animTime;
  }
  updateAnimTimeDisplay();
}

function updateAnimTimeDisplay() {
  var disp = document.getElementById('anim-time-display');
  if (disp) disp.textContent = animTime.toFixed(1) + 's / ' + animDuration.toFixed(1) + 's';
}

function updateAnimUI() {
  var kfCount = document.getElementById('anim-kf-count');
  if (kfCount) kfCount.textContent = animTimeline.length + ' keyframes';

  // Update keyframe markers
  var markers = document.getElementById('anim-markers');
  if (markers) {
    markers.innerHTML = '';
    animTimeline.forEach(function(kf) {
      var pct = (kf.time / animDuration) * 100;
      var dot = document.createElement('div');
      dot.className = 'anim-marker';
      dot.style.left = pct + '%';
      dot.title = kf.time.toFixed(1) + 's';
      markers.appendChild(dot);
    });
  }
}

function clearAnimation() {
  animTimeline = [];
  animTime = 0;
  animPlaying = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  var btn = document.getElementById('btn-anim-play');
  if (btn) btn.textContent = '▶ Play';
  updateAnimUI();
  updateAnimSlider();
  showToast('Animation cleared', 'info');
}
