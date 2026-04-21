// ═══════════════════════════════════════════
// EDUCATIONAL CHALLENGES — Coordinate Quiz, Shape Quiz, Density Calc
// Gamified learning integrated into the 3D workspace
// ═══════════════════════════════════════════

var challengeActive = false;
var challengeScore = 0;
var challengeTotal = 0;
var challengeStep = 0;

// ─── COORDINATE GRID CHALLENGES ───────────────────

var COORD_CHALLENGES = {
  easy: [
    { prompt:'Place a Cube at position (2, 0, 0)', shape:'box', target:[2,0,0], tolerance:0.8 },
    { prompt:'Place a Sphere at position (0, 0, 3)', shape:'sphere', target:[0,0,3], tolerance:0.8 },
    { prompt:'Place a Cone at position (-2, 0, -2)', shape:'cone', target:[-2,0,-2], tolerance:0.8 },
    { prompt:'Place a Cylinder at position (3, 0, -1)', shape:'cylinder', target:[3,0,-1], tolerance:0.8 },
    { prompt:'Place a Cube at the Origin (0, 0, 0)', shape:'box', target:[0,0,0], tolerance:0.6 },
  ],
  medium: [
    { prompt:'Place a Sphere at (1.5, 2, -0.5)', shape:'sphere', target:[1.5,2,-0.5], tolerance:0.6 },
    { prompt:'Place a Cube at (-3, 0, 4)', shape:'box', target:[-3,0,4], tolerance:0.6 },
    { prompt:'Stack a Cylinder at (0, 3, 0) — up in the air!', shape:'cylinder', target:[0,3,0], tolerance:0.8 },
    { prompt:'Place a Pyramid at (2.5, 0, 2.5)', shape:'pyramid', target:[2.5,0,2.5], tolerance:0.6 },
    { prompt:'Place a Torus at (-1, 1.5, 3)', shape:'torus', target:[-1,1.5,3], tolerance:0.7 },
  ],
  hard: [
    { prompt:'Place a Sphere at exactly (3.5, 1.2, -2.5)', shape:'sphere', target:[3.5,1.2,-2.5], tolerance:0.4 },
    { prompt:'Place a Cube at (-4, 0.5, 4.5)', shape:'box', target:[-4,0.5,4.5], tolerance:0.4 },
    { prompt:'Place a Cone at (1, 3, -3)', shape:'cone', target:[1,3,-3], tolerance:0.5 },
    { prompt:'Place a Star at (-2.5, 0, 1.5)', shape:'star', target:[-2.5,0,1.5], tolerance:0.5 },
    { prompt:'Place a Heart at (0, 2, 0) — floating above center!', shape:'heart', target:[0,2,0], tolerance:0.5 },
  ]
};

function startCoordChallenge(difficulty) {
  var challenges = COORD_CHALLENGES[difficulty];
  if (!challenges) return;

  challengeActive = true;
  challengeScore = 0;
  challengeTotal = challenges.length;
  challengeStep = 0;

  // Clear scene (with proper dispose to prevent leaks)
  objects.forEach(function(o) {
    if (typeof disposeObject === 'function') disposeObject(o.root);
    scene.remove(o.root);
  });
  objects = [];
  undoStack = [];
  deselect();
  updateObjCount();

  showCoordStep(challenges);
}

var coordChallenges = null;

function showCoordStep(challenges) {
  coordChallenges = challenges;

  if (challengeStep >= challenges.length) {
    challengeActive = false;
    coordChallenges = null;
    var pct = Math.round(challengeScore / challengeTotal * 100);
    var stars = pct >= 90 ? '⭐⭐⭐' : pct >= 70 ? '⭐⭐' : pct >= 50 ? '⭐' : '💪';
    spatioAlert(stars, 'Challenge Complete!',
      'Score: ' + challengeScore + ' / ' + challengeTotal + ' (' + pct + '%)\n\n' +
      (pct >= 90 ? 'Amazing! You\'re a coordinate master!' :
       pct >= 70 ? 'Great job! Keep practicing!' :
       pct >= 50 ? 'Good effort! Try again to improve!' :
       'Keep trying! Coordinates take practice!')
    );
    return;
  }

  var ch = challenges[challengeStep];

  // Add shape immediately
  addShape(ch.shape);

  // Switch to move mode
  setMode('move');

  // Show the target in a toast (non-blocking) + update modebar
  showToast('📍 Challenge ' + (challengeStep+1) + ': Move to (' + ch.target.join(', ') + ')', 'info');
  document.getElementById('modebar').textContent =
    '🎯 CHALLENGE ' + (challengeStep+1) + '/' + challenges.length +
    ' — Move to (' + ch.target.join(', ') + ')  |  Press ENTER to check';

  // Show check button in viewport
  showCoordCheckOverlay(challenges);
}

function showCoordCheckOverlay(challenges) {
  var existing = document.getElementById('coord-check-bar');
  if (existing) existing.remove();

  var ch = challenges[challengeStep];
  var bar = document.createElement('div');
  bar.id = 'coord-check-bar';
  bar.innerHTML =
    '<span class="ccb-target">🎯 Target: (' + ch.target.join(', ') + ')</span>' +
    '<button class="ccb-btn ccb-check" onclick="checkCoordAnswer()">✓ Check Answer</button>' +
    '<button class="ccb-btn ccb-skip" onclick="skipCoordStep()">Skip ▶</button>' +
    '<button class="ccb-btn ccb-quit" onclick="quitCoordChallenge()">✕ Quit</button>';
  document.getElementById('vp').appendChild(bar);
}

function checkCoordAnswer() {
  if (!coordChallenges) return;
  var ch = coordChallenges[challengeStep];
  var last = objects[objects.length - 1];
  if (!last) { skipCoordStep(); return; }

  var pos = last.root.position;
  var dx = Math.abs(pos.x - ch.target[0]);
  var dy = Math.abs(pos.y - ch.target[1]);
  var dz = Math.abs(pos.z - ch.target[2]);
  var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

  if (dist <= ch.tolerance) {
    challengeScore++;
    showToast('✅ Correct! Distance: ' + dist.toFixed(2), 'success');
  } else {
    showToast('❌ Off by ' + dist.toFixed(1) + ' — target was (' + ch.target.join(', ') + ')', 'warning');
  }

  challengeStep++;
  setTimeout(function() { showCoordStep(coordChallenges); }, 1000);
}

function skipCoordStep() {
  challengeStep++;
  showCoordStep(coordChallenges);
}

function quitCoordChallenge() {
  challengeActive = false;
  coordChallenges = null;
  var bar = document.getElementById('coord-check-bar');
  if (bar) bar.remove();
  setMode('select');
  showToast('Challenge ended', 'info');
}

// ─── SHAPE QUIZ ──────────────────────────────────

var SHAPE_QUESTIONS = [
  // Faces, Edges, Vertices
  { q:'How many faces does a cube have?', a:'6', opts:['4','6','8','12'], diff:'easy' },
  { q:'How many edges does a cube have?', a:'12', opts:['6','8','12','24'], diff:'easy' },
  { q:'How many vertices (corners) does a cube have?', a:'8', opts:['4','6','8','12'], diff:'easy' },
  { q:'How many faces does a triangular pyramid (tetrahedron) have?', a:'4', opts:['3','4','5','6'], diff:'easy' },
  { q:'A sphere has how many flat faces?', a:'0', opts:['0','1','2','Infinite'], diff:'easy' },
  { q:'How many faces does a cylinder have?', a:'3', opts:['1','2','3','4'], diff:'medium' },
  { q:'How many edges does a cone have?', a:'1', opts:['0','1','2','3'], diff:'medium' },

  // Formulas
  { q:'Volume of a box is length × width × ___?', a:'height', opts:['height','radius','pi','area'], diff:'easy' },
  { q:'What is π (pi) approximately equal to?', a:'3.14', opts:['2.71','3.14','3.50','4.00'], diff:'easy' },
  { q:'Volume of a sphere: V = 4/3 × π × ___?', a:'r³', opts:['r²','r³','d²','2r'], diff:'medium' },
  { q:'Volume of a cone is what fraction of a cylinder?', a:'1/3', opts:['1/2','1/3','1/4','2/3'], diff:'medium' },
  { q:'Surface area of a cube with side 3cm?', a:'54 cm²', opts:['27 cm²','36 cm²','54 cm²','81 cm²'], diff:'hard' },

  // Pythagorean Theorem
  { q:'In a 3-4-5 right triangle, what is the hypotenuse?', a:'5', opts:['3','4','5','7'], diff:'medium' },
  { q:'a² + b² = c² is called the ___ theorem?', a:'Pythagorean', opts:['Euler','Pythagorean','Newton','Einstein'], diff:'easy' },
  { q:'If a=6 and b=8, what is c (hypotenuse)?', a:'10', opts:['9','10','12','14'], diff:'medium' },

  // Units
  { q:'How many millimeters in 1 centimeter?', a:'10', opts:['1','10','100','1000'], diff:'easy' },
  { q:'1 inch is approximately how many centimeters?', a:'2.54', opts:['1.00','2.54','3.14','5.08'], diff:'medium' },
  { q:'How many centimeters in 1 meter?', a:'100', opts:['10','100','1000','10000'], diff:'easy' },
  { q:'1 cm³ of water equals how many milliliters?', a:'1 mL', opts:['0.1 mL','1 mL','10 mL','100 mL'], diff:'medium' },

  // Angles & Rotation
  { q:'A full rotation is how many degrees?', a:'360°', opts:['90°','180°','270°','360°'], diff:'easy' },
  { q:'A right angle is how many degrees?', a:'90°', opts:['45°','90°','120°','180°'], diff:'easy' },
  { q:'How many lines of symmetry does a circle have?', a:'Infinite', opts:['1','4','8','Infinite'], diff:'medium' },

  // 3D Concepts
  { q:'What is the center point (0,0,0) called?', a:'Origin', opts:['Origin','Center','Zero','Base'], diff:'easy' },
  { q:'Which axis points UP in 3D space?', a:'Y', opts:['X','Y','Z','W'], diff:'easy' },
  { q:'Making an object bigger or smaller is called?', a:'Scaling', opts:['Translating','Rotating','Scaling','Morphing'], diff:'easy' },

  // Volume Calculations
  { q:'Volume of a cube with side 2cm?', a:'8 cm³', opts:['4 cm³','6 cm³','8 cm³','12 cm³'], diff:'medium' },
  { q:'Volume of a box: 3×4×5 cm?', a:'60 cm³', opts:['12 cm³','35 cm³','60 cm³','120 cm³'], diff:'medium' },
  { q:'A cylinder r=2cm, h=5cm. Volume ≈?', a:'62.8 cm³', opts:['31.4 cm³','62.8 cm³','100 cm³','125.6 cm³'], diff:'hard' },
  { q:'A cone has ___ the volume of a cylinder with same r and h', a:'one third', opts:['one half','one third','one quarter','same'], diff:'medium' },
  { q:'If you double all sides of a cube, volume becomes?', a:'8× bigger', opts:['2× bigger','4× bigger','6× bigger','8× bigger'], diff:'hard' },

  // Surface Area
  { q:'Surface area of a cube with side 2cm?', a:'24 cm²', opts:['8 cm²','12 cm²','24 cm²','48 cm²'], diff:'medium' },
  { q:'How many faces does a rectangular box have?', a:'6', opts:['4','6','8','12'], diff:'easy' },
  { q:'Which shape has the most surface area for its volume?', a:'Cube', opts:['Sphere','Cube','Cylinder','Cone'], diff:'hard' },

  // Real-World Measurements
  { q:'A standard door is approximately how tall?', a:'200 cm', opts:['100 cm','150 cm','200 cm','300 cm'], diff:'easy' },
  { q:'A soccer ball diameter is about?', a:'22 cm', opts:['10 cm','15 cm','22 cm','30 cm'], diff:'medium' },
  { q:'A soda can holds about how many mL?', a:'355 mL', opts:['200 mL','355 mL','500 mL','750 mL'], diff:'medium' },
  { q:'How many cups of water in 1 liter?', a:'About 4', opts:['About 2','About 4','About 6','About 8'], diff:'easy' },
  { q:'1 foot equals how many inches?', a:'12', opts:['6','10','12','16'], diff:'easy' },

  // 3D Printing
  { q:'What does "infill" mean in 3D printing?', a:'How solid inside', opts:['Print speed','How solid inside','Layer height','Nozzle size'], diff:'easy' },
  { q:'PLA filament density is about?', a:'1.24 g/cm³', opts:['0.5 g/cm³','1.0 g/cm³','1.24 g/cm³','2.5 g/cm³'], diff:'hard' },
  { q:'Which material floats in water?', a:'Wood', opts:['Steel','Wood','Glass','Gold'], diff:'easy' },
  { q:'Gold density is ~19.3 g/cm³. A 1cm³ gold cube weighs?', a:'19.3 grams', opts:['1.9 grams','9.3 grams','19.3 grams','193 grams'], diff:'hard' },

  // Cross-sections
  { q:'What shape do you get cutting a sphere in half?', a:'Circle', opts:['Oval','Circle','Square','Triangle'], diff:'easy' },
  { q:'Cut a cone horizontally — what shape?', a:'Circle', opts:['Triangle','Circle','Square','Oval'], diff:'medium' },
  { q:'Cut a cylinder vertically (top to bottom) — shape?', a:'Rectangle', opts:['Circle','Rectangle','Triangle','Oval'], diff:'medium' },
  { q:'What are "conic sections"?', a:'Shapes from slicing a cone', opts:['Types of ice cream','Shapes from slicing a cone','Parts of a circle','Cone-shaped buildings'], diff:'hard' },

  // Pythagorean Theorem Advanced
  { q:'If a=5 and b=12, what is c?', a:'13', opts:['11','13','15','17'], diff:'hard' },
  { q:'3D diagonal of a 3×4×12 box?', a:'13', opts:['12','13','14','19'], diff:'hard' },
  { q:'Which is NOT a Pythagorean triple?', a:'4, 5, 6', opts:['3, 4, 5','5, 12, 13','4, 5, 6','8, 15, 17'], diff:'hard' },
];

var quizQuestions = [];
var quizIndex = 0;
var quizScore = 0;

function startShapeQuiz(difficulty) {
  // Filter by difficulty
  if (difficulty === 'all') {
    quizQuestions = SHAPE_QUESTIONS.slice();
  } else {
    quizQuestions = SHAPE_QUESTIONS.filter(function(q) { return q.diff === difficulty; });
  }

  // Shuffle
  for (var i = quizQuestions.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i+1));
    var tmp = quizQuestions[i];
    quizQuestions[i] = quizQuestions[j];
    quizQuestions[j] = tmp;
  }

  // Limit to 10 questions
  quizQuestions = quizQuestions.slice(0, 10);
  quizIndex = 0;
  quizScore = 0;
  showQuizQuestion();
}

function showQuizQuestion() {
  if (quizIndex >= quizQuestions.length) {
    var pct = Math.round(quizScore / quizQuestions.length * 100);
    var stars = pct >= 90 ? '⭐⭐⭐' : pct >= 70 ? '⭐⭐' : pct >= 50 ? '⭐' : '💪';
    spatioAlert(stars, 'Quiz Complete!',
      'Score: ' + quizScore + ' / ' + quizQuestions.length + ' (' + pct + '%)\n\n' +
      (pct >= 90 ? 'Genius level! You really know your shapes!' :
       pct >= 70 ? 'Great work! You\'re getting it!' :
       pct >= 50 ? 'Nice try! Review the Learn tab and try again.' :
       'Keep learning! Check the formulas in the Learn tab.')
    );
    return;
  }

  var q = quizQuestions[quizIndex];

  // Shuffle options
  var opts = q.opts.slice();
  for (var i = opts.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i+1));
    var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
  }

  var btns = opts.map(function(o) {
    return { label: o, cls: 'modal-btn-quiz', value: o };
  });

  showModal({
    icon: '🧠',
    title: 'Question ' + (quizIndex+1) + ' / ' + quizQuestions.length,
    message: q.q,
    buttons: btns,
    onResult: function(answer) {
      if (String(answer) === String(q.a)) {
        quizScore++;
        showToast('✅ Correct!', 'success');
      } else {
        showToast('❌ Answer: ' + q.a, 'warning');
      }
      quizIndex++;
      setTimeout(showQuizQuestion, 800);
    }
  });
}

// ─── DENSITY / FLOAT CALCULATOR ──────────────────

var MATERIALS = {
  'PLA Plastic':   { density: 1.24, color: '#4cde88', icon: '🖨️' },
  'ABS Plastic':   { density: 1.04, color: '#ff8c42', icon: '🔧' },
  'Wood (Pine)':   { density: 0.50, color: '#c8a26a', icon: '🪵' },
  'Wood (Oak)':    { density: 0.75, color: '#8B6914', icon: '🪵' },
  'Aluminum':      { density: 2.70, color: '#b0bec5', icon: '🔩' },
  'Steel':         { density: 7.85, color: '#78909c', icon: '⚙️' },
  'Gold':          { density: 19.3, color: '#ffd700', icon: '🥇' },
  'Ice':           { density: 0.917, color: '#e0f7fa', icon: '🧊' },
  'Styrofoam':     { density: 0.05, color: '#ffffff', icon: '📦' },
  'Rubber':        { density: 1.20, color: '#333333', icon: '🏀' },
  'Glass':         { density: 2.50, color: '#80deea', icon: '🪟' },
  'Concrete':      { density: 2.40, color: '#9e9e9e', icon: '🧱' },
};

var selectedMaterial = 'PLA Plastic';

function setMaterial(name) {
  selectedMaterial = name;
  updateDensityCalc();
}

function updateDensityCalc() {
  var container = document.getElementById('density-calc');
  if (!container) return;

  if (!selectedRoot || selectedObjects.length !== 1) {
    container.innerHTML = '<div class="meas-empty">Select a shape to calculate density &amp; weight</div>';
    return;
  }

  var box = new THREE.Box3().setFromObject(selectedRoot);
  var size = new THREE.Vector3();
  box.getSize(size);

  // Approximate volume in cm³ (our units are roughly cm)
  var s = UNIT_SCALE[currentUnit] || 1;
  var w = size.x, h = size.y, d = size.z;
  var obj = selectedObjects[0];

  // Better volume estimate based on shape type
  var vol = 0;
  switch(obj.type) {
    case 'box': vol = w*h*d; break;
    case 'sphere': var r=Math.max(w,h,d)/2; vol = (4/3)*Math.PI*r*r*r; break;
    case 'cylinder': var r=Math.max(w,d)/2; vol = Math.PI*r*r*h; break;
    case 'cone': var r=Math.max(w,d)/2; vol = (1/3)*Math.PI*r*r*h; break;
    default: vol = w*h*d*0.6; // rough approximation
  }

  var mat = MATERIALS[selectedMaterial];
  var weight = vol * mat.density;
  var floats = mat.density < 1.0;

  // Material selector buttons
  var html = '<div class="dens-label">Material</div><div class="dens-mat-grid">';
  Object.keys(MATERIALS).forEach(function(name) {
    var m = MATERIALS[name];
    var active = name === selectedMaterial ? ' active' : '';
    html += '<button class="dens-mat-btn' + active + '" onclick="setMaterial(\'' + name + '\')" title="' + name + ' — ' + m.density + ' g/cm³">' +
      m.icon + ' ' + name.split(' ')[0] + '</button>';
  });
  html += '</div>';

  html += '<div class="meas-section">' +
    '<div class="meas-title">⚖️ Weight Calculation</div>' +
    '<div class="meas-formula">Weight = Volume × Density</div>' +
    '<div class="meas-formula">Weight = ' + vol.toFixed(1) + ' cm³ × ' + mat.density + ' g/cm³</div>' +
    '<div class="meas-result">' + formatWeight(weight) + '</div>' +
  '</div>';

  html += '<div class="meas-section">' +
    '<div class="meas-title">' + (floats ? '🏊 It FLOATS!' : '⚓ It SINKS!') + '</div>' +
    '<div class="dens-float-bar">' +
      '<div class="dens-water-line"></div>' +
      '<div class="dens-object" style="bottom:' + (floats ? Math.max(20, 70 - mat.density*50) : 5) + '%;background:' + mat.color + '">' +
        mat.icon +
      '</div>' +
    '</div>' +
    '<p style="font-size:11px;color:#7a9ab8;margin-top:6px">' +
      mat.density + ' g/cm³ ' + (floats ? '< ' : '> ') + '1.0 g/cm³ (water)' +
      (floats ? ' — lighter than water!' : ' — heavier than water!') +
    '</p>' +
  '</div>';

  // Fun comparison
  html += '<div class="meas-section">' +
    '<div class="meas-title">🤔 How Heavy Is That?</div>' +
    '<div class="factrow">' + weightComparison(weight) + '</div>' +
  '</div>';

  container.innerHTML = html;
}

function formatWeight(grams) {
  if (grams < 1) return (grams * 1000).toFixed(1) + ' mg';
  if (grams < 1000) return grams.toFixed(1) + ' g';
  return (grams / 1000).toFixed(2) + ' kg (' + (grams / 453.6).toFixed(1) + ' lbs)';
}

function weightComparison(grams) {
  var comparisons = [];
  if (grams < 1) comparisons.push('<div class="fact">About as heavy as a grain of rice</div>');
  else if (grams < 5) comparisons.push('<div class="fact">About as heavy as a paperclip (' + (grams/1).toFixed(1) + 'x)</div>');
  else if (grams < 30) comparisons.push('<div class="fact">About ' + (grams/4.5).toFixed(1) + ' nickels</div>');
  else if (grams < 200) comparisons.push('<div class="fact">About ' + (grams/28.35).toFixed(1) + ' ounces</div>');
  else if (grams < 1000) comparisons.push('<div class="fact">About ' + (grams/453.6).toFixed(1) + ' pounds</div>');
  else comparisons.push('<div class="fact">About ' + (grams/1000).toFixed(1) + ' kg — like ' + (grams/453.6).toFixed(0) + ' sticks of butter!</div>');

  if (grams > 0) comparisons.push('<div class="fact">🖨️ 3D print cost (PLA): ~$' + (grams * 0.02).toFixed(2) + '</div>');
  return comparisons.join('');
}
