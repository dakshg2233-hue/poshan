/* =========================================================================
   Thali3D — a WebGL thali whose portions are driven by a Poshan plan.
   Everything (plate, katoris, roti char, rice grain) is generated in code:
   no textures to ship, no assets to host.

     var t = Thali3D(el, { onSelect: fn });
     t.setPlan(plan);          // portions morph toward the new plan
     t.dispose();
   ========================================================================= */
(function (root) {
  'use strict';

  var PLATE_R = 5.0, PLATE_H = 0.66;

  /* Where each dish sits on the plate, and how big its vessel is.
     Mirrors a real thali: grains at the near edge, wet dishes along the far
     rim, salad to the serving hand's side.                                  */
  var LAYOUT = {
    sabzi: { x:-1.10, z:-2.60, r:1.16, h:0.90, kind:'katori' },
    curd:  { x: 1.55, z:-2.55, r:1.02, h:0.82, kind:'katori' },
    dal:   { x:-2.85, z:-0.30, r:1.22, h:0.94, kind:'katori' },
    salad: { x: 2.90, z:-0.10, r:1.14, h:0.80, kind:'katori' },
    roti:  { x:-1.62, z: 1.95, kind:'roti' },
    rice:  { x: 2.10, z: 2.00, kind:'rice' },
    nuts:  { x: 0.05, z: 3.40, r:0.62, h:0.50, kind:'katori' }
  };

  var C = {
    plate:   0x2a2622, plateRim: 0x4a443c,
    steel:   0x39352f, steelRim: 0x8f8779,
    dal:     0xe09a26, dalSpeck: 0x7a4a12,
    sabzi:   0x5c8b38, paneer: 0xf3ead6, pea: 0x84c644,
    curd:    0xf7f4ec,
    cucumber:0x9dcb6b, tomato: 0xcf4530, onion: 0xcaa7c7,
    rice:    0xf8f5ee,
    nut:     0xb17c4b, nutDark: 0x8a5a2f,
    lemon:   0xefc63f, chili: 0x4f9b3a, herb: 0x4e8f34
  };

  function canvasTexture(size, draw) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  function rotiTexture() {
    return canvasTexture(256, function (g, S) {
      var grd = g.createRadialGradient(S/2, S/2, S*0.04, S/2, S/2, S*0.52);
      grd.addColorStop(0, '#f2d69f'); grd.addColorStop(0.62, '#e6be80'); grd.addColorStop(1, '#d3a463');
      g.fillStyle = grd; g.fillRect(0, 0, S, S);
      for (var i = 0; i < 110; i++) {
        var a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * S * 0.46;
        var x = S/2 + Math.cos(a) * rr, y = S/2 + Math.sin(a) * rr, s = 1.5 + Math.random() * 8;
        g.globalAlpha = 0.12 + Math.random() * 0.5;
        g.fillStyle = Math.random() < 0.75 ? '#8d5c2c' : '#5a3411';
        g.beginPath();
        g.ellipse(x, y, s, s * (0.55 + Math.random() * 0.7), Math.random() * 3, 0, 7);
        g.fill();
      }
      g.globalAlpha = 1;
    });
  }

  function speckleTexture(base, speck, count, alpha) {
    return canvasTexture(128, function (g, S) {
      g.fillStyle = base; g.fillRect(0, 0, S, S);
      g.fillStyle = speck; g.globalAlpha = alpha;
      for (var i = 0; i < count; i++) {
        g.beginPath();
        g.arc(Math.random() * S, Math.random() * S, 0.5 + Math.random() * 1.6, 0, 7);
        g.fill();
      }
      g.globalAlpha = 1;
    });
  }

  function jitter(geo, amount, onlyAbove) {
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      if (onlyAbove !== undefined && pos.getY(i) <= onlyAbove) continue;
      pos.setXYZ(i,
        pos.getX(i) + (Math.random() - 0.5) * amount,
        pos.getY(i) + (Math.random() - 0.5) * amount,
        pos.getZ(i) + (Math.random() - 0.5) * amount);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  root.Thali3D = function (container, opts) {
    opts = opts || {};
    if (typeof THREE === 'undefined') return null;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- scene ---------------------------------------------------------- */
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, 1, 0.5, 120);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.className = 't3d-canvas';
    container.appendChild(renderer.domElement);

    var key = new THREE.DirectionalLight(0xfff1dc, 1.15);
    key.position.set(5.5, 13, 7);
    key.castShadow = true;
    key.shadow.mapSize.width = key.shadow.mapSize.height = 1024;
    key.shadow.camera.left = -8; key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;   key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 1;  key.shadow.camera.far = 32;
    key.shadow.bias = -0.0012;
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x3d342a, 0.62));
    var rim = new THREE.DirectionalLight(0xbcd4ff, 0.30);
    rim.position.set(-8, 5, -7);
    scene.add(rim);

    var catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.20 })
    );
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.y = -0.02;
    catcher.receiveShadow = true;
    scene.add(catcher);

    var world = new THREE.Group();
    scene.add(world);

    /* ---- materials ------------------------------------------------------ */
    var M = {
      plate:  new THREE.MeshStandardMaterial({ color: C.plate, roughness: 0.52, metalness: 0.22,
                map: speckleTexture('#2a2622', '#4b453c', 900, 0.5), side: THREE.DoubleSide }),
      rim:    new THREE.MeshStandardMaterial({ color: C.plateRim, roughness: 0.35, metalness: 0.55 }),
      steel:  new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.34, metalness: 0.60, side: THREE.DoubleSide }),
      steelR: new THREE.MeshStandardMaterial({ color: C.steelRim, roughness: 0.22, metalness: 0.85 }),
      dal:    new THREE.MeshStandardMaterial({ color: C.dal, roughness: 0.30, metalness: 0.05,
                map: speckleTexture('#e09a26', '#8a5510', 380, 0.55) }),
      sabzi:  new THREE.MeshStandardMaterial({ color: C.sabzi, roughness: 0.55 }),
      paneer: new THREE.MeshStandardMaterial({ color: C.paneer, roughness: 0.72 }),
      pea:    new THREE.MeshStandardMaterial({ color: C.pea, roughness: 0.42 }),
      curd:   new THREE.MeshStandardMaterial({ color: C.curd, roughness: 0.44 }),
      rice:   new THREE.MeshStandardMaterial({ color: C.rice, roughness: 0.80,
                map: speckleTexture('#f8f5ee', '#d8d0be', 700, 0.55) }),
      rotiTop:new THREE.MeshStandardMaterial({ map: rotiTexture(), roughness: 0.88, color: 0xf0e2c8 }),
      rotiSide:new THREE.MeshStandardMaterial({ color: 0xdcb27d, roughness: 0.9 }),
      cuc:    new THREE.MeshStandardMaterial({ color: C.cucumber, roughness: 0.5 }),
      tom:    new THREE.MeshStandardMaterial({ color: C.tomato, roughness: 0.4 }),
      oni:    new THREE.MeshStandardMaterial({ color: C.onion, roughness: 0.55 }),
      nut:    new THREE.MeshStandardMaterial({ color: C.nut, roughness: 0.62 }),
      nut2:   new THREE.MeshStandardMaterial({ color: C.nutDark, roughness: 0.62 }),
      lemon:  new THREE.MeshStandardMaterial({ color: C.lemon, roughness: 0.45 }),
      chili:  new THREE.MeshStandardMaterial({ color: C.chili, roughness: 0.42 }),
      herb:   new THREE.MeshStandardMaterial({ color: C.herb, roughness: 0.6, side: THREE.DoubleSide })
    };

    /* ---- the plate ------------------------------------------------------ */
    (function buildPlate() {
      var prof = [
        new THREE.Vector2(0.00, 0.00), new THREE.Vector2(2.40, 0.00),
        new THREE.Vector2(3.50, 0.05), new THREE.Vector2(4.25, 0.22),
        new THREE.Vector2(4.72, 0.48), new THREE.Vector2(PLATE_R, PLATE_H)
      ];
      var plate = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), M.plate);
      plate.receiveShadow = true;
      plate.castShadow = true;
      world.add(plate);

      var ring = new THREE.Mesh(new THREE.TorusGeometry(PLATE_R, 0.085, 12, 80), M.rim);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = PLATE_H;
      ring.castShadow = true;
      world.add(ring);
    })();

    /* ---- builders -------------------------------------------------------- */

    function makeKatori(cfg) {
      var g = new THREE.Group();
      var prof = [], N = 12;
      for (var i = 0; i <= N; i++) {
        var t = i / N;
        prof.push(new THREE.Vector2(cfg.r * (0.60 + 0.40 * Math.pow(t, 0.62)), t * cfg.h));
      }
      var shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 44), M.steel);
      shell.castShadow = true; shell.receiveShadow = true;
      g.add(shell);

      var base = new THREE.Mesh(new THREE.CircleGeometry(cfg.r * 0.60, 40), M.steel);
      base.rotation.x = -Math.PI / 2;
      base.position.y = 0.008;
      g.add(base);

      var lip = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, 0.035, 8, 44), M.steelR);
      lip.rotation.x = Math.PI / 2;
      lip.position.y = cfg.h;
      lip.castShadow = true;
      g.add(lip);

      /* contents: a column up to the fill line, capped by a dome */
      var inner = cfg.r * 0.93;
      var content = new THREE.Group();
      var col = new THREE.Mesh(new THREE.CylinderGeometry(inner, cfg.r * 0.58, 1, 36), cfg.mat);
      col.position.y = -0.5;
      content.add(col);
      var dome = new THREE.Mesh(
        new THREE.SphereGeometry(inner, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2), cfg.mat);
      dome.scale.y = cfg.dome;
      dome.castShadow = true;
      content.add(dome);
      g.add(content);

      g.userData.content = content;
      g.userData.cfg = cfg;
      g.userData.inner = inner;
      return g;
    }

    function scatter(parent, count, radius, make) {
      var out = [];
      for (var i = 0; i < count; i++) {
        var a = (i * 2.399) + Math.random() * 0.4;           /* golden-angle spread */
        var rr = radius * Math.sqrt((i + 0.6) / count) * 0.86;
        var m = make(i);
        m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
        m.rotation.y = Math.random() * Math.PI;
        m.castShadow = true;
        m.userData.rr = rr;          /* so it can ride the dome as it fills */
        parent.add(m);
        out.push(m);
      }
      return out;
    }

    function herbSprig(scale) {
      var g = new THREE.Group();
      for (var i = 0; i < 3; i++) {
        var leaf = new THREE.Mesh(new THREE.CircleGeometry(0.09 * scale, 6), M.herb);
        leaf.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        leaf.rotation.z = i * 2.1;
        leaf.position.set(Math.cos(i * 2.1) * 0.07 * scale, 0.01, Math.sin(i * 2.1) * 0.07 * scale);
        g.add(leaf);
      }
      return g;
    }

    /* ---- slots ------------------------------------------------------------ */
    var slots = {};
    var pickable = [];

    function registerPick(group, id) {
      group.traverse(function (o) { if (o.isMesh) { o.userData.slot = id; pickable.push(o); } });
    }

    function addKatoriSlot(id, mat, dome, decorate) {
      var L = LAYOUT[id];
      var g = makeKatori({ r: L.r, h: L.h, mat: mat, dome: dome });
      g.position.set(L.x, 0.02, L.z);
      world.add(g);
      var extras = decorate ? decorate(g) : [];
      slots[id] = {
        group: g, layout: L, extras: extras || [],
        anchor: new THREE.Vector3(L.x, L.h + 0.35, L.z),
        apply: function (t) {
          var s = 0.80 + 0.30 * t;
          g.scale.set(s, s, s);
          var fill = L.h * (0.30 + 0.58 * t);
          var content = g.userData.content;
          content.position.y = fill;
          var col = content.children[0], colH = Math.max(0.05, fill);
          col.scale.y = colH;
          col.position.y = -colH / 2;        /* hang the column below the surface */
          g.visible = t > 0.001;

          /* garnishes ride the surface of the dome, wherever it now sits */
          var inner = g.userData.inner, domeH = inner * dome;
          var ex = slots[id].extras;
          for (var i = 0; i < ex.length; i++) {
            ex[i].visible = i < Math.ceil(t * ex.length);
            var rr = ex[i].userData.rr || 0;
            var k = Math.max(0, 1 - (rr / inner) * (rr / inner));
            ex[i].position.y = fill + domeH * Math.sqrt(k) * 0.92 + (ex[i].userData.sit || 0.02);
          }
        }
      };
      registerPick(g, id);
    }

    addKatoriSlot('dal', M.dal, 0.12, function (g) {
      var out = [];
      var sprig = herbSprig(1);
      sprig.userData.sit = 0.03;
      g.add(sprig); out.push(sprig);
      out = out.concat(scatter(g, 7, g.userData.inner * 0.8, function () {
        var m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), M.paneer);
        m.rotation.x = -Math.PI / 2;
        m.userData.sit = 0.015;                       /* floating tadka */
        return m;
      }));
      return out;
    });

    addKatoriSlot('sabzi', M.sabzi, 0.42, function (g) {
      var cubes = scatter(g, 8, g.userData.inner * 0.72, function () {
        var m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, 0.24), M.paneer);
        m.rotation.y = Math.random() * 2;
        m.userData.sit = 0.09;
        return m;
      });
      var peas = scatter(g, 10, g.userData.inner * 0.86, function () {
        var m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), M.pea);
        m.userData.sit = 0.065;
        return m;
      });
      return cubes.concat(peas);
    });

    addKatoriSlot('curd', M.curd, 0.14, function (g) {
      var s = herbSprig(0.85);
      s.userData.sit = 0.03;
      g.add(s);
      return [s];
    });

    addKatoriSlot('salad', M.cuc, 0.10, function (g) {
      var R = g.userData.inner;
      var items = [];
      items = items.concat(scatter(g, 4, R * 0.8, function () {
        var m = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 18), M.cuc);
        m.rotation.set(1.1, Math.random() * 3, 0.3);
        m.userData.sit = 0.10;
        return m;
      }));
      items = items.concat(scatter(g, 4, R * 0.72, function () {
        var m = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.045, 18), M.tom);
        m.rotation.set(0.9, Math.random() * 3, -0.4);
        m.userData.sit = 0.13;
        return m;
      }));
      items = items.concat(scatter(g, 3, R * 0.62, function () {
        var m = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 18), M.oni);
        m.rotation.set(1.3, Math.random() * 3, 0.2);
        m.userData.sit = 0.16;
        return m;
      }));
      return items;
    });

    addKatoriSlot('nuts', M.nut, 0.30, function (g) {
      return scatter(g, 9, g.userData.inner * 0.72, function (i) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), i % 3 ? M.nut : M.nut2);
        m.scale.set(1, 0.62, 0.72);
        m.userData.sit = 0.05;
        return m;
      });
    });

    /* rotis: the count changes, not the size — that is how rotis work */
    (function () {
      var L = LAYOUT.roti, g = new THREE.Group();
      g.position.set(L.x, PLATE_H * 0.06, L.z);
      world.add(g);
      var discs = [];
      for (var i = 0; i < 7; i++) {
        /* flat discs: the char pattern comes from the texture, not geometry -
           jittering the caps wrecks their normals and blows out to white */
        var geo = new THREE.CylinderGeometry(1.36, 1.34, 0.05, 44, 1);
        var m = new THREE.Mesh(geo, [M.rotiSide, M.rotiTop, M.rotiTop]);
        m.position.set((i % 2 ? 0.17 : -0.14) * (1 + i * 0.08), 0.05 + i * 0.048, (i % 2 ? -0.12 : 0.15) * (1 + i * 0.08));
        m.rotation.y = i * 0.9;
        m.scale.setScalar(1 - i * 0.012);
        m.castShadow = true; m.receiveShadow = true;
        g.add(m);
        discs.push(m);
      }
      slots.roti = {
        group: g, layout: L, anchor: new THREE.Vector3(L.x - 0.2, 0.55, L.z + 0.5),
        apply: function (t) {
          var n = Math.max(0, Math.min(7, Math.round(t * 8)));   /* 280 g cap = 8 rotis */
          for (var i = 0; i < discs.length; i++) discs[i].visible = i < n;
          g.visible = n > 0;
        }
      };
      registerPick(g, 'roti');
    })();

    /* rice: one mound that grows */
    (function () {
      var L = LAYOUT.rice, g = new THREE.Group();
      g.position.set(L.x, PLATE_H * 0.05, L.z);
      world.add(g);
      var geo = new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2.02);
      jitter(geo, 0.055, 0.02);
      var mound = new THREE.Mesh(geo, M.rice);
      mound.castShadow = true; mound.receiveShadow = true;
      g.add(mound);
      var skirt = new THREE.Mesh(new THREE.CircleGeometry(1, 32), M.rice);
      skirt.rotation.x = -Math.PI / 2;
      g.add(skirt);
      var sprig = herbSprig(1);
      g.add(sprig);
      slots.rice = {
        group: g, layout: L, anchor: new THREE.Vector3(L.x + 0.3, 0.9, L.z + 0.4),
        apply: function (t) {
          var R = 0.80 + 0.62 * t, H = 0.42 + 0.60 * t;
          g.scale.set(R, H, R);
          sprig.position.y = 1.0;
          sprig.scale.setScalar(1 / Math.max(0.4, H));
          g.visible = t > 0.001;
        }
      };
      registerPick(g, 'rice');
    })();

    /* garnish: always there, never measured */
    (function () {
      var g = new THREE.Group();
      g.position.set(0.05, PLATE_H * 0.04, 0.35);
      world.add(g);

      var wedge = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 20, 12, 0, Math.PI, 0, Math.PI / 2), M.lemon);
      wedge.scale.set(1, 0.7, 1);
      wedge.rotation.y = -0.5;
      wedge.position.set(-0.55, 0.02, 0);
      wedge.castShadow = true;
      g.add(wedge);

      var chili = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.11, 0.85, 12), M.chili);
      chili.rotation.set(Math.PI / 2, 0, -0.35);
      chili.position.set(0.6, 0.09, 0.05);
      chili.castShadow = true;
      g.add(chili);
      var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), M.herb);
      stem.rotation.set(Math.PI / 2, 0, -0.35);
      stem.position.set(0.44, 0.09, -0.35);
      g.add(stem);
    })();

    /* ---- labels ----------------------------------------------------------- */
    var labelLayer = document.createElement('div');
    labelLayer.className = 't3d-labels';
    container.appendChild(labelLayer);
    var labels = {};

    function ensureLabel(id) {
      if (labels[id]) return labels[id];
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 't3d-label';
      el.innerHTML = '<span class="t3d-label-name"></span><span class="t3d-label-val"></span>';
      el.addEventListener('click', function () { select(id); });
      el.addEventListener('mouseenter', function () { hover(id); });
      el.addEventListener('mouseleave', function () { hover(null); });
      labelLayer.appendChild(el);
      labels[id] = el;
      return el;
    }

    /* ---- state ------------------------------------------------------------ */
    var current = {}, target = {}, items = {};
    var selected = null, hovered = null;
    var azimuth = -0.22, polar = 0.62, autoRotate = !reduceMotion;
    var idleSince = performance.now();
    var width = 1, height = 1, raf = 0, disposed = false;

    Object.keys(LAYOUT).forEach(function (k) { current[k] = 0; target[k] = 0; });

    function setPlan(plan) {
      items = {};
      plan.items.forEach(function (it) { items[it.id] = it; });
      Object.keys(LAYOUT).forEach(function (id) {
        var it = items[id];
        target[id] = it ? it.fill : 0;
        var el = ensureLabel(id);
        var axis = it && plan.score.axes[it.axis];
        el.querySelector('.t3d-label-name').textContent = it ? it.name : id;
        el.querySelector('.t3d-label-val').textContent = it && it.grams > 0 ? it.units + ' · ' + it.grams + ' g' : 'not served';
        el.dataset.state = !it || it.grams === 0 ? 'off' : (axis ? axis.word.toLowerCase() : 'good');
      });
    }

    function select(id) {
      selected = (selected === id) ? null : id;
      if (opts.onSelect) opts.onSelect(selected, items[selected] || null);
      syncLabelClasses();
    }
    function hover(id) {
      hovered = id;
      syncLabelClasses();
    }
    function syncLabelClasses() {
      Object.keys(labels).forEach(function (id) {
        labels[id].classList.toggle('is-selected', id === selected);
        labels[id].classList.toggle('is-hovered', id === hovered);
      });
    }

    /* ---- camera & pointer -------------------------------------------------- */
    function fit() {
      var rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      var halfSpan = 6.1;
      var dist = halfSpan / Math.tan(camera.fov * Math.PI / 360);
      if (camera.aspect < 1) dist /= Math.max(0.52, camera.aspect);
      camera.userData.dist = dist * 0.98;
      camera.updateProjectionMatrix();
    }

    function placeCamera() {
      var d = camera.userData.dist || 20;
      camera.position.set(
        d * Math.sin(polar) * Math.sin(azimuth),
        d * Math.cos(polar),
        d * Math.sin(polar) * Math.cos(azimuth));
      camera.lookAt(0, 0.3, 0);
    }

    var dragging = false, lastX = 0, lastY = 0, moved = 0;
    var el = renderer.domElement;

    el.addEventListener('pointerdown', function (e) {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      autoRotate = false; idleSince = performance.now();
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (dragging) {
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        lastX = e.clientX; lastY = e.clientY;
        azimuth -= dx * 0.006;
        polar = Math.max(0.16, Math.min(1.02, polar + dy * 0.004));
        idleSince = performance.now();
      } else {
        pick(e, false);
      }
    });
    el.addEventListener('pointerup', function (e) {
      dragging = false;
      if (moved < 6) pick(e, true);
      idleSince = performance.now();
    });
    el.addEventListener('pointerleave', function () { dragging = false; hover(null); });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      var d = camera.userData.dist || 20;
      camera.userData.dist = Math.max(11, Math.min(30, d + e.deltaY * 0.02));
      idleSince = performance.now();
      autoRotate = false;
    }, { passive: false });

    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(e, isClick) {
      var rect = el.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      var hits = ray.intersectObjects(pickable, false);
      var id = null;
      for (var i = 0; i < hits.length; i++) {
        var s = hits[i].object.userData.slot;
        if (s && slots[s] && slots[s].group.visible) { id = s; break; }
      }
      el.style.cursor = id ? 'pointer' : 'grab';
      if (isClick) { if (id) select(id); }
      else hover(id);
    }

    /* ---- loop -------------------------------------------------------------- */
    var tmp = new THREE.Vector3();
    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);

      if (!reduceMotion && !dragging && now - idleSince > 6000) autoRotate = true;
      if (autoRotate) azimuth -= 0.0016;

      var moving = false;
      Object.keys(LAYOUT).forEach(function (id) {
        var c = current[id], t = target[id];
        if (Math.abs(t - c) > 0.0008) { current[id] = c + (t - c) * 0.11; moving = true; }
        else current[id] = t;
        slots[id].apply(current[id], items[id]);
      });

      var pulse = reduceMotion ? 1 : 1 + Math.sin(now * 0.004) * 0.02;
      Object.keys(slots).forEach(function (id) {
        var g = slots[id].group;
        var lift = (id === hovered || id === selected) ? 0.22 * pulse : 0;
        g.position.y = (slots[id].layout.kind === 'katori' ? 0.02 : PLATE_H * 0.05) + lift;
      });

      placeCamera();
      renderer.render(scene, camera);

      /* labels ride along with the plate */
      Object.keys(labels).forEach(function (id) {
        var s = slots[id];
        if (!s) return;
        var lab = labels[id];
        if (!s.group.visible) { lab.style.opacity = '0'; lab.style.pointerEvents = 'none'; return; }
        tmp.copy(s.anchor).project(camera);
        var x = (tmp.x * 0.5 + 0.5) * width;
        var y = (-tmp.y * 0.5 + 0.5) * height;
        var cx = width / 2, cy = height / 2;
        var dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1;
        x += (dx / len) * 54; y += (dy / len) * 30;
        lab.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        lab.style.opacity = '1';
        lab.style.pointerEvents = 'auto';
        lab.style.zIndex = String(1000 - Math.round(tmp.z * 1000));
      });

      if (opts.onFrame) opts.onFrame(moving);
    }

    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { fit(); });
      ro.observe(container);
    } else {
      window.addEventListener('resize', fit);
    }

    fit();
    placeCamera();
    el.style.cursor = 'grab';
    raf = requestAnimationFrame(frame);

    return {
      setPlan: setPlan,
      select: select,
      resize: fit,
      resetView: function () { azimuth = -0.22; polar = 0.62; camera.userData.dist = null; fit(); },
      setAutoRotate: function (v) { autoRotate = v && !reduceMotion; idleSince = performance.now(); },
      dispose: function () {
        disposed = true;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        renderer.dispose();
        if (el.parentNode) el.parentNode.removeChild(el);
        if (labelLayer.parentNode) labelLayer.parentNode.removeChild(labelLayer);
      }
    };
  };
})(typeof window !== 'undefined' ? window : this);
