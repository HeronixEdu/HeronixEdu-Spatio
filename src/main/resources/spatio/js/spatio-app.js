// ═══════════════════════════════════════════
// LAUNCH — Entry Point with Splash Screen
// ═══════════════════════════════════════════

function updateSplash(msg, pct) {
  var status = document.getElementById('splash-status');
  var bar = document.getElementById('splash-bar');
  if (status) status.textContent = msg;
  if (bar) bar.style.width = pct + '%';
}

function hideSplash() {
  var splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(function() { splash.style.display = 'none'; }, 600);
  }
}

window.addEventListener('load', function() {
  updateSplash('Initializing UI...', 10);

  setTimeout(function() {
    buildUI();
    updateSplash('Starting 3D engine...', 30);

    setTimeout(function() {
      initThree();
      updateSplash('Loading fonts...', 60);

      setTimeout(function() {
        updateSplash('Creating welcome scene...', 80);

        setTimeout(function() {
          // Clean canvas — let kids start fresh
          updateSplash('Ready!', 100);

          setTimeout(function() {
            hideSplash();
          }, 400);
        }, 100);
      }, 200);
    }, 100);
  }, 50);
});
