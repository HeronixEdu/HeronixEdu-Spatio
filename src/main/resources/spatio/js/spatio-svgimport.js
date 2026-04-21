// ═══════════════════════════════════════════
// SVG IMPORT — Draw in Paint, bring into 3D
// Loads SVG paths and extrudes them into 3D shapes
// ═══════════════════════════════════════════

var svgExtrudeDepth = 1.0;

function importSVG() {
  if (window.javaApp && window.javaApp.showImportDialog) {
    window.javaApp.showImportDialog().then(function(path) {
      if (!path) return;
      window.javaApp.readFile(path).then(function(content) {
        if (!content) return;
        parseSVGContent(content);
      });
    });
  } else {
    // Browser fallback
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) { parseSVGContent(ev.target.result); };
      reader.readAsText(file);
    };
    input.click();
  }
}

function parseSVGContent(svgText) {
  try {
    // SECURITY: Limit SVG size (5MB max)
    if (svgText.length > 5 * 1024 * 1024) {
      showToast('SVG file too large (max 5MB)', 'warning');
      return;
    }
    // SECURITY: Strip dangerous elements from SVG
    svgText = svgText.replace(/<script[\s\S]*?<\/script>/gi, '');
    svgText = svgText.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
    svgText = svgText.replace(/on\w+\s*=/gi, 'data-blocked=');

    var loader = new THREE.SVGLoader();
    var data = loader.parse(svgText);
    var paths = data.paths;

    if (!paths || paths.length === 0) {
      showToast('No paths found in SVG', 'warning');
      return;
    }

    saveUndo();
    var color = nextColor();
    var grp = new THREE.Group();
    var shapeCount = 0;

    paths.forEach(function(path) {
      var shapes = path.toShapes(true);
      var pathColor = path.color ? new THREE.Color(path.color) : color;

      shapes.forEach(function(shape) {
        var geo = new THREE.ExtrudeGeometry(shape, {
          depth: svgExtrudeDepth,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.03,
          bevelSegments: 2,
        });

        var mat = new THREE.MeshStandardMaterial({
          color: pathColor,
          roughness: 0.45,
          metalness: 0.08,
          side: THREE.DoubleSide,
        });

        var mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        grp.add(mesh);
        shapeCount++;
      });
    });

    if (shapeCount === 0) {
      showToast('Could not create shapes from SVG', 'warning');
      return;
    }

    // Center and scale the SVG group
    var box = new THREE.Box3().setFromObject(grp);
    var center = new THREE.Vector3();
    var size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // Scale to fit ~5 units
    var maxDim = Math.max(size.x, size.y, size.z);
    var scaleFactor = maxDim > 0 ? 5 / maxDim : 1;
    grp.scale.set(scaleFactor, -scaleFactor, scaleFactor); // Flip Y (SVG is top-down)
    grp.position.set(-center.x * scaleFactor, center.y * scaleFactor + 2, -center.z * scaleFactor);

    // Rotate to lay flat on the grid
    grp.rotation.x = -Math.PI / 2;

    scene.add(grp);
    pushObj(grp, 'svg', 'SVG Import (' + shapeCount + ' paths)', { depth: svgExtrudeDepth });
    selectObj(objects[objects.length - 1]);

    showToast('SVG imported! ' + shapeCount + ' shapes extruded to 3D', 'success');

  } catch(e) {
    console.error('SVG import error:', e);
    spatioAlert('❌', 'SVG Import Failed', 'Could not parse this SVG file.\n\nMake sure it contains valid path data.\n\n🔍 Details: ' + e.message);
  }
}
