// ═══════════════════════════════════════════
// SHAPES — Palette, Shape Factory
// ═══════════════════════════════════════════

var PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#f0f0f0','#334155'];
var ci = 0;
function nextColor() { var c = new THREE.Color(PALETTE[ci % PALETTE.length]); ci++; return c; }

function stdMat(color) {
  return new THREE.MeshStandardMaterial({color:color, roughness:0.45, metalness:0.08});
}

var placeCounter = 0;
function placeObj(root, halfH) {
  root.position.y = halfH;
  // Smart placement: at camera target with slight spiral offset
  var angle = placeCounter * 1.2;
  var dist = Math.min(placeCounter * 0.8, 6);
  root.position.x = camTarget.x + Math.cos(angle) * dist;
  root.position.z = camTarget.z + Math.sin(angle) * dist;
  placeCounter++;
  root.castShadow = true;
  root.traverse(function(c) { if(c.isMesh){c.castShadow=true; c.receiveShadow=true;} });
  scene.add(root);
  updateObjCount();
}

function addShape(type) {
  saveUndo();
  var color = nextColor();
  var mat = stdMat(color);
  var mesh, geo, grp;

  switch(type) {
    case 'box': {
      geo = new THREE.BoxGeometry(2,2,2);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 1);
      pushObj(mesh, type, 'Cube');
      break;
    }
    case 'sphere': {
      geo = new THREE.SphereGeometry(1.2, 36, 36);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 1.2);
      pushObj(mesh, type, 'Sphere');
      break;
    }
    case 'cylinder': {
      geo = new THREE.CylinderGeometry(0.9, 0.9, 2.5, 36);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 1.25);
      pushObj(mesh, type, 'Cylinder');
      break;
    }
    case 'cone': {
      geo = new THREE.ConeGeometry(1.1, 2.5, 36);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 1.25);
      pushObj(mesh, type, 'Cone');
      break;
    }
    case 'torus': {
      geo = new THREE.TorusGeometry(1.1, 0.38, 18, 54);
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI/2;
      placeObj(mesh, 0.38);
      pushObj(mesh, type, 'Torus');
      break;
    }
    case 'pyramid': {
      geo = new THREE.ConeGeometry(1.3, 2.5, 4);
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = Math.PI/4;
      placeObj(mesh, 1.25);
      pushObj(mesh, type, 'Pyramid');
      break;
    }
    case 'wedge': {
      var sh = new THREE.Shape();
      sh.moveTo(0,0); sh.lineTo(2.2,0); sh.lineTo(0,2.2); sh.closePath();
      geo = new THREE.ExtrudeGeometry(sh, {depth:2, bevelEnabled:false});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Wedge');
      break;
    }
    case 'tube': {
      grp = new THREE.Group();
      var cyl = new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.4,36,1,true), new THREE.MeshStandardMaterial({color:color,roughness:.45,side:THREE.DoubleSide}));
      var cap1 = new THREE.Mesh(new THREE.RingGeometry(0.85,1.02,36), stdMat(color));
      var cap2 = cap1.clone();
      cap1.rotation.x = Math.PI/2; cap1.position.y=1.2;
      cap2.rotation.x = -Math.PI/2; cap2.position.y=-1.2;
      grp.add(cyl,cap1,cap2);
      placeObj(grp,1.2);
      pushObj(grp, type, 'Tube');
      break;
    }
    case 'star': {
      var sh = new THREE.Shape();
      var or2=1.3, ir=0.55, n=5;
      for(var i=0;i<n*2;i++){
        var r2=i%2===0?or2:ir;
        var a=(i*Math.PI/n)-Math.PI/2;
        if(i===0) sh.moveTo(Math.cos(a)*r2, Math.sin(a)*r2);
        else sh.lineTo(Math.cos(a)*r2, Math.sin(a)*r2);
      }
      sh.closePath();
      geo = new THREE.ExtrudeGeometry(sh, {depth:0.7, bevelEnabled:true, bevelSize:0.06, bevelSegments:2});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Star');
      break;
    }
    case 'heart': {
      var sh = new THREE.Shape();
      sh.moveTo(0,0);
      sh.bezierCurveTo(0,-0.3,-0.55,-1.15,-1.25,-1.15);
      sh.bezierCurveTo(-2,-1.15,-2,-0.1,-2,-0.1);
      sh.bezierCurveTo(-2,0.65,-1.4,1.45,0,2.1);
      sh.bezierCurveTo(1.4,1.45,2,0.65,2,-0.1);
      sh.bezierCurveTo(2,-0.1,2,-1.15,1.25,-1.15);
      sh.bezierCurveTo(0.55,-1.15,0,-0.3,0,0);
      geo = new THREE.ExtrudeGeometry(sh, {depth:0.65, bevelEnabled:true, bevelSize:0.09, bevelSegments:2});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x=-Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Heart');
      break;
    }
    case 'arrow': {
      var sh = new THREE.Shape();
      sh.moveTo(0,0.5); sh.lineTo(1.1,0.5); sh.lineTo(1.1,1.2); sh.lineTo(2.3,0);
      sh.lineTo(1.1,-1.2); sh.lineTo(1.1,-0.5); sh.lineTo(0,-0.5); sh.closePath();
      geo = new THREE.ExtrudeGeometry(sh, {depth:0.55, bevelEnabled:false});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x=-Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Arrow');
      break;
    }
    case 'ring': {
      geo = new THREE.TorusGeometry(1.3, 0.22, 18, 54);
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x=Math.PI/2;
      placeObj(mesh,0.22);
      pushObj(mesh, type, 'Ring');
      break;
    }
    case 'capsule': {
      grp = new THREE.Group();
      var body = new THREE.Mesh(new THREE.CylinderGeometry(0.65,0.65,1.6,30), stdMat(color));
      var capT = new THREE.Mesh(new THREE.SphereGeometry(0.65,30,30), stdMat(color));
      var capB = capT.clone();
      capT.position.y=0.8; capB.position.y=-0.8;
      grp.add(body,capT,capB);
      placeObj(grp,1.45);
      pushObj(grp, type, 'Capsule');
      break;
    }
    case 'prism': {
      var sh = new THREE.Shape();
      sh.moveTo(-1.1,0); sh.lineTo(1.1,0); sh.lineTo(0,1.8); sh.closePath();
      geo = new THREE.ExtrudeGeometry(sh, {depth:2.2, bevelEnabled:false});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x=-Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Prism');
      break;
    }
    case 'halfball': {
      geo = new THREE.SphereGeometry(1.3, 32, 32, 0, Math.PI*2, 0, Math.PI/2);
      mesh = new THREE.Mesh(geo, mat);
      var cap = new THREE.Mesh(new THREE.CircleGeometry(1.3,32), stdMat(color));
      cap.rotation.x=Math.PI/2;
      grp = new THREE.Group();
      grp.add(mesh,cap);
      placeObj(grp,0);
      pushObj(grp, type, 'Half Ball');
      break;
    }
    case 'bolt': {
      var sh = new THREE.Shape();
      sh.moveTo(0.5,2); sh.lineTo(-0.3,0.6); sh.lineTo(0.4,0.6); sh.lineTo(-0.5,-2);
      sh.lineTo(0.3,-0.5); sh.lineTo(-0.4,-0.5); sh.closePath();
      geo = new THREE.ExtrudeGeometry(sh, {depth:0.45, bevelEnabled:false});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x=-Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Lightning');
      break;
    }

    // ── NEW SHAPES (Tinkercad-inspired) ──

    case 'dodecahedron': {
      geo = new THREE.DodecahedronGeometry(1.2);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 1.2);
      pushObj(mesh, type, 'Dodecahedron', {radius:1.2});
      break;
    }
    case 'icosahedron': {
      geo = new THREE.IcosahedronGeometry(1.2);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 1.2);
      pushObj(mesh, type, 'Icosahedron', {radius:1.2});
      break;
    }
    case 'octahedron': {
      geo = new THREE.OctahedronGeometry(1.2);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 1.2);
      pushObj(mesh, type, 'Octahedron', {radius:1.2});
      break;
    }
    case 'hexagon': {
      geo = new THREE.CylinderGeometry(1.2, 1.2, 1.5, 6);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 0.75);
      pushObj(mesh, type, 'Hexagon', {radius:1.2, height:1.5});
      break;
    }
    case 'pentagon': {
      geo = new THREE.CylinderGeometry(1.2, 1.2, 1.5, 5);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 0.75);
      pushObj(mesh, type, 'Pentagon', {radius:1.2, height:1.5});
      break;
    }
    case 'roundroof': {
      // Half cylinder (arch/round roof)
      geo = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 32, 1, false, 0, Math.PI);
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI/2;
      placeObj(mesh, 1.2);
      pushObj(mesh, type, 'Round Roof');
      break;
    }
    case 'paraboloid': {
      // Lathe a parabola curve
      var pts = [];
      for(var i=0; i<=20; i++) {
        var t = i/20;
        pts.push(new THREE.Vector2(t*1.2, t*t*2));
      }
      geo = new THREE.LatheGeometry(pts, 32);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Paraboloid');
      break;
    }
    case 'trapezoid': {
      var sh = new THREE.Shape();
      sh.moveTo(-1.2, 0); sh.lineTo(1.2, 0); sh.lineTo(0.7, 1.5); sh.lineTo(-0.7, 1.5); sh.closePath();
      geo = new THREE.ExtrudeGeometry(sh, {depth:1.5, bevelEnabled:false});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Trapezoid');
      break;
    }
    case 'crescent': {
      var sh = new THREE.Shape();
      sh.absarc(0, 0, 1.2, Math.PI*0.25, Math.PI*1.75, false);
      sh.absarc(0.4, 0, 1.0, Math.PI*1.75, Math.PI*0.25, true);
      geo = new THREE.ExtrudeGeometry(sh, {depth:0.5, bevelEnabled:true, bevelSize:0.04, bevelSegments:2});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Crescent Moon');
      break;
    }
    case 'diamond': {
      // Double cone (diamond shape)
      grp = new THREE.Group();
      var top = new THREE.Mesh(new THREE.ConeGeometry(1, 1.2, 8), stdMat(color));
      var bot = new THREE.Mesh(new THREE.ConeGeometry(1, 1.8, 8), stdMat(color));
      top.position.y = 0.6;
      bot.rotation.x = Math.PI;
      bot.position.y = -0.9;
      top.castShadow=true; top.receiveShadow=true;
      bot.castShadow=true; bot.receiveShadow=true;
      grp.add(top, bot);
      placeObj(grp, 1.5);
      pushObj(grp, type, 'Diamond');
      break;
    }
    case 'egg': {
      // Lathe an egg profile
      var pts = [];
      for(var i=0; i<=24; i++) {
        var t = i/24;
        var angle = t * Math.PI;
        var r2 = Math.sin(angle) * 0.9 * (1 + 0.2*Math.cos(angle));
        var y = -Math.cos(angle) * 1.3;
        pts.push(new THREE.Vector2(r2, y));
      }
      geo = new THREE.LatheGeometry(pts, 32);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 1.3);
      pushObj(mesh, type, 'Egg');
      break;
    }
    case 'spring': {
      // Parametric spring/coil
      var curve = [];
      var coils = 4, r3 = 0.8, h3 = 3;
      for(var i=0; i<=coils*32; i++) {
        var t = i/(coils*32);
        curve.push(new THREE.Vector3(
          Math.cos(t*coils*Math.PI*2) * r3,
          t * h3,
          Math.sin(t*coils*Math.PI*2) * r3
        ));
      }
      var path = new THREE.CatmullRomCurve3(curve);
      geo = new THREE.TubeGeometry(path, coils*32, 0.12, 8, false);
      mesh = new THREE.Mesh(geo, mat);
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Spring');
      break;
    }
    case 'gear': {
      // Flat gear shape
      var sh = new THREE.Shape();
      var teeth = 12, outerR = 1.4, innerR = 1.1, toothW = 0.12;
      for(var i=0; i<teeth; i++) {
        var a1 = (i/teeth)*Math.PI*2;
        var a2 = ((i+0.3)/teeth)*Math.PI*2;
        var a3 = ((i+0.5)/teeth)*Math.PI*2;
        var a4 = ((i+0.8)/teeth)*Math.PI*2;
        if(i===0) sh.moveTo(Math.cos(a1)*innerR, Math.sin(a1)*innerR);
        sh.lineTo(Math.cos(a2)*innerR, Math.sin(a2)*innerR);
        sh.lineTo(Math.cos(a2)*outerR, Math.sin(a2)*outerR);
        sh.lineTo(Math.cos(a3)*outerR, Math.sin(a3)*outerR);
        sh.lineTo(Math.cos(a4)*innerR, Math.sin(a4)*innerR);
      }
      sh.closePath();
      // Center hole
      var hole = new THREE.Path();
      hole.absarc(0, 0, 0.35, 0, Math.PI*2, true);
      sh.holes.push(hole);
      geo = new THREE.ExtrudeGeometry(sh, {depth:0.6, bevelEnabled:false});
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI/2;
      placeObj(mesh, 0);
      pushObj(mesh, type, 'Gear');
      break;
    }
  }

  var last = objects[objects.length-1];
  if (last) selectObj(last);
}

// Letters/Text handled by spatio-text.js
