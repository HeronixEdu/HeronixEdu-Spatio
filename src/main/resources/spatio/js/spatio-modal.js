// ═══════════════════════════════════════════
// CUSTOM MODAL SYSTEM — Kid-friendly dialogs
// Replaces browser alert/confirm with styled popups
// ═══════════════════════════════════════════

// SECURITY: Sanitize HTML to prevent XSS from user input
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

var modalCallbackStack = [];

function showModal(opts) {
  // opts: { icon, title, message, buttons: [{label, class, value}], onResult: fn }
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    document.body.appendChild(overlay);
  }

  var html =
    '<div id="modal-box">' +
      '<div id="modal-icon">' + sanitizeHTML(opts.icon || '💬') + '</div>' +
      '<div id="modal-title">' + sanitizeHTML(opts.title || '') + '</div>' +
      '<div id="modal-msg">' + sanitizeHTML(opts.message || '') + '</div>' +
      '<div id="modal-btns">';

  (opts.buttons || [{label:'OK', cls:'modal-btn-primary', value:true}]).forEach(function(btn) {
    html += '<button class="modal-btn ' + (btn.cls || '') + '" data-val="' + btn.value + '">' + btn.label + '</button>';
  });

  html += '</div></div>';
  overlay.innerHTML = html;
  overlay.style.display = 'flex';

  // Animate in
  setTimeout(function() { overlay.classList.add('modal-visible'); }, 10);

  // Push callback to stack (prevents overwrite race condition)
  modalCallbackStack.push(opts.onResult || null);

  // Button clicks
  overlay.querySelectorAll('.modal-btn').forEach(function(b) {
    b.onclick = function() {
      var val = b.getAttribute('data-val');
      closeModal();
      var cb = modalCallbackStack.pop();
      if (cb) {
        var result = val;
        if (val === 'true') result = true;
        else if (val === 'false') result = false;
        cb(result);
      }
    };
  });
}

function closeModal() {
  var overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('modal-visible');
    setTimeout(function() { overlay.style.display = 'none'; }, 250);
  }
}

// ── Convenience wrappers ──

function spatioAlert(icon, title, message, callback) {
  showModal({
    icon: icon,
    title: title,
    message: message,
    buttons: [{ label: 'Got it!', cls: 'modal-btn-primary', value: true }],
    onResult: callback
  });
}

function spatioConfirm(icon, title, message, yesLabel, noLabel, callback) {
  showModal({
    icon: icon,
    title: title,
    message: message,
    buttons: [
      { label: noLabel || 'Nah, go back', cls: 'modal-btn-secondary', value: false },
      { label: yesLabel || 'Yes!', cls: 'modal-btn-primary', value: true },
    ],
    onResult: callback
  });
}

// ── Pre-built dialogs ──

function showExitDialog() {
  spatioConfirm(
    '👋',
    'Leaving so soon?',
    'Make sure you\'ve saved your awesome creation!\nWe\'ll miss you — see you next time, creator! 🚀',
    'Bye for now!',
    'Wait, let me save first!',
    function(yes) {
      if (yes && window.close) window.close();
    }
  );
}

function showClearDialog(callback) {
  spatioConfirm(
    '🧹',
    'Start Fresh?',
    'This will remove ALL objects from your scene.\nAre you sure you want a clean canvas?',
    'Clear it!',
    'Keep my stuff',
    callback
  );
}

function showNoShapesAlert() {
  spatioAlert('🎨', 'Nothing to export yet!', 'Add some shapes to your scene first,\nthen come back to export your masterpiece!');
}

function showGroupNeedMore() {
  spatioAlert(
    '🤝',
    'Need more shapes!',
    'Select at least 2 shapes to group!\n\n💡 Tip: Hold Shift and click shapes\nto select more than one.'
  );
}

function showGroupNeedSolid() {
  spatioAlert(
    '🔨',
    'Need a solid shape!',
    'You need at least one solid (non-hole) shape.\nToggle some shapes back to Solid first!'
  );
}

function showUngroupNotGroup() {
  spatioAlert('📦', 'Not a group!', 'This shape wasn\'t grouped — it can\'t be ungrouped.\nOnly shapes you combined with Group can be split apart.');
}

function showUngroupSelectOne() {
  spatioAlert('📦', 'Select one group', 'Select exactly one grouped object to ungroup.');
}

function showCSGError(errMsg) {
  console.error('[CSG Error]', errMsg); // Log details for debugging
  spatioAlert(
    '😵',
    'Oops! Couldn\'t combine',
    'These shapes had trouble merging.\nTry adjusting their positions a little bit!'
  );
}

function showEmptyResult() {
  spatioAlert(
    '🕳️',
    'Everything disappeared!',
    'The hole removed the entire shape!\nTry making the hole smaller or moving it.'
  );
}

function showFontError() {
  spatioAlert(
    '🔤',
    'Font not ready',
    'The text font is still loading.\nPlease try again in a moment!'
  );
}

function showProjectLoaded() {
  spatioAlert('📂', 'Project Loaded!', 'Your saved project is back! Keep creating! ✨');
}

function showProjectLoadError(errMsg) {
  console.error('[Load Error]', errMsg); // Log details for debugging
  spatioAlert('❌', 'Couldn\'t open project', 'Something went wrong loading the file.\nPlease check that it is a valid .spatio file.');
}

// ═══════════════════════════════════════════
// TOAST NOTIFICATIONS — quick feedback popups
// ═══════════════════════════════════════════
var toastTimer = null;
function showToast(message, type) {
  type = type || 'success';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  var icons = { success:'✅', info:'💡', warning:'⚠️', error:'❌' };
  toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '💬') + '</span> ' + sanitizeHTML(message);
  container.appendChild(toast);

  // Animate in
  setTimeout(function() { toast.classList.add('toast-show'); }, 10);

  // Remove after 2.5s
  setTimeout(function() {
    toast.classList.remove('toast-show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}
