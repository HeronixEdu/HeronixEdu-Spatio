// ═══════════════════════════════════════════
// INTERACTIVE GUIDED TUTORIALS
// Step-by-step lessons inspired by Tinkercad's Learning Center
// ═══════════════════════════════════════════

var tutorialActive = false;
var tutorialLesson = null;
var tutorialStep = 0;
var tutorialOverlay = null;

var LESSONS = {

  // ── LESSON 1: First Steps ──
  basics: {
    title: 'Lesson 1: Your First 3D Shape',
    steps: [
      {
        msg: 'Welcome to Spatio Studio! Let\'s learn how to create and move 3D shapes.\n\nClick "Next" to begin!',
        highlight: null,
        action: null
      },
      {
        msg: 'Click the "Cube" button in the Shapes panel on the left to add a cube to your scene.',
        highlight: '#tab-shapes .shbtn:first-child',
        action: 'waitForShape',
        waitType: 'box'
      },
      {
        msg: 'Great! You made a cube! Now let\'s move it.\n\nClick the "Move" button in the top toolbar.',
        highlight: '#btn-move',
        action: 'waitForMode',
        waitMode: 'move'
      },
      {
        msg: 'See the colored arrows on the cube? Those are the transform gizmo!\n\n🔴 Red = X axis (left/right)\n🟢 Green = Y axis (up/down)\n🔵 Blue = Z axis (forward/back)\n\nTry dragging an arrow to move the cube!',
        highlight: null,
        action: null
      },
      {
        msg: 'Now try the View Cube! Click "F" (Front), "T" (Top), or "R" (Right) in the top-right corner to see your cube from different angles.',
        highlight: '#viewcube',
        action: null
      },
      {
        msg: 'You can also orbit by left-dragging on empty space, pan with right-drag, and zoom with scroll wheel.\n\nTry it now!',
        highlight: null,
        action: null
      },
      {
        msg: 'Now add a Sphere! Click the "Sphere" button in the Shapes panel.',
        highlight: '#tab-shapes',
        action: 'waitForShape',
        waitType: 'sphere'
      },
      {
        msg: 'Excellent! You now have two shapes in your scene.\n\nCheck the "Scene" tab on the left to see all your objects listed!',
        highlight: null,
        action: null
      },
      {
        msg: '🎉 Lesson 1 Complete!\n\nYou learned how to:\n✅ Add shapes\n✅ Move shapes with the gizmo\n✅ View from different angles\n✅ Navigate the viewport\n\nTry Lesson 2 to learn about making holes!',
        highlight: null,
        action: null
      }
    ]
  },

  // ── LESSON 2: Holes & Grouping (CSG) ──
  holes: {
    title: 'Lesson 2: Making Holes (Boolean CSG)',
    steps: [
      {
        msg: 'In this lesson, you\'ll learn the most powerful trick in 3D modeling: cutting holes!\n\nThis is how you make a cup, a window, or anything with a hole in it.',
        highlight: null,
        action: null
      },
      {
        msg: 'First, add a Cube. Click the Cube button.',
        highlight: '#tab-shapes .shbtn:first-child',
        action: 'waitForShape',
        waitType: 'box'
      },
      {
        msg: 'Now add a Cylinder. This will become our hole!',
        highlight: '#tab-shapes',
        action: 'waitForShape',
        waitType: 'cylinder'
      },
      {
        msg: 'Move the cylinder so it overlaps with the cube. Switch to Move mode and use the gizmo arrows.',
        highlight: '#btn-move',
        action: null
      },
      {
        msg: 'Now for the magic! Click the cylinder to select it, then click the "Solid" button in the toolbar to turn it into a HOLE.',
        highlight: '#btn-hole',
        action: null
      },
      {
        msg: 'Notice the cylinder became see-through? That means it\'s a hole shape now.\n\nNext, we need to select BOTH shapes. Hold Shift and click the cube to add it to your selection.',
        highlight: null,
        action: null
      },
      {
        msg: 'With both shapes selected, click the "Group" button. This will combine them — the hole will cut through the solid!',
        highlight: null,
        action: null
      },
      {
        msg: '🎉 Lesson 2 Complete!\n\nYou learned how to:\n✅ Toggle shapes between Solid and Hole\n✅ Multi-select with Shift+Click\n✅ Group shapes to cut holes\n✅ Use Boolean CSG operations\n\nTry Lesson 3 to learn about colors and exporting!',
        highlight: null,
        action: null
      }
    ]
  },

  // ── LESSON 3: Color & Export ──
  export: {
    title: 'Lesson 3: Colors & Exporting',
    steps: [
      {
        msg: 'Let\'s make your model colorful and learn how to save it for 3D printing!',
        highlight: null,
        action: null
      },
      {
        msg: 'Add any shape you like to the scene.',
        highlight: '#tab-shapes',
        action: null
      },
      {
        msg: 'Click on a shape to select it. Then look at the Properties panel on the right — you\'ll see color swatches!',
        highlight: '#rp',
        action: null
      },
      {
        msg: 'Click any color swatch to change your shape\'s color. You can also click the color picker square for a custom color!',
        highlight: '#swatches',
        action: null
      },
      {
        msg: 'Now let\'s try rotating! Click the "Rotate" button in the toolbar, then drag the colored rings on the gizmo.',
        highlight: '#btn-rotate',
        action: null
      },
      {
        msg: 'And scaling! Click "Scale" and drag the gizmo handles to make shapes bigger or smaller.',
        highlight: '#btn-scale',
        action: null
      },
      {
        msg: 'Ready to export? Click "STL" to save for 3D printing, "OBJ" for other 3D software, or "GLTF" for web/AR viewers!',
        highlight: null,
        action: null
      },
      {
        msg: 'Don\'t forget to save your project! Click the Save button (💾) to keep your work as a .spatio file you can open later.',
        highlight: null,
        action: null
      },
      {
        msg: '🎉 Lesson 3 Complete!\n\nYou learned how to:\n✅ Change colors\n✅ Rotate and scale shapes\n✅ Export for 3D printing (STL)\n✅ Save your project\n\nYou\'re now a 3D modeling pro! Keep creating!',
        highlight: null,
        action: null
      }
    ]
  }
};

function startTutorial(lessonId) {
  var lesson = LESSONS[lessonId];
  if (!lesson) return;

  tutorialActive = true;
  tutorialLesson = lesson;
  tutorialStep = 0;

  // Create overlay if not exists
  if (!tutorialOverlay) {
    tutorialOverlay = document.createElement('div');
    tutorialOverlay.id = 'tutorial-overlay';
    tutorialOverlay.innerHTML =
      '<div id="tut-box">' +
        '<div id="tut-title"></div>' +
        '<div id="tut-step-count"></div>' +
        '<div id="tut-msg"></div>' +
        '<div id="tut-btns">' +
          '<button class="tut-btn tut-prev" onclick="tutorialPrev()">&#9664; Back</button>' +
          '<button class="tut-btn tut-next" onclick="tutorialNext()">Next &#9654;</button>' +
          '<button class="tut-btn tut-close" onclick="closeTutorial()">&#10005; Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(tutorialOverlay);
  }

  tutorialOverlay.style.display = 'flex';
  showTutorialStep();
}

function showTutorialStep() {
  if (!tutorialLesson) return;
  var step = tutorialLesson.steps[tutorialStep];
  if (!step) { closeTutorial(); return; }

  document.getElementById('tut-title').textContent = tutorialLesson.title;
  document.getElementById('tut-step-count').textContent =
    'Step ' + (tutorialStep + 1) + ' of ' + tutorialLesson.steps.length;
  document.getElementById('tut-msg').textContent = step.msg;

  // Show/hide back button
  var prevBtn = document.querySelector('.tut-prev');
  prevBtn.style.display = tutorialStep > 0 ? 'inline-block' : 'none';

  // Change next button text on last step
  var nextBtn = document.querySelector('.tut-next');
  nextBtn.textContent = (tutorialStep === tutorialLesson.steps.length - 1) ? '✓ Finish' : 'Next ▶';

  // Highlight element
  clearTutorialHighlight();
  if (step.highlight) {
    var el = document.querySelector(step.highlight);
    if (el) {
      el.classList.add('tut-highlight');
      el.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }
  }
}

function tutorialNext() {
  tutorialStep++;
  if (tutorialStep >= tutorialLesson.steps.length) {
    closeTutorial();
  } else {
    showTutorialStep();
  }
}

function tutorialPrev() {
  if (tutorialStep > 0) {
    tutorialStep--;
    showTutorialStep();
  }
}

function closeTutorial() {
  tutorialActive = false;
  tutorialLesson = null;
  tutorialStep = 0;
  clearTutorialHighlight();
  if (tutorialOverlay) tutorialOverlay.style.display = 'none';
}

function clearTutorialHighlight() {
  document.querySelectorAll('.tut-highlight').forEach(function(el) {
    el.classList.remove('tut-highlight');
  });
}
