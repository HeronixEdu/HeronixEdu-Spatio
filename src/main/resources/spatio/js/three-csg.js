/**
 * CSG (Constructive Solid Geometry) for Three.js
 * Based on csg.js by Evan Wallace (MIT License)
 * Adapted for Three.js BufferGeometry (r128+)
 *
 * Operations: union, subtract, intersect
 */
(function() {
  'use strict';

  // ─── Vertex ───
  function CSGVertex(pos, normal) {
    this.pos = pos.clone();
    this.normal = normal.clone();
  }
  CSGVertex.prototype.clone = function() {
    return new CSGVertex(this.pos, this.normal);
  };
  CSGVertex.prototype.flip = function() {
    this.normal.negate();
  };
  CSGVertex.prototype.interpolate = function(other, t) {
    return new CSGVertex(
      this.pos.clone().lerp(other.pos, t),
      this.normal.clone().lerp(other.normal, t).normalize()
    );
  };

  // ─── Plane ───
  var EPSILON = 1e-5;
  var COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;

  function CSGPlane(normal, w) {
    this.normal = normal;
    this.w = w;
  }
  CSGPlane.fromPoints = function(a, b, c) {
    var n = new THREE.Vector3().copy(b).sub(a).cross(
      new THREE.Vector3().copy(c).sub(a)
    ).normalize();
    return new CSGPlane(n, n.dot(a));
  };
  CSGPlane.prototype.clone = function() {
    return new CSGPlane(this.normal.clone(), this.w);
  };
  CSGPlane.prototype.flip = function() {
    this.normal.negate();
    this.w = -this.w;
  };
  CSGPlane.prototype.splitPolygon = function(polygon, coplanarFront, coplanarBack, front, back) {
    var types = [];
    var polyType = 0;
    for (var i = 0; i < polygon.vertices.length; i++) {
      var t = this.normal.dot(polygon.vertices[i].pos) - this.w;
      var type = (t < -EPSILON) ? BACK : (t > EPSILON) ? FRONT : COPLANAR;
      polyType |= type;
      types.push(type);
    }
    switch (polyType) {
      case COPLANAR:
        (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
        break;
      case FRONT:
        front.push(polygon);
        break;
      case BACK:
        back.push(polygon);
        break;
      case SPANNING:
        var f = [], b2 = [];
        for (var i = 0; i < polygon.vertices.length; i++) {
          var j = (i + 1) % polygon.vertices.length;
          var ti = types[i], tj = types[j];
          var vi = polygon.vertices[i], vj = polygon.vertices[j];
          if (ti !== BACK) f.push(vi);
          if (ti !== FRONT) b2.push(ti !== BACK ? vi.clone() : vi);
          if ((ti | tj) === SPANNING) {
            var t2 = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(new THREE.Vector3().copy(vj.pos).sub(vi.pos));
            var v = vi.interpolate(vj, t2);
            f.push(v);
            b2.push(v.clone());
          }
        }
        if (f.length >= 3) front.push(new CSGPolygon(f));
        if (b2.length >= 3) back.push(new CSGPolygon(b2));
        break;
    }
  };

  // ─── Polygon ───
  function CSGPolygon(vertices) {
    this.vertices = vertices;
    this.plane = CSGPlane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
  }
  CSGPolygon.prototype.clone = function() {
    return new CSGPolygon(this.vertices.map(function(v) { return v.clone(); }));
  };
  CSGPolygon.prototype.flip = function() {
    this.vertices.reverse().forEach(function(v) { v.flip(); });
    this.plane.flip();
  };

  // ─── BSP Node ───
  function CSGNode(polygons) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygons = [];
    if (polygons) this.build(polygons);
  }
  CSGNode.prototype.clone = function() {
    var node = new CSGNode();
    node.plane = this.plane && this.plane.clone();
    node.front = this.front && this.front.clone();
    node.back = this.back && this.back.clone();
    node.polygons = this.polygons.map(function(p) { return p.clone(); });
    return node;
  };
  CSGNode.prototype.invert = function() {
    for (var i = 0; i < this.polygons.length; i++) this.polygons[i].flip();
    if (this.plane) this.plane.flip();
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    var temp = this.front;
    this.front = this.back;
    this.back = temp;
  };
  CSGNode.prototype.clipPolygons = function(polygons) {
    if (!this.plane) return polygons.slice();
    var front = [], back = [];
    for (var i = 0; i < polygons.length; i++) {
      this.plane.splitPolygon(polygons[i], front, back, front, back);
    }
    if (this.front) front = this.front.clipPolygons(front);
    if (this.back) back = this.back.clipPolygons(back);
    else back = [];
    return front.concat(back);
  };
  CSGNode.prototype.clipTo = function(bsp) {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  };
  CSGNode.prototype.allPolygons = function() {
    var polygons = this.polygons.slice();
    if (this.front) polygons = polygons.concat(this.front.allPolygons());
    if (this.back) polygons = polygons.concat(this.back.allPolygons());
    return polygons;
  };
  CSGNode.prototype.build = function(polygons) {
    if (!polygons.length) return;
    if (!this.plane) this.plane = polygons[0].plane.clone();
    var front = [], back = [];
    for (var i = 0; i < polygons.length; i++) {
      this.plane.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
    }
    if (front.length) {
      if (!this.front) this.front = new CSGNode();
      this.front.build(front);
    }
    if (back.length) {
      if (!this.back) this.back = new CSGNode();
      this.back.build(back);
    }
  };

  // ─── CSG Object ───
  function CSG() {
    this.polygons = [];
  }
  CSG.fromPolygons = function(polygons) {
    var csg = new CSG();
    csg.polygons = polygons;
    return csg;
  };
  CSG.prototype.clone = function() {
    var csg = new CSG();
    csg.polygons = this.polygons.map(function(p) { return p.clone(); });
    return csg;
  };
  CSG.prototype.toPolygons = function() {
    return this.polygons;
  };
  CSG.prototype.union = function(csg) {
    var a = new CSGNode(this.clone().polygons);
    var b = new CSGNode(csg.clone().polygons);
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    return CSG.fromPolygons(a.allPolygons());
  };
  CSG.prototype.subtract = function(csg) {
    var a = new CSGNode(this.clone().polygons);
    var b = new CSGNode(csg.clone().polygons);
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    a.invert();
    return CSG.fromPolygons(a.allPolygons());
  };
  CSG.prototype.intersect = function(csg) {
    var a = new CSGNode(this.clone().polygons);
    var b = new CSGNode(csg.clone().polygons);
    a.invert();
    b.clipTo(a);
    b.invert();
    a.clipTo(b);
    b.clipTo(a);
    a.build(b.allPolygons());
    a.invert();
    return CSG.fromPolygons(a.allPolygons());
  };

  // ─── Three.js Conversion ───

  /**
   * Convert a Three.js Mesh (with world matrix applied) to CSG
   */
  CSG.fromMesh = function(mesh) {
    mesh.updateWorldMatrix(true, true);
    var geo = mesh.geometry;
    if (geo.index) geo = geo.toNonIndexed();

    var cloned = geo.clone();
    cloned.applyMatrix4(mesh.matrixWorld);

    var pos = cloned.attributes.position;
    var nor = cloned.attributes.normal;
    if (!nor) {
      cloned.computeVertexNormals();
      nor = cloned.attributes.normal;
    }

    var polygons = [];
    for (var i = 0; i < pos.count; i += 3) {
      var verts = [];
      for (var j = 0; j < 3; j++) {
        var idx = i + j;
        verts.push(new CSGVertex(
          new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx)),
          new THREE.Vector3(nor.getX(idx), nor.getY(idx), nor.getZ(idx))
        ));
      }
      polygons.push(new CSGPolygon(verts));
    }
    return CSG.fromPolygons(polygons);
  };

  /**
   * Convert a Three.js Group/Object3D (all child meshes) to CSG
   */
  CSG.fromObject3D = function(obj) {
    obj.updateWorldMatrix(true, true);
    var allPolygons = [];
    obj.traverse(function(child) {
      if (!child.isMesh || child.userData.helper) return;
      var meshCSG = CSG.fromMesh(child);
      allPolygons = allPolygons.concat(meshCSG.polygons);
    });
    return CSG.fromPolygons(allPolygons);
  };

  /**
   * Convert CSG result back to a Three.js BufferGeometry
   */
  CSG.toGeometry = function(csg) {
    var polygons = csg.toPolygons();
    var positions = [];
    var normals = [];

    polygons.forEach(function(poly) {
      // Triangulate polygon (fan from vertex 0)
      for (var i = 2; i < poly.vertices.length; i++) {
        var verts = [poly.vertices[0], poly.vertices[i - 1], poly.vertices[i]];
        verts.forEach(function(v) {
          positions.push(v.pos.x, v.pos.y, v.pos.z);
          normals.push(v.normal.x, v.normal.y, v.normal.z);
        });
      }
    });

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geo;
  };

  // ─── Expose globally ───
  window.CSG = CSG;

})();
