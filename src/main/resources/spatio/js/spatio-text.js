// ═══════════════════════════════════════════
// 3D TEXT SYSTEM — Tinkercad-quality extruded text
// Uses Three.js TextGeometry + FontLoader
// ═══════════════════════════════════════════

var loadedFonts = {};
var currentFontName = 'helvetiker_bold';
var textDepth = 0.8;
var textSize = 1.5;
var textBevel = true;

// Font data is embedded inline via script tags (no XHR needed)
var FONT_INLINE_DATA = {
  'helvetiker':       typeof FONT_DATA_HELVETIKER !== 'undefined' ? FONT_DATA_HELVETIKER : null,
  'helvetiker_bold':  typeof FONT_DATA_HELVETIKER_BOLD !== 'undefined' ? FONT_DATA_HELVETIKER_BOLD : null,
  'optimer':          typeof FONT_DATA_OPTIMER !== 'undefined' ? FONT_DATA_OPTIMER : null,
  'optimer_bold':     typeof FONT_DATA_OPTIMER_BOLD !== 'undefined' ? FONT_DATA_OPTIMER_BOLD : null,
};

var FONT_LABELS = {
  'helvetiker':       'Helvetica',
  'helvetiker_bold':  'Helvetica Bold',
  'optimer':          'Optimer',
  'optimer_bold':     'Optimer Bold',
};

/**
 * Load a font from inline data (instant, no network)
 */
function loadFont(name, callback) {
  if (loadedFonts[name]) {
    callback(loadedFonts[name]);
    return;
  }

  var data = FONT_INLINE_DATA[name];
  if (data) {
    try {
      var font = new THREE.Font(data);
      loadedFonts[name] = font;
      callback(font);
    } catch(e) {
      console.error('Failed to parse font ' + name + ':', e);
      callback(null);
    }
  } else {
    console.error('No inline data for font: ' + name);
    callback(null);
  }
}

/**
 * Preload all fonts on startup (instant since they're inline)
 */
function preloadFonts() {
  Object.keys(FONT_INLINE_DATA).forEach(function(name) {
    loadFont(name, function(font) {
      if (font) console.log('Font ready: ' + name);
    });
  });
}

/**
 * Create a 3D text mesh from font and add to scene
 */
function createTextMesh(text, font, color) {
  var geo = new THREE.TextGeometry(text, {
    font: font,
    size: textSize,
    height: textDepth,
    curveSegments: 12,
    bevelEnabled: textBevel,
    bevelThickness: 0.08,
    bevelSize: 0.05,
    bevelOffset: 0,
    bevelSegments: 3,
  });

  // Center the text geometry
  geo.computeBoundingBox();
  var bb = geo.boundingBox;
  var cx = -(bb.max.x - bb.min.x) / 2;
  var cy = -(bb.max.y - bb.min.y) / 2;
  geo.translate(cx, cy, 0);

  var mat = stdMat(color);
  var mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = 0;

  placeObj(mesh, textSize / 2 + 0.5);
  pushObj(mesh, 'text', 'Text: ' + text, {
    text: text,
    font: currentFontName,
    size: textSize,
    depth: textDepth,
    bevel: textBevel
  });

  selectObj(objects[objects.length - 1]);
}

/**
 * Add 3D text to the scene
 */
function addText(text) {
  if (!text || !text.trim()) { showToast('Type some text first!', 'warning'); return; }
  text = text.trim().substring(0, 30); // Cap length to prevent huge geometry
  text = text.replace(/[<>]/g, ''); // Strip HTML characters

  saveUndo();
  var color = nextColor();

  loadFont(currentFontName, function(font) {
    if (!font) {
      // Retry once after a short delay
      setTimeout(function() {
        loadFont(currentFontName, function(font2) {
          if (font2) {
            createTextMesh(text, font2, color);
          } else {
            showFontError();
          }
        });
      }, 500);
      return;
    }
    createTextMesh(text, font, color);
  });
}

/**
 * Add a single letter (A-Z, 0-9) as smooth 3D text
 */
function addLetter(ch) {
  addText(ch);
}

/**
 * Rebuild text geometry when params change
 */
function rebuildTextGeometry(obj) {
  if (!obj.params || !obj.params.text) return;

  var fontName = obj.params.font || currentFontName;
  loadFont(fontName, function(font) {
    if (!font || !obj.root.isMesh) return;

    var geo = new THREE.TextGeometry(obj.params.text, {
      font: font,
      size: obj.params.size || textSize,
      height: obj.params.depth || textDepth,
      curveSegments: 12,
      bevelEnabled: obj.params.bevel !== false,
      bevelThickness: 0.08,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 3,
    });

    geo.computeBoundingBox();
    var bb = geo.boundingBox;
    geo.translate(-(bb.max.x - bb.min.x) / 2, -(bb.max.y - bb.min.y) / 2, 0);

    obj.root.geometry.dispose();
    obj.root.geometry = geo;
    if (selHelper) selHelper.update();
  });
}

/**
 * Build the text input UI in the A-Z tab
 */
function buildTextUI() {
  var container = document.getElementById('text-tool');
  if (!container) return;

  container.innerHTML = '';

  // Text input
  var inputRow = document.createElement('div');
  inputRow.className = 'text-input-row';
  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'text-input';
  input.className = 'text-input';
  input.placeholder = 'Type your text...';
  input.maxLength = 20;
  var addBtn = document.createElement('button');
  addBtn.className = 'text-add-btn';
  addBtn.textContent = '+ Add';
  addBtn.onclick = function() {
    addText(input.value);
    input.value = '';
  };
  input.onkeydown = function(e) {
    if (e.key === 'Enter') { addBtn.click(); }
  };
  inputRow.appendChild(input);
  inputRow.appendChild(addBtn);
  container.appendChild(inputRow);

  // Font selector
  var fontRow = document.createElement('div');
  fontRow.className = 'text-font-row';
  var fontLabel = document.createElement('span');
  fontLabel.className = 'param-label';
  fontLabel.textContent = 'Font';
  var fontSel = document.createElement('select');
  fontSel.className = 'snap-select';
  fontSel.style.flex = '1';
  Object.keys(FONT_LABELS).forEach(function(key) {
    var opt = document.createElement('option');
    opt.value = key;
    opt.textContent = FONT_LABELS[key];
    if (key === currentFontName) opt.selected = true;
    fontSel.appendChild(opt);
  });
  fontSel.onchange = function() { currentFontName = fontSel.value; };
  fontRow.appendChild(fontLabel);
  fontRow.appendChild(fontSel);
  container.appendChild(fontRow);

  // Size slider
  var sizeRow = document.createElement('div');
  sizeRow.className = 'param-row';
  var sizeLabel = document.createElement('label');
  sizeLabel.className = 'param-label';
  sizeLabel.textContent = 'Size';
  var sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.className = 'param-slider';
  sizeSlider.min = 0.5; sizeSlider.max = 5; sizeSlider.step = 0.1;
  sizeSlider.value = textSize;
  var sizeVal = document.createElement('span');
  sizeVal.className = 'param-val';
  sizeVal.textContent = textSize.toFixed(1);
  sizeSlider.oninput = function() {
    textSize = parseFloat(sizeSlider.value);
    sizeVal.textContent = textSize.toFixed(1);
  };
  sizeRow.appendChild(sizeLabel);
  sizeRow.appendChild(sizeSlider);
  sizeRow.appendChild(sizeVal);
  container.appendChild(sizeRow);

  // Depth slider
  var depthRow = document.createElement('div');
  depthRow.className = 'param-row';
  var depthLabel = document.createElement('label');
  depthLabel.className = 'param-label';
  depthLabel.textContent = 'Depth';
  var depthSlider = document.createElement('input');
  depthSlider.type = 'range';
  depthSlider.className = 'param-slider';
  depthSlider.min = 0.1; depthSlider.max = 3; depthSlider.step = 0.1;
  depthSlider.value = textDepth;
  var depthVal = document.createElement('span');
  depthVal.className = 'param-val';
  depthVal.textContent = textDepth.toFixed(1);
  depthSlider.oninput = function() {
    textDepth = parseFloat(depthSlider.value);
    depthVal.textContent = textDepth.toFixed(1);
  };
  depthRow.appendChild(depthLabel);
  depthRow.appendChild(depthSlider);
  depthRow.appendChild(depthVal);
  container.appendChild(depthRow);

  // Quick letter buttons (A-Z)
  var letterLabel = document.createElement('div');
  letterLabel.className = 'sec-label';
  letterLabel.textContent = 'Quick Add Letter';
  container.appendChild(letterLabel);

  var letterGrid = document.createElement('div');
  letterGrid.className = 'lgrid';
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function(c) {
    var b = document.createElement('button');
    b.className = 'lbtn';
    b.textContent = c;
    b.onclick = function() { addLetter(c); };
    letterGrid.appendChild(b);
  });
  container.appendChild(letterGrid);

  // Quick number buttons (0-9)
  var numLabel = document.createElement('div');
  numLabel.className = 'sec-label';
  numLabel.textContent = 'Quick Add Number';
  container.appendChild(numLabel);

  var numGrid = document.createElement('div');
  numGrid.className = 'lgrid';
  '0123456789'.split('').forEach(function(c) {
    var b = document.createElement('button');
    b.className = 'lbtn';
    b.textContent = c;
    b.onclick = function() { addLetter(c); };
    numGrid.appendChild(b);
  });
  container.appendChild(numGrid);
}
