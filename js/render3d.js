// ── render3d.js ── Vue 3D « diorama doux » (Three.js) — le jeu par défaut ; ?2d dans l'adresse = ancienne vue ──
// Le jeu continue de tourner sur la carte 2D (#game-world), qui devient invisible :
// toute la logique (ramasser, quêtes, chantiers, sauvegardes) reste identique.
// Cette vue relit la carte 2D et la redessine en 3D :
//   - modèles ronds pour Charlie, maisons, boutiques, chantiers, arbres, cailloux, fleurs, montagnes, fontaine, jardin ;
//   - « images debout » (emoji) pour le reste en attendant leurs modèles (villageois, animaux, décor de plage...).
// Les clics sur la 3D sont renvoyés aux éléments de la carte 2D (villageois, papillons, jardin) ou font marcher Charlie.
(function(){
"use strict";

function hasWebGL() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
}
// Toujours en 3D quand l'appareil sait faire de la 3D (l'ancienne vue 2D ne sert plus que si WebGL manque ;
// ?dev2d la force pour les tests). Un vieux lien « ?2d » est nettoyé de l'adresse.
if (/[?&]2d\b/.test(location.search) && window.history && history.replaceState) {
    history.replaceState(null, '', location.pathname + location.search.replace(/[?&]2d\b/, '').replace(/^&/, '?') + location.hash);
}
var ACTIVE = !/[?&]dev2d\b/.test(location.search) && hasWebGL();
var LOW = false;
try { LOW = localStorage.getItem('village3d_low') === '1'; } catch (e) {}
var SHOW_FPS = /[?&]fps\b/.test(location.search);
Game.r3d = { active: ACTIVE };
if (!ACTIVE) return;
document.documentElement.classList.add('mode-3d');

var U = 1 / 40;                 // 40 px de la carte 2D = 1 unité 3D
var T = null;                   // THREE, une fois chargé
var renderer, scene, camera, sun, hemi, groundMesh;
var started = false;

// ── Chargement de Three.js (fichier local, même numéro de version que le jeu) ──
function loadThree() {
    return new Promise(function(resolve, reject) {
        if (window.THREE) { resolve(); return; }
        var me = document.querySelector('script[src*="render3d.js"]');
        var ver = me && me.src.indexOf('?v=') > -1 ? me.src.split('?v=')[1] : '';
        var s = document.createElement('script');
        s.src = 'lib/three.min.js' + (ver ? '?v=' + ver : '');
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// On s'accroche au lancement de la partie (Game.startGame est défini dans index.html)
window.addEventListener('DOMContentLoaded', function() {
    // Écran d'accueil : Charlie en 3D à la place de l'emoji
    if (!Game.titlescreen) return;
    var origShow = Game.titlescreen.show;
    Game.titlescreen.show = function() { origShow.apply(this, arguments); titleHero(); };
    if (document.getElementById('title-hero')) titleHero();
    var orig = Game.startGame;
    Game.startGame = function() {
        orig.apply(this, arguments);
        loadThree().then(function() {
            var fonts = document.fonts && document.fonts.load ? document.fonts.load('64px "Noto Color Emoji"', '🌳') : Promise.resolve();
            return Promise.race([fonts, new Promise(function(r) { setTimeout(r, 2500); })]);
        }).then(init).catch(function(err) {
            console.warn('3D indisponible', err, err && err.stack);
            document.documentElement.classList.remove('mode-3d');
        });
    };
});

// Charlie en 3D sur l'écran d'accueil : il tourne doucement sur lui-même et fait coucou
function titleHero() {
    loadThree().then(function() {
        var slot = document.getElementById('title-hero');
        if (!slot || slot.dataset.r3d) return;
        slot.dataset.r3d = '1';
        T = window.THREE;
        var size = Math.min(240, Math.round(window.innerHeight * 0.3));
        var cv = document.createElement('canvas');
        cv.style.cssText = 'width:' + size + 'px;height:' + size + 'px;display:block;margin:0 auto;';
        slot.textContent = '';
        slot.appendChild(cv);
        var r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        r.setSize(size, size, false);
        r.outputEncoding = T.sRGBEncoding;
        r.toneMapping = T.ACESFilmicToneMapping;
        var sc = new T.Scene();
        sc.add(new T.HemisphereLight(lin('#ffffff'), lin('#8a7a5a'), 0.9));
        var key = new T.DirectionalLight(lin('#fff3dc'), 1.1); key.position.set(2, 4, 5); sc.add(key);
        var hero = makeCharlie(); hero.scale.setScalar(1); sc.add(hero);
        var cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
        cam.position.set(0, 1.5, 6.2); cam.lookAt(0, 1.05, 0);
        var ud = hero.userData;
        // Charlie regarde le joueur ; on le fait tourner en le faisant glisser (souris ou doigt)
        var rotY = 0, spinV = 0, dragX = null;
        cv.style.cursor = 'grab';
        cv.style.touchAction = 'none';
        cv.title = 'Fais-moi tourner !';
        cv.addEventListener('pointerdown', function(e) { dragX = e.clientX; spinV = 0; cv.style.cursor = 'grabbing'; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
        cv.addEventListener('pointermove', function(e) { if (dragX === null) return; var d = e.clientX - dragX; dragX = e.clientX; rotY += d * 0.012; spinV = d * 0.012; });
        function release() { dragX = null; cv.style.cursor = 'grab'; }
        cv.addEventListener('pointerup', release);
        cv.addEventListener('pointercancel', release);
        (function spin(now) {
            if (!cv.isConnected) { r.dispose(); if (r.forceContextLoss) r.forceContextLoss(); return; }
            var t = now / 1000;
            if (dragX === null && Math.abs(spinV) > 0.0005) { rotY += spinV; spinV *= 0.92; }   // petit élan quand on lâche
            hero.rotation.y = rotY;
            ud.armR.rotation.x = 0;
            ud.armR.rotation.z = 2.35 + Math.sin(t * 7) * 0.3;   // coucou : bras levé sur le côté, la main qui se balance
            ud.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.06;
            ud.head.rotation.z = Math.sin(t * 1.4) * 0.08;
            r.render(sc, cam);
            requestAnimationFrame(spin);
        })(performance.now());
    }).catch(function() {});
}

// ═══════════════════════ Outils ═══════════════════════
function lin(c) { return new T.Color(c).convertSRGBToLinear(); }
var _mats = {};
function mat(c, o) {
    var key = c + JSON.stringify(o || {});
    if (_mats[key]) return _mats[key];
    o = Object.assign({ roughness: 0.78, metalness: 0 }, o || {});
    if (o.emissive) o.emissive = lin(o.emissive);
    return (_mats[key] = new T.MeshStandardMaterial(Object.assign(o, { color: lin(c) })));
}
function shadowed(m) { m.castShadow = true; m.receiveShadow = true; return m; }
function put(parent, mesh, x, y, z) { mesh.position.set(x, y, z); parent.add(shadowed(mesh)); return mesh; }
var _geo = {};
function geo(key, make) { return _geo[key] || (_geo[key] = make()); }
function sphereGeo(seg) { return geo('sph' + seg, function() { return new T.SphereGeometry(1, seg, Math.round(seg * 0.7)); }); }
function ball(parent, r, color, x, y, z, sx, sy, sz, o) {
    var m = new T.Mesh(sphereGeo(r > 0.3 ? 24 : 14), typeof color === 'string' ? mat(color, o) : color);
    m.scale.set(r * (sx || 1), r * (sy || 1), r * (sz || 1));
    return put(parent, m, x, y, z);
}
function capsuleGeo(r, len) {
    return geo('cap' + r + '_' + len, function() {
        var pts = [], n = 8, i, a;
        for (i = 0; i <= n; i++) { a = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r - len / 2)); }
        for (i = 0; i <= n; i++) { a = (i / n) * (Math.PI / 2); pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r + len / 2)); }
        return new T.LatheGeometry(pts, 20);
    });
}
function roundedBoxGeo(w, h, d, r) {
    return geo('rb' + [w, h, d, r].join('_'), function() {
        var s = new T.Shape(), x = -w / 2, y = -h / 2;
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        var b = Math.min(0.08, r);
        var g = new T.ExtrudeGeometry(s, { depth: Math.max(0.01, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: 3, curveSegments: 8 });
        g.center();
        return g;
    });
}
function rbox(parent, w, h, d, r, color, x, y, z, o) {
    return put(parent, new T.Mesh(roundedBoxGeo(w, h, d, r), typeof color === 'string' ? mat(color, o) : color), x, y, z);
}

// Images (emoji) et étiquettes dessinées sur un canvas, mises en cache
var _tex = {};
function emojiTexture(e) {
    if (_tex['e' + e]) return _tex['e' + e];
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    g.font = '100px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(e, 64, 72);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    return (_tex['e' + e] = t);
}
function labelTexture(text) {
    if (_tex['l' + text]) return _tex['l' + text];
    var c = document.createElement('canvas'), g = c.getContext('2d');
    var font = 'bold 34px "Varela Round", "Noto Color Emoji", sans-serif';
    g.font = font;
    var w = Math.ceil(g.measureText(text).width) + 36;
    c.width = w; c.height = 56;
    g.font = font;
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath(); g.moveTo(28, 2); g.lineTo(w - 28, 2); g.arc(w - 28, 28, 26, -Math.PI / 2, Math.PI / 2); g.lineTo(28, 54); g.arc(28, 28, 26, Math.PI / 2, -Math.PI / 2); g.fill();
    g.fillStyle = '#5d4037'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, 30);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    t.userData = { aspect: w / 56 };
    return (_tex['l' + text] = t);
}
var spriteMats = [];   // images (emoji) : assombries la nuit comme le reste du décor
function emojiSprite(e, size) {
    var m = new T.SpriteMaterial({ map: emojiTexture(e), transparent: true, alphaTest: 0.35 });
    m.color.setScalar(_spriteLight);
    spriteMats.push(m);
    var s = new T.Sprite(m);
    s.center.set(0.5, 0.08);
    s.scale.set(size, size, 1);
    return s;
}
// Étiquette de taille fixe à l'écran (sinon énorme quand elle est près de la caméra)
function labelSprite(text, h) {
    var tex = labelTexture(text);
    var s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false }));
    s.center.set(0.5, 0);
    h = 0.025 * h / 0.55;   // écriture discrète
    s.scale.set(h * tex.userData.aspect, h, 1);
    s.renderOrder = 10;
    return s;
}
// Lueur chaude en dégradé (dessinée une fois), ajoutée par-dessus la scène : jolie et légère
var _glowTex = null;
function glowMaterial(base, flat) {
    if (!_glowTex) {
        var c = document.createElement('canvas'); c.width = c.height = 128;
        var g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, 'rgba(255,200,120,1)'); grd.addColorStop(0.35, 'rgba(255,165,80,0.5)'); grd.addColorStop(1, 'rgba(255,140,60,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
        _glowTex = new T.CanvasTexture(c); _glowTex.encoding = T.sRGBEncoding;
    }
    // Halos des fenêtres : lumière ajoutée ; flaque au sol : voile orangé (sinon l'herbe verte la rend jaune-vert)
    var o = { map: _glowTex, transparent: true, depthWrite: false, blending: flat ? T.NormalBlending : T.AdditiveBlending, opacity: _glow * base, fog: false };
    var m = flat ? new T.MeshBasicMaterial(o) : new T.SpriteMaterial(o);
    m.userData.base = base;
    glowMats.push(m);
    return m;
}
function rand(seed) { return function() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// ═══════════════════════ Modèles ronds ═══════════════════════
// Corps « chibi » commun à Charlie, au fermier et aux villageois (bras et jambes qui balancent)
function makeBody(o) {
    var root = new T.Group(), body = new T.Group(); root.add(body);
    var SKIN = mat(o.skin, { roughness: 0.6 }), SHIRT = mat(o.shirt), PANTS = mat(o.pants), BOOT = mat(o.boot || '#6b4224', { roughness: 0.5 });
    function limb(r, len, m, x, y) {
        var piv = new T.Group(); piv.position.set(x, y, 0); body.add(piv);
        put(piv, new T.Mesh(capsuleGeo(r, len), m), 0, -len / 2 - r * 0.4, 0);
        return piv;
    }
    var legL = limb(0.12, 0.3, PANTS, -0.15, 0.62), legR = limb(0.12, 0.3, PANTS, 0.15, 0.62);
    ball(legL, 0.15, BOOT, 0, -0.52, 0.06, 1, 0.75, 1.35);
    ball(legR, 0.15, BOOT, 0, -0.52, 0.06, 1, 0.75, 1.35);
    put(body, new T.Mesh(capsuleGeo(0.31, 0.22), SHIRT), 0, 0.95, 0);
    if (o.belt) {
        put(body, new T.Mesh(geo('belt', function() { return new T.TorusGeometry(0.3, 0.05, 10, 28); }), mat('#5b3a1a')), 0, 0.78, 0).rotation.x = Math.PI / 2;
        ball(body, 0.06, mat('#f2c94c', { metalness: 0.7, roughness: 0.3 }), 0, 0.78, 0.33);
    }
    if (o.scarf) put(body, new T.Mesh(geo('scarf', function() { return new T.ConeGeometry(0.2, 0.26, 20); }), mat(o.scarf)), 0, 1.2, 0.2).rotation.x = Math.PI + 0.35;
    var armL = limb(0.09, 0.3, SHIRT, -0.36, 1.16), armR = limb(0.09, 0.3, SHIRT, 0.36, 1.16);
    armL.rotation.z = -0.12; armR.rotation.z = 0.12;   // bras le long du corps, légèrement écartés
    ball(armL, 0.12, SHIRT, 0, 0, 0); ball(armR, 0.12, SHIRT, 0, 0, 0);   // épaules rondes
    ball(armL, 0.1, SKIN, 0, -0.48, 0); ball(armR, 0.1, SKIN, 0, -0.48, 0);
    var head = new T.Group(); head.position.set(0, 1.68, 0); body.add(head);
    ball(head, 0.46, SKIN, 0, 0, 0);
    root.userData = { body: body, head: head, legL: legL, legR: legR, armL: armL, armR: armR, step: 0, facing: 0 };
    return root;
}
function face(head, o) {
    [-0.16, 0.16].forEach(function(x) {
        ball(head, 0.07, mat('#2a1d14', { roughness: 0.3 }), x, 0.02, 0.41, 0.85, 1.25, 0.6);
        ball(head, 0.024, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 }), x + 0.025, 0.07, 0.455);
        ball(head, 0.07, mat('#ff9aa2', { roughness: 0.9, transparent: true, opacity: 0.75 }), x * 1.55, -0.12, 0.37, 1, 0.6, 0.3);
    });
    if (o.nose) ball(head, o.noseSize || 0.05, o.nose, 0, -0.06, 0.46);
    var smile = new T.Mesh(geo('smile', function() { return new T.TorusGeometry(0.075, 0.016, 8, 16, Math.PI); }), mat('#8a3b2e')); smile.rotation.z = Math.PI;
    put(head, smile, 0, -0.17, 0.425);
}
function cowboyHat(head, color, band) {
    var HAT = mat(color, { roughness: 0.7, side: T.DoubleSide });
    var hat = new T.Group(); hat.position.set(0, 0.22, -0.02); hat.rotation.x = -0.2; head.add(hat);
    var brim = geo('brim', function() {
        var pts = [];
        for (var i = 0; i <= 14; i++) { var u = i / 14; pts.push(new T.Vector2(0.4 + u * 0.36, Math.pow(u, 2.6) * 0.15)); }
        return new T.LatheGeometry(pts, 40);
    });
    var crown = geo('crown', function() {
        return new T.LatheGeometry([new T.Vector2(0.001, 0.4), new T.Vector2(0.2, 0.39), new T.Vector2(0.33, 0.33), new T.Vector2(0.4, 0.17), new T.Vector2(0.42, 0.02), new T.Vector2(0.41, -0.02)], 32);
    });
    put(hat, new T.Mesh(brim, HAT), 0, 0, 0).scale.set(1, 1, 0.9);
    put(hat, new T.Mesh(crown, HAT), 0, 0, 0).scale.set(1, 1, 0.9);
    put(hat, new T.Mesh(geo('hatband', function() { return new T.CylinderGeometry(0.425, 0.43, 0.08, 32); }), mat(band)), 0, 0.07, 0).scale.set(1, 1, 0.9);
}
// Charlie, style « chibi » (même dessin que l'aperçu choisi), avec son chapeau de cowboy
var charlie = null;
function makeCharlie() {
    var root = makeBody({ skin: '#f2c39a', shirt: '#ee7a2a', pants: '#4466b0', belt: true, scarf: '#d63a3a' });
    var head = root.userData.head;
    ball(head, 0.47, mat('#7a4a28'), 0, 0.16, -0.06, 1, 0.55, 1);
    face(head, { nose: '#f2c39a' });
    cowboyHat(head, '#b57a3e', '#5b3a1a');
    root.scale.setScalar(0.85);
    return root;
}
// Silhouette de Charlie visible à travers les murs : chaque morceau est doublé avec une matière
// qui ne se dessine QUE là où quelque chose est devant lui (depthFunc GreaterDepth)
// Ordre de dessin : décor (0), puis silhouette (20), puis Charlie lui-même (30) : ainsi la silhouette
// n'apparaît que derrière le décor, jamais à travers ses propres bras ou son chapeau.
function addGhost(root) {
    var ghost = new T.MeshBasicMaterial({ color: lin('#e9c9a0'), depthWrite: false, depthFunc: T.GreaterDepth });
    var meshes = [];
    root.traverse(function(o) { if (o.isMesh) meshes.push(o); });
    meshes.forEach(function(m) {
        m.renderOrder = 30;
        if (m.material.transparent) return;
        var g = new T.Mesh(m.geometry, ghost);
        g.renderOrder = 20;
        m.add(g);
    });
}
// Le fermier : même corps, chapeau de paille et salopette
function makeFarmer() {
    var root = makeBody({ skin: '#e8b48c', shirt: '#6aa84f', pants: '#3f6aa0', boot: '#4a3a2a' });
    var head = root.userData.head;
    ball(head, 0.47, mat('#c9a27a'), 0, 0.16, -0.06, 1, 0.55, 1);
    face(head, { nose: '#e8b48c' });
    cowboyHat(head, '#e8cf7a', '#c0392b');
    root.scale.setScalar(0.85);
    return root;
}
// Villageois animaux : corps chibi + tête d'animal (oreilles, museau, couleurs)
var CRITTERS = {
    '🐰': { fur: '#ece6ef', shirt: '#ff8fb1', pants: '#8d6fd1', ears: 'long', inner: '#ffb3c8', nose: '#ff8fa8' },
    '🐱': { fur: '#f2b65a', shirt: '#7fb7e8', pants: '#5a6c8a', ears: 'cat', inner: '#ffc9a8', nose: '#ff8fa8', whiskers: true },
    '🐶': { fur: '#d9b38c', shirt: '#5fae47', pants: '#7a5a3c', ears: 'floppy', earColor: '#a87b52', nose: '#3a2a20', muzzle: '#f1dcc2' },
    '🦊': { fur: '#e8792e', shirt: '#9b7be0', pants: '#4a3a6a', ears: 'fox', inner: '#3a2a20', nose: '#2a1d14', muzzle: '#fff3e6' },
    '🐡': { fur: '#f6d044', shirt: '#2fa79a', pants: '#1f6f66', ears: 'fins', spikes: true, nose: '#e8a020' },
    '🐕': { fur: '#a8743f', shirt: '#c0392b', pants: '#5b4636', ears: 'floppy', earColor: '#6e4a28', nose: '#2a1d14', muzzle: '#e8cfa8' },
    '🦉': { fur: '#9a7552', shirt: '#6d5a8a', pants: '#4a3a5a', ears: 'owl', nose: '#f2b84b', muzzle: '#e9d8c0' }
};
function makeCritter(e) {
    var c = CRITTERS[e] || { fur: '#c9a27a', shirt: '#7fb7e8', pants: '#5a6c8a', ears: 'round', nose: '#3a2a20' };
    var root = makeBody({ skin: c.fur, shirt: c.shirt, pants: c.pants, boot: c.fur });
    var head = root.userData.head, FUR = mat(c.fur);
    if (c.muzzle) ball(head, 0.2, c.muzzle, 0, -0.12, 0.33, 1.2, 0.8, 0.8);
    face(head, { nose: c.nose, noseSize: c.muzzle ? 0.07 : 0.05 });
    var ear;
    switch (c.ears) {
        case 'long':
            [-0.17, 0.17].forEach(function(x) {
                ear = put(head, new T.Mesh(capsuleGeo(0.09, 0.42), FUR), x, 0.62, -0.05); ear.rotation.z = x > 0 ? -0.15 : 0.15;
                ball(ear, 0.05, c.inner, 0, 0.02, 0.06, 1, 4.5, 0.4);
            });
            break;
        case 'cat': case 'fox':
            [-0.25, 0.25].forEach(function(x) {
                ear = put(head, new T.Mesh(geo('earcone', function() { return new T.ConeGeometry(0.16, 0.3, 16); }), FUR), x, 0.42, -0.02); ear.rotation.z = x > 0 ? -0.35 : 0.35;
                if (c.inner) { var tip = put(ear, new T.Mesh(geo('eartip', function() { return new T.ConeGeometry(0.08, 0.14, 12); }), mat(c.inner)), 0, 0.09, 0.03); }
            });
            break;
        case 'floppy':
            [-0.42, 0.42].forEach(function(x) { ear = ball(head, 0.17, c.earColor || c.fur, x, 0.02, -0.02, 0.6, 1.5, 0.9); ear.rotation.z = x > 0 ? 0.3 : -0.3; });
            break;
        case 'fins':
            [-0.46, 0.46].forEach(function(x) { ear = ball(head, 0.16, '#f0a030', x, 0, 0, 0.35, 1, 0.9); ear.rotation.z = x > 0 ? -0.5 : 0.5; });
            break;
        case 'owl':
            [-0.25, 0.25].forEach(function(x) { ear = put(head, new T.Mesh(geo('earcone', function() { return new T.ConeGeometry(0.16, 0.3, 16); }), FUR), x, 0.42, -0.02); ear.rotation.z = x > 0 ? -0.5 : 0.5; });
            break;
        default:
            [-0.32, 0.32].forEach(function(x) { ball(head, 0.13, c.fur, x, 0.36, -0.04); });
    }
    if (c.whiskers) [-1, 1].forEach(function(sx) { for (var k = 0; k < 2; k++) { var w = put(head, new T.Mesh(geo('whisk', function() { return new T.CylinderGeometry(0.008, 0.008, 0.28, 4); }), mat('#5a4636')), sx * 0.3, -0.1 - k * 0.05, 0.36); w.rotation.z = Math.PI / 2 + sx * (k ? -0.15 : 0.1); } });
    if (c.spikes) for (var k = 0; k < 10; k++) { var a = k / 10 * Math.PI * 2, sp = put(head, new T.Mesh(geo('spike', function() { return new T.ConeGeometry(0.05, 0.16, 8); }), mat('#e8a020')), Math.cos(a) * 0.45, Math.sin(a) * 0.45 + 0.05, -0.05); sp.rotation.z = a - Math.PI / 2; }
    root.scale.setScalar(0.8);
    return root;
}

// Taille des bâtiments (plus petits = plus d'espace entre eux dans le village)
var HOUSE_S = 0.62, SHOP_S = 0.72, SITE_S = 0.62;
// Maisons : murs arrondis, toit doux, porte en arche, fenêtres rondes (les fenêtres s'allument la nuit)
var windowGlass = [];
var HOUSE_STYLES = {
    lya:       { wall: '#f8e1ec', roof: '#e86f9a' },   // Eloise : rose
    melo:      { wall: '#fdf0d0', roof: '#f0a33a' },   // Lea : orange
    jo:        { wall: '#e3eefc', roof: '#4f86d9' },   // Tom : bleu
    celestine: { wall: '#efe4fb', roof: '#8e63cf' },   // Lucie : violet
    ordra:     { wall: '#e0f4f2', roof: '#2fa79a' },   // Ordralfabétix : turquoise
    max:       { wall: '#eadccc', roof: '#8a5a3c' },   // Max : refuge en bois
    charlie:   { wall: '#f4dcb2', roof: '#d9443b' }    // Charlie : rouge
};
function makeHouse(style, scale) {
    var g = new T.Group();
    rbox(g, 4.6, 0.35, 3.8, 0.15, '#c9bfae', 0, 0.17, 0);
    rbox(g, 4.1, 2.5, 3.3, 0.32, style.wall, 0, 1.55, 0);
    var roofGeo = geo('roof', function() {
        var s = new T.Shape();
        s.moveTo(-2.75, 0); s.lineTo(-0.25, 1.75); s.quadraticCurveTo(0, 1.95, 0.25, 1.75); s.lineTo(2.75, 0); s.quadraticCurveTo(0, -0.12, -2.75, 0);
        var r = new T.ExtrudeGeometry(s, { depth: 3.6, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.14, bevelSegments: 4, curveSegments: 10 });
        r.translate(0, 0, -1.8); return r;
    });
    put(g, new T.Mesh(roofGeo, mat(style.roof, { roughness: 0.55 })), 0, 2.78, 0);
    rbox(g, 0.55, 1.2, 0.55, 0.12, '#b8735a', 1.15, 4.0, -0.5);
    var doorGeo = geo('door', function() {
        var s = new T.Shape(); s.moveTo(-0.45, 0); s.lineTo(-0.45, 1.05); s.absarc(0, 1.05, 0.45, Math.PI, 0, true); s.lineTo(0.45, 0); s.lineTo(-0.45, 0);
        return new T.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 16 });
    });
    // Porte sur charnière (côté gauche) : elle s'ouvre vers l'extérieur quand Charlie entre
    var hinge = new T.Group(); hinge.position.set(-0.45, 0.35, 1.66); g.add(hinge);
    put(hinge, new T.Mesh(doorGeo, mat('#8a5a3c')), 0.45, 0, 0);
    ball(hinge, 0.06, mat('#f2c94c', { metalness: 0.6, roughness: 0.3 }), 0.73, 0.65, 0.16);
    var dark = new T.Mesh(geo('doorhole', function() { var sh = new T.Shape(); sh.moveTo(-0.45, 0); sh.lineTo(-0.45, 1.05); sh.absarc(0, 1.05, 0.45, Math.PI, 0, true); sh.lineTo(0.45, 0); sh.lineTo(-0.45, 0); return new T.ShapeGeometry(sh, 16); }), mat('#2a1a12'));
    dark.position.set(0, 0.35, 1.655); g.add(dark);
    g.userData.door = hinge;
    var glass = new T.MeshStandardMaterial({ color: lin('#a9dcf7'), emissive: lin('#ffb453'), emissiveIntensity: 0, roughness: 0.15 });
    windowGlass.push(glass);
    [-1.3, 1.3].forEach(function(x) {
        put(g, new T.Mesh(geo('wframe', function() { return new T.TorusGeometry(0.42, 0.07, 10, 28); }), mat('#ffffff')), x, 1.75, 1.7);
        var gl = new T.Mesh(geo('wglass', function() { return new T.CircleGeometry(0.4, 28); }), glass); gl.position.set(x, 1.75, 1.68); g.add(gl);
        rbox(g, 1.0, 0.25, 0.3, 0.08, '#9b6b47', x, 1.15, 1.85);
        ['#ff7aa8', '#ffd54f', '#ffffff'].forEach(function(c, k) { ball(g, 0.1, c, x - 0.3 + k * 0.3, 1.33, 1.88); });
    });
    g.scale.setScalar(scale || 0.8);
    return g;
}
// Boutique : maison avec auvent rayé et enseigne (emoji du métier)
var SHOP_STYLES = {
    bakery:   { wall: '#fff1dc', roof: '#c9823a', awning: '#e9a14a' },
    shop:     { wall: '#e8f6ec', roof: '#3e9e6a', awning: '#63c48d' },
    fishShop: { wall: '#e3f3fb', roof: '#2a8bbf', awning: '#5ab8e6' },
    museum:   { wall: '#efeaf8', roof: '#5a4b8a', awning: '#8c7bc4' },
    souvenir: { wall: '#e2f6f2', roof: '#009688', awning: '#4fc3b5' },
    pizzeria: { wall: '#fff0e6', roof: '#c62828', awning: '#ef5350' }
};
function makeShop(id, signEmoji) {
    var st = SHOP_STYLES[id] || SHOP_STYLES.shop;
    var g = makeHouse(st, SHOP_S);
    for (var i = 0; i < 6; i++) {
        rbox(g, 0.72, 0.12, 0.9, 0.05, i % 2 ? '#ffffff' : st.awning, -1.8 + i * 0.72, 2.55, 2.05).rotation.x = 0.45;
    }
    var sign = emojiSprite(signEmoji, 1.4); sign.position.set(0, 5.2, 0.6); sign.center.set(0.5, 0.5); g.add(sign);
    return g;
}
// Chantier : dalle, poteaux, poutres et caisses de matériaux
function makeConstruction() {
    var g = new T.Group();
    rbox(g, 4, 0.25, 3.4, 0.12, '#cfc3ae', 0, 0.12, 0);
    [[-1.7, -1.4], [1.7, -1.4], [-1.7, 1.4], [1.7, 1.4]].forEach(function(p) { rbox(g, 0.18, 2.4, 0.18, 0.06, '#c8955a', p[0], 1.3, p[1]); });
    rbox(g, 3.6, 0.16, 0.18, 0.06, '#b07d45', 0, 2.45, -1.4); rbox(g, 3.6, 0.16, 0.18, 0.06, '#b07d45', 0, 2.45, 1.4);
    rbox(g, 0.18, 0.16, 3.0, 0.06, '#b07d45', -1.7, 2.45, 0); rbox(g, 0.18, 0.16, 3.0, 0.06, '#b07d45', 1.7, 2.45, 0);
    rbox(g, 0.9, 0.6, 0.7, 0.1, '#e0b062', 0.6, 0.55, 0.4); rbox(g, 0.7, 0.45, 0.6, 0.1, '#d9534f', -0.6, 0.45, -0.3);
    ball(g, 0.35, '#f2c94c', -0.2, 0.4, 1.0, 1, 0.8, 1);
    g.scale.setScalar(SITE_S);
    return g;
}
// Panneau « terrain à bâtir »
function makePlotSign() {
    var g = new T.Group();
    rbox(g, 0.16, 1.3, 0.16, 0.05, '#9a6b48', 0, 0.65, 0);
    rbox(g, 1.3, 0.75, 0.12, 0.1, '#e8d2a6', 0, 1.35, 0.05);
    var dirt = new T.Mesh(geo('plotdirt', function() { return new T.CircleGeometry(1.6, 28); }), mat('#c9a77a', { roughness: 1 }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.02; dirt.receiveShadow = true; g.add(dirt);
    return g;
}
// Arbres en touffes de boules (pommes rouges si l'arbre en porte)
function makeTree(kind, apples, s) {
    var g = new T.Group();
    if (kind === 'pine' || kind === 'snowpine') {
        put(g, new T.Mesh(geo('pinetrunk', function() { return new T.CylinderGeometry(0.16, 0.22, 1, 12); }), mat('#8a5a3c')), 0, 0.5, 0);
        [[1.25, 1.3, 1.0], [1.0, 1.15, 1.75], [0.7, 1.0, 2.45]].forEach(function(c) {
            put(g, new T.Mesh(geo('pinecone' + c[0], function() { return new T.ConeGeometry(c[0], c[1], 16); }), mat('#2f7d46')), 0, c[2], 0);
            if (kind === 'snowpine') ball(g, c[0] * 0.55, '#f4f8fb', 0, c[2] + c[1] * 0.25, 0, 1, 0.45, 1);
        });
    } else {
        put(g, new T.Mesh(geo('trunk', function() { return new T.CylinderGeometry(0.2, 0.32, 1.6, 12); }), mat('#9a6b48')), 0, 0.8, 0);
        var A = kind === 'autumn' ? mat('#d9822b') : mat('#3f9230'), B = kind === 'autumn' ? mat('#e9a83a') : mat('#5cae3e');
        [[0, 2.15, 0, 1.05], [0.75, 1.9, 0.25, 0.8], [-0.7, 1.95, 0.15, 0.82], [0.1, 2.75, -0.1, 0.78], [0.05, 1.85, 0.75, 0.72]].forEach(function(b, k) {
            ball(g, b[3], k % 2 ? B : A, b[0], b[1], b[2]);
        });
        if (apples) [[0.55, 1.75, 0.85], [-0.6, 2.2, 0.75], [0.3, 2.6, 0.7]].forEach(function(a) { ball(g, 0.13, mat('#e8443c', { roughness: 0.4 }), a[0], a[1], a[2]); });
    }
    g.scale.setScalar(s);
    return g;
}
function makeRock(s) {
    var g = new T.Group();
    ball(g, 0.5, '#aab0b8', 0, 0.18, 0, 1.25, 0.62, 0.95);
    ball(g, 0.28, '#bfc4ca', 0.38, 0.12, 0.2, 1.1, 0.7, 1);
    g.scale.setScalar(s);
    return g;
}
var FLOWER_COLORS = { '🌷': '#ff6f9c', '🌻': '#ffcc2e', '🌹': '#e53935', '🌸': '#ffadd1', '🌼': '#ffe066', '💐': '#ff8ac0', '🪻': '#9b7be0', '🌺': '#ff5a6e', '🌾': '#e2c069' };
function makeFlower(e) {
    var g = new T.Group();
    put(g, new T.Mesh(geo('stem', function() { return new T.CylinderGeometry(0.03, 0.03, 0.45, 6); }), mat('#4e9a32')), 0, 0.22, 0);
    var c = FLOWER_COLORS[e] || '#ff86b0';
    for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; ball(g, 0.11, c, Math.cos(a) * 0.12, 0.48, Math.sin(a) * 0.12, 1, 0.6, 1); }
    ball(g, 0.08, '#f9a825', 0, 0.52, 0);
    return g;
}
// Montagne détaillée : forme de roche irrégulière, sommets secondaires, strates de couleur,
// neige au bord découpé et herbe au pied (couleurs par sommet, une seule forme par pic)
function mountainPeak(h, R) {
    var pts = [], NU = 26, i;
    for (i = 0; i <= NU; i++) {
        var u = i / NU;
        pts.push(new T.Vector2(Math.max(0.001, (1 - Math.pow(u, 1.15)) * h * 0.62 * (1 - 0.18 * Math.sin(u * Math.PI))), u * h));
    }
    var g = new T.LatheGeometry(pts, 56);
    var pos = g.attributes.position, cols = [], c = new T.Color();
    var ph = [R() * 6, R() * 6, R() * 6, R() * 6];
    var ROCK1 = lin('#7b7d86'), ROCK2 = lin('#9c9ea6'), DARK = lin('#5d5a58'), SNOW = lin('#f6f9fc'), GRASS = lin('#6f9a4a');
    for (i = 0; i < pos.count; i++) {
        var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), u = y / h, a = Math.atan2(z, x);
        // Relief : arêtes et creux autour du pic, plus marqués vers le bas
        var n = Math.sin(a * 5 + ph[0] + u * 3) * 0.55 + Math.sin(a * 11 + ph[1] - u * 5) * 0.3 + Math.sin(a * 23 + ph[2] + u * 9) * 0.15;
        var k = 1 + n * 0.16 * (1 - u * 0.6);
        pos.setX(i, x * k); pos.setZ(i, z * k);
        pos.setY(i, y + Math.sin(a * 7 + ph[3]) * 0.04 * h * (1 - u) * u * 4);
        // Couleurs : strates de roche, neige au-dessus d'une ligne découpée, herbe au pied
        c.copy(ROCK1).lerp(ROCK2, 0.5 + 0.5 * Math.sin(y * 2.3 + n * 2));
        if (n < -0.35) c.lerp(DARK, 0.5);
        var snowLine = 0.56 + Math.sin(a * 6 + ph[1]) * 0.07 + Math.sin(a * 13 + ph[2]) * 0.04;
        if (u > snowLine) c.copy(SNOW);
        else if (u > snowLine - 0.05) c.lerp(SNOW, 0.5);
        if (u < 0.1) c.lerp(GRASS, (0.1 - u) / 0.1 * 0.85);
        cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    var m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
    m.castShadow = true; m.receiveShadow = true;
    return m;
}
function makeMountain(h, seed) {
    var g = new T.Group(), R = rand(seed || 7);
    g.userData.baseR = h * 0.62;
    g.add(mountainPeak(h, R));
    // Deux sommets secondaires collés au pic principal
    [[0.62, 0.42, 0.18], [0.5, -0.36, -0.22]].forEach(function(sp) {
        var sub = mountainPeak(h * sp[0], R);
        sub.position.set(h * sp[1], 0, h * sp[2]);
        g.add(sub);
    });
    // Quelques rochers au pied
    for (var i = 0; i < 5; i++) {
        var a = R() * Math.PI * 2, d = h * (0.55 + R() * 0.15);
        var rk = ball(g, h * (0.04 + R() * 0.03), '#8d8f99', Math.cos(a) * d, h * 0.02, Math.sin(a) * d, 1.3, 0.7, 1);
        rk.rotation.y = R() * 3;
    }
    return g;
}
function makeFountain() {
    var g = new T.Group();
    put(g, new T.Mesh(new T.TorusGeometry(2.1, 0.35, 14, 40), mat('#d7d2c8')), 0, 0.35, 0).rotation.x = Math.PI / 2;
    var water = new T.Mesh(new T.CircleGeometry(2.0, 36), new T.MeshStandardMaterial({ color: lin('#5fc0ec'), roughness: 0.08, metalness: 0.1 }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.45; g.add(water);
    put(g, new T.Mesh(new T.CylinderGeometry(0.28, 0.4, 1.6, 20), mat('#d7d2c8')), 0, 0.8, 0);
    put(g, new T.Mesh(new T.CylinderGeometry(0.9, 0.5, 0.25, 24), mat('#d7d2c8')), 0, 1.65, 0);
    ball(g, 0.3, mat('#9fdcf7', { transparent: true, opacity: 0.8, roughness: 0.1 }), 0, 2.0, 0, 1, 1.3, 1);
    return g;
}
function makePalm(s) {
    var g = new T.Group(), i, top = new T.Vector3();
    // Tronc courbé et effilé, en segments avec de petits anneaux (écorce de palmier)
    var pts = [];
    for (i = 0; i <= 8; i++) { var u = i / 8; pts.push(new T.Vector3(Math.sin(u * 1.4) * 0.45, u * 2.7, 0)); }
    var curve = new T.CatmullRomCurve3(pts);
    put(g, new T.Mesh(geo('palmtrunk', function() {
        var tg = new T.TubeGeometry(curve, 24, 0.17, 10, false);
        var p = tg.attributes.position;   // effiler vers le haut
        for (var k = 0; k < p.count; k++) { var y = p.getY(k), u = Math.max(0, Math.min(1, y / 2.7)), f = 1 - u * 0.4, c = curve.getPointAt(u); p.setX(k, c.x + (p.getX(k) - c.x) * f); p.setZ(k, c.z + (p.getZ(k) - c.z) * f); }
        tg.computeVertexNormals(); return tg;
    }), mat('#b08356')), 0, 0, 0);
    for (i = 1; i < 8; i++) { var cp = curve.getPointAt(i / 8); put(g, new T.Mesh(geo('palmring', function() { return new T.TorusGeometry(0.16, 0.035, 6, 14); }), mat('#8f6a43')), cp.x, cp.y, cp.z).rotation.x = Math.PI / 2; }
    curve.getPointAt(1, top);
    // Palmes arquées
    for (i = 0; i < 7; i++) {
        var a = i / 7 * Math.PI * 2, leaf = new T.Group(); leaf.position.copy(top); leaf.rotation.y = -a; g.add(leaf);
        for (var k = 0; k < 4; k++) ball(leaf, 0.32 - k * 0.04, '#46a346', 0.3 + k * 0.32, 0.05 - k * k * 0.06, 0, 1.3, 0.18, 0.55);
    }
    ball(g, 0.15, '#7a5230', top.x + 0.12, top.y - 0.12, 0.1); ball(g, 0.15, '#7a5230', top.x - 0.1, top.y - 0.16, -0.08);
    g.scale.setScalar(s);
    return g;
}
// Port : ponton en planches sur pilotis, bateau de marchandise, caisses
function makeDock(w, len) {
    var g = new T.Group(), n = Math.round(len / 0.55);
    for (var i = 0; i < n; i++) rbox(g, w, 0.12, 0.48, 0.04, i % 2 ? '#a67c52' : '#94693f', 0, 0.3, -len / 2 + 0.28 + i * (len - 0.56) / Math.max(1, n - 1));
    for (i = 0; i <= Math.floor(len / 2.2); i++) [-w / 2 + 0.1, w / 2 - 0.1].forEach(function(x) { put(g, new T.Mesh(geo('pile', function() { return new T.CylinderGeometry(0.1, 0.1, 1.4, 10); }), mat('#7a5530')), x, -0.3, -len / 2 + 0.3 + i * 2.2); });
    return g;
}
function makeBoat() {
    var g = new T.Group(), hull = new T.Group(); g.add(hull);
    rbox(hull, 2.2, 0.8, 5.2, 0.4, '#d9443b', 0, 0.25, 0);
    rbox(hull, 2.0, 0.12, 5.0, 0.3, '#f4ede0', 0, 0.68, 0);
    rbox(hull, 1.4, 1.1, 1.6, 0.25, '#ffffff', 0, 1.3, 0.9);
    rbox(hull, 1.5, 0.14, 1.7, 0.1, '#2f5d8a', 0, 1.9, 0.9);
    put(hull, new T.Mesh(new T.CylinderGeometry(0.22, 0.26, 0.9, 16), mat('#2f5d8a')), 0, 2.35, 0.5);
    [-0.4, 0.4].forEach(function(x) { put(hull, new T.Mesh(geo('porthole', function() { return new T.TorusGeometry(0.14, 0.04, 8, 16); }), mat('#2f5d8a')), x + (x > 0 ? 0.31 : -0.31), 1.35, 0.9).rotation.y = Math.PI / 2; });
    [[-0.5, -1.2], [0.45, -1.4], [0, -0.6]].forEach(function(p) { rbox(hull, 0.6, 0.5, 0.6, 0.06, '#c98f5a', p[0], 0.98, p[1]); });
    g.userData.hull = hull;
    return g;
}
function makeCrate() {
    var g = new T.Group();
    rbox(g, 0.7, 0.6, 0.7, 0.06, '#c98f5a', 0, 0.3, 0);
    rbox(g, 0.74, 0.08, 0.08, 0.02, '#8a5a3c', 0, 0.45, 0.33); rbox(g, 0.74, 0.08, 0.08, 0.02, '#8a5a3c', 0, 0.15, 0.33);
    return g;
}
// Ferme : grange rouge, bottes de foin, champs cultivés
function makeBarn() {
    var g = new T.Group();
    rbox(g, 5, 3, 3.8, 0.3, '#c0392b', 0, 1.5, 0);
    var roofGeo = geo('barnroof', function() {
        var s = new T.Shape();
        s.moveTo(-3, 0); s.lineTo(-1.6, 1.3); s.quadraticCurveTo(0, 2.1, 1.6, 1.3); s.lineTo(3, 0); s.quadraticCurveTo(0, -0.1, -3, 0);
        var r = new T.ExtrudeGeometry(s, { depth: 4.1, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 4, curveSegments: 10 });
        r.translate(0, 0, -2.05); return r;
    });
    put(g, new T.Mesh(roofGeo, mat('#7b2d2d', { roughness: 0.6 })), 0, 3.0, 0);
    rbox(g, 1.8, 2.2, 0.12, 0.08, '#8a4b2a', 0, 1.1, 1.92);
    [0.78, -0.78].forEach(function(r) { rbox(g, 2.6, 0.14, 0.08, 0.04, '#f5f0e6', 0, 1.1, 2.0).rotation.z = r; });
    rbox(g, 1.9, 0.14, 0.1, 0.04, '#f5f0e6', 0, 2.25, 2.0);
    return g;
}
function makeHay(w) {
    var g = new T.Group();
    var bale = put(g, new T.Mesh(geo('hay', function() { return new T.CylinderGeometry(0.5, 0.5, 1, 24); }), mat('#e2b84e', { roughness: 0.95 })), 0, 0.5, 0);
    bale.rotation.z = Math.PI / 2;
    var s = Math.max(0.8, w * 0.75);
    g.scale.set(s, s * 0.85, s * 0.85);
    return g;
}
function makeField(el) {
    var g = new T.Group(), w = el.offsetWidth * U, d = el.offsetHeight * U;
    rbox(g, w, 0.18, d, 0.12, '#7a5a37', 0, 0.09, 0);
    var crop = /🌽/.test(el.textContent) ? 'corn' : 'wheat';
    var rows = Math.max(2, Math.round(d / 0.9)), cols = Math.max(3, Math.round(w / 0.7));
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x = -w / 2 + 0.45 + c * (w - 0.9) / (cols - 1), z = -d / 2 + 0.45 + r * (d - 0.9) / Math.max(1, rows - 1);
        if (crop === 'corn') {
            put(g, new T.Mesh(capsuleGeo(0.08, 0.7), mat('#5c9a35')), x, 0.6, z);
            ball(g, 0.1, '#f2c94c', x + 0.08, 0.75, z, 0.8, 1.6, 0.8);
        } else {
            put(g, new T.Mesh(capsuleGeo(0.09, 0.35), mat('#d9b44a')), x, 0.42, z);
        }
    }
    return g;
}
// Jardin : 25 parcelles (cliquables comme dans le jeu 2D) ; les cultures s'affichent par-dessus
function makeGarden(el) {
    var g = new T.Group();
    var cells = el.querySelectorAll('.garden-cell');
    for (var i = 0; i < cells.length; i++) {
        var cx = (i % 5 - 2) * 1.0, cz = (Math.floor(i / 5) - 2) * 1.0;
        var plot = rbox(g, 0.86, 0.14, 0.86, 0.1, '#8a5a34', cx, 0.07, cz);
        plot.userData.el = cells[i];
        g.userData['cell' + i] = { x: cx, z: cz };
    }
    g.userData.crops = {};
    return g;
}

// ═══════════════════════ Décor fixe (sol, mer, rivière, chemins) ═══════════════════════
// Texture d'eau : bleu, reflets ondulés et petites taches d'écume (répétée, on la fait défiler)
var riverTex = null, seaTex = null, lakeTex = null;
function waterTexture(base) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    var R = rand(9);
    g.lineCap = 'round';
    for (var i = 0; i < 26; i++) {
        var y = R() * 256, x = R() * 256, len = 30 + R() * 60;
        g.strokeStyle = 'rgba(255,255,255,' + (0.12 + R() * 0.2) + ')'; g.lineWidth = 2 + R() * 3;
        g.beginPath(); g.moveTo(x, y);
        g.bezierCurveTo(x + len * 0.3, y - 6, x + len * 0.6, y + 6, x + len, y);
        g.stroke();
        // recopie de l'autre côté pour que la texture se répète sans couture
        g.beginPath(); g.moveTo(x - 256, y); g.bezierCurveTo(x - 256 + len * 0.3, y - 6, x - 256 + len * 0.6, y + 6, x - 256 + len, y); g.stroke();
    }
    for (i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + R() * 0.3) + ')'; g.beginPath(); g.arc(R() * 256, R() * 256, 1 + R() * 2, 0, 7); g.fill(); }
    var t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
}
function shorelineY(x) { return Game.world.shorelineY ? Game.world.shorelineY(x) : Game.CONFIG.SEA_TOP; }
function rectOf(el) { return { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0, w: el.offsetWidth, h: el.offsetHeight }; }
function inEllipse(px, py, r) { var dx = (px - (r.x + r.w / 2)) / (r.w / 2), dy = (py - (r.y + r.h / 2)) / (r.h / 2); return dx * dx + dy * dy; }

function buildTerrain() {
    var C = Game.CONFIG, W = C.WORLD_W, H = C.WORLD_H;
    var world = document.getElementById('game-world');
    var forest = Array.prototype.map.call(world.querySelectorAll('.forest-ground'), rectOf);
    var hills = Array.prototype.map.call(world.querySelectorAll('.hill'), rectOf);
    var pens = Array.prototype.map.call(world.querySelectorAll('.farm-pen'), rectOf);
    var MZ = { x: 2650, y: 300, w: 1750, h: 1450 };   // zone des montagnes (comme entities.js)
    // Rivière et lacs : on creuse leur lit dans le sol (berges en pente)
    var rsegs = Game.buildRiverSegments();
    var waters = rsegs.map(function(sg, i) {
        // Direction du courant : vers le morceau suivant du même bras (sinon on prolonge le précédent)
        var a = sg, b = rsegs[i + 1], dx, dy;
        if (b && Math.hypot(b.x - a.x, b.y - a.y) < 220) { dx = b.x - a.x; dy = b.y - a.y; }
        else { var pv = rsegs[i - 1] || a; dx = a.x - pv.x; dy = a.y - pv.y; }
        var d = Math.hypot(dx, dy) || 1;
        return { x: sg.x, y: sg.y, w: sg.w, h: sg.h, dx: dx / d, dy: dy / d };
    });
    var lakes = Array.prototype.map.call(world.querySelectorAll('.lake-water'), rectOf);
    waters = waters.concat(lakes);
    var BANK = lin('#a88d5c'), BED = lin('#6b7a52');
    var seg = 300;
    var g = new T.PlaneGeometry(W * U, H * U, seg, seg);
    g.rotateX(-Math.PI / 2); g.translate(W * U / 2, 0, H * U / 2);
    var pos = g.attributes.position, cols = [], c = new T.Color(), R = rand(3);
    var GRASS = lin('#5fae3c'), GRASS2 = lin('#73bd47'), FOREST = lin('#3f8a2f'), SAND = lin('#ecd39a'), WET = lin('#d6b97a'), SEABED = lin('#b9a77a'), ROCK = lin('#b8b8ad'), SNOW = lin('#eef3f6'), DIRT = lin('#b48a5c');
    for (var i = 0; i < pos.count; i++) {
        var px = pos.getX(i) / U, py = pos.getZ(i) / U, h = 0;
        var shore = shorelineY(px);
        c.copy(GRASS).lerp(GRASS2, 0.5 + 0.5 * Math.sin(px * 0.004) * Math.cos(py * 0.005));
        c.offsetHSL(0, 0, (R() - 0.5) * 0.02);
        forest.forEach(function(r) { var e = inEllipse(px, py, r); if (e < 1) c.lerp(FOREST, Math.min(1, (1 - e) * 2)); });
        pens.forEach(function(r) { if (px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h) c.lerp(DIRT, 0.55); });
        hills.forEach(function(r) { var e = inEllipse(px, py, r); if (e < 1) h += Math.cos(Math.sqrt(e) * Math.PI / 2) * Math.min(r.w, r.h) * U * 0.25; });
        var me = inEllipse(px, py, MZ);
        if (me < 1) {
            var k = Math.min(1, (1 - me) * 1.6);
            h += k * (0.6 + Math.sin(px * 0.01) * Math.cos(py * 0.012) * 0.5);
            c.lerp(ROCK, k * 0.55);
            if (k > 0.55) c.lerp(SNOW, (k - 0.55) * 1.6);
        }
        if (py > C.BEACH_TOP - 60) c.lerp(SAND, Math.min(1, (py - (C.BEACH_TOP - 60)) / 120));
        if (py > shore - 120) { var d = (py - (shore - 120)) / 120; h -= Math.min(1, d) * 0.15; c.lerp(WET, Math.min(1, d) * 0.6); }
        if (py > shore) { h -= Math.min(1.2, (py - shore) / 300); c.copy(SEABED); }
        // Distance à l'eau la plus proche (ellipses de la rivière et des lacs)
        var ew = 9;
        for (var wi = 0; wi < waters.length; wi++) {
            var wr = waters[wi];
            if (py < wr.y - 200 || py > wr.y + wr.h + 200) continue;
            var ev = inEllipse(px, py, wr); if (ev < ew) ew = ev;
        }
        if (ew < 1) { var dep = Math.min(1, (1 - ew) / 0.45); dep = dep * dep * (3 - 2 * dep); h = h * (1 - dep) - 0.6 * dep; c.lerp(BED, dep); }
        if (ew < 1.35) c.lerp(BANK, Math.max(0, 1 - Math.abs(ew - 1) / 0.35) * 0.7);
        pos.setY(i, h);
        cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    // Carte des hauteurs (pour poser les objets et Charlie sur le sol sans tester tous les triangles)
    heightGrid = { n: seg + 1, cell: W / seg, h: new Float32Array(pos.count) };
    for (i = 0; i < pos.count; i++) heightGrid.h[i] = pos.getY(i);
    groundMesh = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Mer (vagues qui bougent doucement)
    seaTex = waterTexture('#2f97d1');
    seaTex.repeat.set(W * U / 6, (H - C.SEA_TOP + 400) * U / 6);
    var sea = new T.Mesh(new T.PlaneGeometry(W * U, (H - C.SEA_TOP + 400) * U), new T.MeshStandardMaterial({ map: seaTex, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.88 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(W * U / 2, -0.12, (C.SEA_TOP - 400 + (H - C.SEA_TOP + 400) / 2) * U);
    scene.add(sea);

    // Rivière, lacs : surface d'eau au fond du lit creusé, avec une texture qui coule vers la mer
    riverTex = waterTexture('#3aa6dc');
    var WATER = new T.MeshStandardMaterial({ map: riverTex, roughness: 0.1, metalness: 0.1 });
    var verts = [], uvs = [];
    function ellipse(r, y) {
        var cx = (r.x + r.w / 2) * U, cz = (r.y + r.h / 2) * U, rx = r.w / 2 * U * 1.04, rz = r.h / 2 * U * 1.04, n = 20;
        // Repère de la texture aligné sur le courant : v suit l'eau qui descend, u la travers
        var fx = r.dx === undefined ? 0 : r.dx, fz = r.dy === undefined ? 1 : r.dy;
        function v(x, z) { verts.push(x, y, z); uvs.push((x * fz - z * fx) / 4, (x * fx + z * fz) / 4); }
        for (var k = 0; k < n; k++) {
            var a1 = k / n * Math.PI * 2, a2 = (k + 1) / n * Math.PI * 2;
            v(cx, cz); v(cx + Math.cos(a2) * rx, cz + Math.sin(a2) * rz); v(cx + Math.cos(a1) * rx, cz + Math.sin(a1) * rz);
        }
    }
    function waterMeshOf(list, material) {
        verts = []; uvs = [];
        list.forEach(function(r) { ellipse(r, -0.16); });
        var wg = new T.BufferGeometry();
        wg.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
        wg.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
        wg.computeVertexNormals();
        var m = new T.Mesh(wg, material); m.receiveShadow = true; scene.add(m);
    }
    waterMeshOf(waters.slice(0, rsegs.length), WATER);
    lakeTex = waterTexture('#3aa6dc');
    waterMeshOf(lakes, new T.MeshStandardMaterial({ map: lakeTex, roughness: 0.1, metalness: 0.1 }));

    // Chemins de sable (rectangles aux coins arrondis)
    var PATH = mat('#e3bd7c', { roughness: 1 });
    (Game.PATHS || []).forEach(function(p) {
        var r = Math.min(30, p.w / 2, p.h / 2) * U, w = p.w * U, h = p.h * U;
        var s = new T.Shape();
        s.moveTo(r, 0); s.lineTo(w - r, 0); s.quadraticCurveTo(w, 0, w, r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
        s.lineTo(r, h); s.quadraticCurveTo(0, h, 0, h - r); s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
        var m = new T.Mesh(new T.ShapeGeometry(s, 6), PATH);
        m.rotation.x = Math.PI / 2; m.position.set(p.x * U, 0.03, p.y * U); m.receiveShadow = true;
        scene.add(m);
    });

    // Enclos de la ferme : petites barrières
    var FENCE = mat('#c99a63');
    pens.forEach(function(r) {
        var grp = new T.Group(); scene.add(grp);
        var step = 45, x, y;
        for (x = r.x; x <= r.x + r.w; x += step) { rbox(grp, 0.14, 0.7, 0.14, 0.05, FENCE, x * U, 0.35, r.y * U); rbox(grp, 0.14, 0.7, 0.14, 0.05, FENCE, x * U, 0.35, (r.y + r.h) * U); }
        for (y = r.y; y <= r.y + r.h; y += step) { rbox(grp, 0.14, 0.7, 0.14, 0.05, FENCE, r.x * U, 0.35, y * U); rbox(grp, 0.14, 0.7, 0.14, 0.05, FENCE, (r.x + r.w) * U, 0.35, y * U); }
    });
}

// ═══════════════════════ Pont carte 2D → 3D ═══════════════════════
var tracked = new Map();      // élément 2D → objet 3D
var gameWorld = null;
var MOVING = /villager-sprite|creature|sea-creature|mtn-animal|farmer-sprite|farm-escaped|farm-animal|wasp|cargo-boat/;

function emojiOf(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
        if (n.nodeType === 1 && !n.classList.contains('building-label') && !n.classList.contains('speech-bubble') && n.textContent.trim() && !n.querySelector('.garden-cell')) return n.textContent.trim();
    }
    return '';
}
function labelOf(el) { var l = el.querySelector(':scope > .building-label'); return l ? l.textContent.trim() : ''; }
function bubbleOf(el) { var b = el.querySelector('.speech-bubble'); return b && b.style.display === 'block' ? b.textContent.trim() : ''; }

function kindOf(el, e) {
    var cl = el.classList, id = el.id;
    if (id === 'player' || cl.contains('mountain-snow') || e === '❄️') return 'skip';
    if (id === 'garden-area') return 'garden';
    if (id === 'fountain-anchor') return 'fountain';
    if (/-anchor$/.test(id)) return cl.contains('house-plot') ? 'construction' : 'shop';
    if (cl.contains('house-exterior') || id === 'house-site') {
        if (e === '🏗️' || e === '🧱') return 'construction';
        if (e === '🪧' || e === '🏚️') return 'plot';
        return 'house';
    }
    if (cl.contains('villager-sprite')) return 'villager';
    if (cl.contains('farmer-sprite')) return 'farmer';
    if (!el.className) {
        // Décor de la ferme (éléments sans classe) : grange, champs, bottes de foin ; le reste est ignoré
        if (labelOf(el).indexOf('La Ferme') > -1) return 'barn';
        if (el.querySelector(':scope > div') && /🌽|🌾/.test(el.textContent) && el.offsetWidth > 120) return 'field';
        if (!el.textContent.trim() && /repeating-linear-gradient/.test(el.style.background) && el.offsetWidth < 90) return 'hay';
        if (e === '🚜') return 'sprite';
        if (/a67c52|166, 124, 82/.test(el.style.backgroundImage)) return 'dock';   // ponton du port
        return 'skip';
    }
    if (cl.contains('cargo-boat')) return 'boat';
    if (cl.contains('cargo-crate')) return 'crate';
    if (cl.contains('snowy-pine')) return 'snowpine';
    if (cl.contains('tree')) return e === '🌲' ? 'pine' : (e === '🍂' ? 'autumn' : 'tree');
    if (cl.contains('stone') || e === '🪨') return 'rock';
    if (cl.contains('flower')) return 'flower';
    if (/^(🏔️|🗻|⛰️)/.test(e)) return 'mountain';
    if (e === '🌴') return 'palm';
    return 'sprite';
}
function houseIdOf(el) { return el.id === 'house-site' ? 'charlie' : el.id.replace('house-', ''); }

function buildFor(el, kind, e, label) {
    var obj, size = (parseFloat(getComputedStyle(el).fontSize) || 32) * U;
    switch (kind) {
        case 'house': obj = makeHouse(HOUSE_STYLES[houseIdOf(el)] || HOUSE_STYLES.charlie, HOUSE_S); break;
        case 'shop': {
            var shop = (Game.SHOPS || []).find(function(s) { return s.loc + '-anchor' === el.id; });
            obj = makeShop(shop ? shop.id : 'shop', (shop && shop.sign) || e || '🏪'); break;
        }
        case 'construction': obj = makeConstruction(); break;
        case 'plot': obj = makePlotSign(); break;
        case 'fountain': obj = makeFountain(); break;
        case 'garden': obj = makeGarden(el); break;
        case 'tree': case 'autumn': case 'pine': case 'snowpine':
            obj = makeTree(kind === 'tree' ? 'green' : kind, kind === 'tree' && el.dataset.hasApple === 'true', Math.max(0.7, Math.min(1.3, size / 1.1))); break;
        case 'rock': obj = makeRock(Math.max(0.6, Math.min(1.6, size / 0.8))); break;
        case 'flower': obj = makeFlower(e); break;
        case 'mountain': obj = makeMountain(Math.max(8, size * 2.6), Math.round((parseFloat(el.style.left) || 1) + (parseFloat(el.style.top) || 1)) % 99991 + 1); break;
        case 'palm': obj = makePalm(Math.max(0.8, size / 1.2)); break;
        case 'villager': {
            var em = el.querySelector('.villager-emoji');
            obj = makeCritter(em ? em.textContent.trim() : e); break;
        }
        case 'farmer': obj = makeFarmer(); break;
        case 'dock': obj = makeDock(el.offsetWidth * U, el.offsetHeight * U); break;
        case 'boat': obj = makeBoat(); break;
        case 'crate': obj = makeCrate(); break;
        case 'barn': obj = makeBarn(); break;
        case 'hay': obj = makeHay(el.offsetWidth * U); break;
        case 'field': obj = makeField(el); break;
        default: {
            obj = new T.Group();
            var sp = emojiSprite(e || '❔', Math.max(0.8, size * 1.25)); obj.add(sp);
            obj.userData.sprite = sp;
        }
    }
    // La nuit, les maisons et boutiques construites éclairent autour d'elles par leurs fenêtres
    if (kind === 'house' || kind === 'shop') {
        var glow = new T.PointLight(lin('#ffc27a'), _windowLight, 9, 2);
        glow.position.set(0, 1.5, 2.8);
        obj.add(glow);
        houseLights.push(glow);
        // Halo doré autour des fenêtres + flaque de lumière douce sur le sol devant la maison
        [-1.3, 1.3].forEach(function(x) {
            var halo = new T.Sprite(glowMaterial(0.85)); halo.position.set(x, 1.75, 1.85); halo.scale.set(1.9, 1.9, 1); obj.add(halo);
        });
        var pool = new T.Mesh(geo('pool', function() { return new T.PlaneGeometry(5.2, 3.0); }), glowMaterial(0.4, true));
        pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.06, 3.0); obj.add(pool);
    }
    if (label && kind !== 'flower') {
        var top = { house: 4.6 * HOUSE_S / 0.8, shop: 5.6 * SHOP_S / 0.95, construction: 3 * SITE_S / 0.8, plot: 2.2, fountain: 2.6, garden: 1.2, villager: 2.3, farmer: 2.3, barn: 4.8, mountain: Math.max(8, size * 2.6) + 0.6 }[kind] || (kind === 'sprite' ? size * 1.3 : 3.5);
        var lab = labelSprite(label, 0.55); lab.position.y = top; obj.add(lab);
    }
    obj.traverse(function(o) { o.userData.el = o.userData.el || el; });
    return obj;
}

// Point au sol d'un élément 2D : bas-centre de son dessin (hors étiquette)
function worldXY(el) {
    var x = 0, y = 0, n = el;
    while (n && n !== gameWorld) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x: x, y: y };
}
function groundPoint(el, kind) {
    var wxy = worldXY(el), x = wxy.x, y = wxy.y;
    var first = el.firstElementChild && !el.firstElementChild.classList.contains('building-label') ? el.firstElementChild : null;
    var w = el.offsetWidth, h = first ? first.offsetHeight : el.offsetHeight;
    if (kind === 'garden' || kind === 'fountain' || kind === 'field' || kind === 'dock') return { x: x + w / 2, y: y + el.offsetHeight / 2 };
    if (kind === 'barn') return { x: x + w / 2, y: y + 140 };
    if (el.classList.contains('house-exterior') || /-anchor$/.test(el.id)) return { x: x + w / 2, y: y + h * 0.75 };
    return { x: x + w / 2, y: y + h * 0.9 };
}
var _ray, _down, _from;
var heightGrid = null;
// Hauteur du sol en un point de la carte (interpolée dans la carte des hauteurs)
function heightAt(px, py) {
    if (!heightGrid) return 0;
    var n = heightGrid.n, gx = Math.max(0, Math.min(n - 1.001, px / heightGrid.cell)), gy = Math.max(0, Math.min(n - 1.001, py / heightGrid.cell));
    var ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, H = heightGrid.h;
    var h00 = H[iy * n + ix], h10 = H[iy * n + ix + 1], h01 = H[(iy + 1) * n + ix], h11 = H[(iy + 1) * n + ix + 1];
    var h = (h00 * (1 - fx) + h10 * fx) * (1 - fy) + (h01 * (1 - fx) + h11 * fx) * fy;
    return Math.max(h, -0.3);   // dans l'eau peu profonde, Charlie a les pieds mouillés
}

function syncElement(el) {
    var e = emojiOf(el), kind = kindOf(el, e);
    if (kind === 'skip') return;
    var label = labelOf(el);
    var key = kind + '|' + e + '|' + label + '|' + (el.dataset.hasApple || '') + '|' + el.className;
    var rec = tracked.get(el);
    if (!rec || rec.key !== key) {
        if (rec) scene.remove(rec.obj);
        rec = { key: key, obj: buildFor(el, kind, e, label), kind: kind, moving: MOVING.test(el.className), bubble: '' };
        scene.add(rec.obj);
        tracked.set(el, rec);
    }
    rec.seen = true;
    if (rec.col === undefined) rec.col = colliderFor(el, kind, rec.obj);
    rec.obj.visible = el.style.display !== 'none' && !rec.hideInWater;
    if (!rec.moving) placeRec(el, rec);
    if (kind === 'garden') syncGarden(el, rec.obj);
}
// Bâtiments : la porte du modèle 3D est placée pile sur le point où le jeu propose « Entrer »,
// sinon les murs (collisions) empêcheraient d'y arriver. Retourne null si l'élément n'est pas un bâtiment.
function doorPoint(el, kind) {
    var L = Game.CONFIG.LOCATIONS;
    if (el.id === 'house-site') return { x: L.charlieHouse.x, y: L.charlieHouse.y };
    if (el.classList.contains('house-exterior')) {
        var h = Game.HOUSES.find(function(hh) { return 'house-' + hh.id === el.id; });
        return h ? { x: h.x, y: h.y + 50 } : null;
    }
    if (/-anchor$/.test(el.id) && el.id !== 'fountain-anchor') {
        var shop = (Game.SHOPS || []).find(function(sh) { return sh.loc + '-anchor' === el.id; });
        return shop && L[shop.loc] ? { x: L[shop.loc].x, y: L[shop.loc].y } : null;
    }
    return null;
}
// Profondeur (en px) entre la porte et le centre du modèle, selon sa taille
var DOOR_BACK = { house: 48, shop: 56, construction: 43, plot: 0 };   // ≈ demi-profondeur du socle, selon la taille
function placeRec(el, rec) {
    if (rec.kind === 'boat') {   // sur l'eau, il se balance doucement
        var bp = groundPoint(el, 'boat'), t = performance.now() / 1000;
        rec.px = bp.x; rec.py = bp.y;
        rec.obj.position.set(bp.x * U, -0.25 + Math.sin(t * 1.6) * 0.06, bp.y * U);
        rec.obj.userData.hull.rotation.z = Math.sin(t * 1.3) * 0.05;
        return;
    }
    var p = groundPoint(el, rec.kind);
    var door = DOOR_BACK[rec.kind] !== undefined ? doorPoint(el, rec.kind) : null;
    if (door) p = { x: door.x, y: door.y - DOOR_BACK[rec.kind] };
    if (rec.px === p.x && rec.py === p.y) return;
    rec.px = p.x; rec.py = p.y;
    var gh = heightAt(p.x, p.y);
    rec.obj.position.set(p.x * U, rec.kind === 'mountain' ? gh - 0.5 : (rec.kind === 'dock' ? 0 : gh), p.y * U);
    // Décor posé par erreur dans l'eau (palmier dans la rivière...) : on ne l'affiche pas
    if ((rec.kind === 'palm' || (rec.kind === 'sprite' && !rec.moving) || (rec.kind === 'rock' && !el.classList.contains('stone'))) && gh < -0.2) rec.hideInWater = true;
}
function syncGarden(el, g) {
    var cells = el.querySelectorAll('.garden-cell');
    for (var i = 0; i < cells.length; i++) {
        var t = cells[i].textContent.trim(), cur = g.userData.crops[i];
        if (cur && cur.text === t) continue;
        if (cur && cur.sprite) g.remove(cur.sprite);
        g.userData.crops[i] = { text: t, sprite: null };
        if (t) {
            var sp = emojiSprite(t, 0.8), c = g.userData['cell' + i];
            sp.position.set(c.x, 0.15, c.z); sp.userData.el = cells[i];
            g.add(sp); g.userData.crops[i].sprite = sp;
        }
    }
}
var _scanT = 0, _dtFrame = 0.016;

// ═══════════════════════ Collisions ═══════════════════════
// Ce qui bloque Charlie : bâtiments (rectangles), arbres, montagnes, villageois... (cercles).
// Cailloux et fleurs ne bloquent pas (on les ramasse en marchant dessus), ni l'eau (on pêche au bord).
var CHARLIE_R = 20;
function colliderFor(el, kind, obj) {
    var sc = obj.scale.x;
    switch (kind) {
        // Bâtiments : la taille de ce qu'on voit (toit qui dépasse, socle), pas seulement les murs
        case 'house':        return { hw: 2.9 * HOUSE_S * 0.9 / U, hd: 3.8 * HOUSE_S / 2 / U };
        case 'shop':         return { hw: 2.9 * SHOP_S * 0.9 / U, hd: 3.8 * SHOP_S / 2 / U };
        case 'construction': return { hw: 4 * SITE_S / 2 / U, hd: 3.4 * SITE_S / 2 / U };
        case 'barn':         return { hw: 2.5 / U, hd: 1.9 / U };
        case 'field':        return { hw: el.offsetWidth / 2, hd: el.offsetHeight / 2 };
        case 'fountain':     return { r: 2.45 / U };
        case 'plot':         return { r: 8 };
        case 'tree': case 'autumn': case 'pine': case 'snowpine': return { r: 0.9 * sc / U };   // le feuillage, pas seulement le tronc
        case 'palm':         return { r: 0.3 * sc / U };
        case 'mountain':     return { r: obj.userData.baseR ? obj.userData.baseR / U * 0.45 : 60 };   // le cœur du pic : on peut marcher sur les pentes (edelweiss)
        case 'hay':          return { r: 0.55 * sc / U };
        case 'villager': case 'farmer': return { r: 14 };
        case 'rock':         return el.classList.contains('stone') ? null : { r: 0.45 * sc / U };
        default:             return null;
    }
}
function collide() {
    var c = Game.state.charlie;
    tracked.forEach(function(rec) {
        var col = rec.col;
        if (!col || !rec.obj.visible || rec.px === undefined) return;
        var dx = c.x - rec.px, dy = c.y - rec.py;
        if (Math.abs(dx) > 400 || Math.abs(dy) > 400) return;
        if (col.r) {
            var d = Math.hypot(dx, dy), min = col.r + CHARLIE_R;
            if (d < min) {
                if (d < 0.01) { dx = 0; dy = 1; d = 1; }
                c.x = rec.px + dx / d * min; c.y = rec.py + dy / d * min;
            }
        } else {
            // Rectangle : on repousse Charlie vers le côté le plus proche
            var hw = col.hw + CHARLIE_R, hd = col.hd + CHARLIE_R;
            if (Math.abs(dx) < hw && Math.abs(dy) < hd) {
                var px = hw - Math.abs(dx), py = hd - Math.abs(dy);
                if (px < py) c.x = rec.px + (dx < 0 ? -hw : hw);
                else c.y = rec.py + (dy < 0 ? -hd : hd);
            }
        }
    });
}

// Clic pour marcher : Charlie marche pas à pas vers le point (et glisse le long des obstacles)
var _walkTarget = null, _stuck = 0;
function walkToTarget(dt) {
    var s = Game.state, k = s.keysDown;
    if (!_walkTarget) return;
    for (var key in k) { if (k[key]) { _walkTarget = null; return; } }   // le clavier reprend la main
    var c = s.charlie, dx = _walkTarget.x - c.x, dy = _walkTarget.y - c.y, d = Math.hypot(dx, dy);
    var step = Game.CONFIG.PLAYER_SPEED * Game.player.skinBonus().speed * dt * 60;
    if (d <= step) { c.x = _walkTarget.x; c.y = _walkTarget.y; _walkTarget = null; return; }
    var bx = c.x, by = c.y;
    c.x += dx / d * step; c.y += dy / d * step;
    collide();
    // Bloqué contre un obstacle (aucun progrès) : on s'arrête
    if (Math.hypot(c.x - bx, c.y - by) < step * 0.15) { if (++_stuck > 12) { _walkTarget = null; _stuck = 0; } }
    else _stuck = 0;
    if (Game.buildings) Game.buildings.checkProximity();
    if (Game.entities) Game.entities.checkCollect();
}
function scan() {
    tracked.forEach(function(rec) { rec.seen = false; });
    var els = gameWorld.querySelectorAll(':scope > .entity, :scope > div:not([class]), .farm-pen > div:not(.building-label)');
    for (var i = 0; i < els.length; i++) {
        if (els[i].parentElement.classList.contains('farm-pen')) els[i].classList.add('farm-animal');
        syncElement(els[i]);
    }
    tracked.forEach(function(rec, el) { if (!rec.seen) { scene.remove(rec.obj); if (rec.bubbleEl) rec.bubbleEl.remove(); tracked.delete(el); } });
}
function syncMoving(time) {
    tracked.forEach(function(rec, el) {
        if (!rec.moving) return;
        rec.obj.visible = el.style.display !== 'none';
        if (!rec.obj.visible) { if (rec.bubbleEl) rec.bubbleEl.style.display = 'none'; return; }
        var ox = rec.px, oy = rec.py;
        placeRec(el, rec);
        if (rec.obj.userData.sprite) rec.obj.userData.sprite.position.y = Math.abs(Math.sin(time * 6 + rec.px * 0.01)) * 0.12;
        if (rec.obj.userData.legL) animateWalker(rec.obj, ox === undefined ? 0 : rec.px - ox, oy === undefined ? 0 : rec.py - oy, _dtFrame, time);
        // Bulle de dialogue des villageois : une vraie bulle de BD en HTML (texte net et lisible) au-dessus de la tête
        var b = bubbleOf(el);
        if (b !== rec.bubble) {
            rec.bubble = b;
            if (b) {
                if (!rec.bubbleEl) { rec.bubbleEl = document.createElement('div'); rec.bubbleEl.className = 'r3d-bubble'; document.body.appendChild(rec.bubbleEl); }
                rec.bubbleEl.textContent = b;
            } else if (rec.bubbleEl) { rec.bubbleEl.remove(); rec.bubbleEl = null; }
        }
        if (rec.bubbleEl) placeBubble(rec);
    });
}

var _bv = null;
function placeBubble(rec) {
    if (!_bv) _bv = new T.Vector3();
    _bv.copy(rec.obj.position); _bv.y += 3.1;
    _bv.project(camera);
    var off = _bv.z > 1 || Math.abs(_bv.x) > 1.1 || Math.abs(_bv.y) > 1.1 || Game.state.currentView !== 'world';
    rec.bubbleEl.style.display = off ? 'none' : 'block';
    rec.bubbleEl.style.left = ((_bv.x + 1) / 2 * window.innerWidth) + 'px';
    rec.bubbleEl.style.top = ((1 - _bv.y) / 2 * window.innerHeight) + 'px';
}

// Animation de marche commune (Charlie, villageois, fermier)
function animateWalker(obj, dx, dy, dt, time) {
    var ud = obj.userData, moving = Math.hypot(dx, dy) > 0.3;
    if (moving) ud.facing = Math.atan2(dx, dy);
    var turn = ud.facing - obj.rotation.y;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    obj.rotation.y += turn * Math.min(1, dt * 10);
    if (moving) ud.step += dt * 10;
    var sw = moving ? Math.sin(ud.step) * 0.65 : ud.legL.rotation.x * 0.85;
    ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw; ud.armL.rotation.x = -sw * 0.8; ud.armR.rotation.x = sw * 0.8;
    ud.body.position.y = moving ? Math.abs(Math.sin(ud.step)) * 0.07 : 0;
    ud.head.rotation.y = Math.sin(time * 1.1 + obj.id) * 0.15;
    return moving;
}

// ═══════════════════════ Lumière du jour et de la nuit ═══════════════════════
function skyTexture(top, bottom) {
    var c = document.createElement('canvas'); c.width = 2; c.height = 256;
    var g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, top); grd.addColorStop(1, bottom);
    g.fillStyle = grd; g.fillRect(0, 0, 2, 256);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
}
var SKIES, _phase = null;
// Ciel de nuit : dégradé bleu nuit, étoiles et lune
function nightSky() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#0c1540'); grd.addColorStop(1, '#3a4a8c');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
    var R = rand(42);
    for (var i = 0; i < 160; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.4 + R() * 0.6) + ')'; g.fillRect(R() * 512, R() * 200, R() > 0.85 ? 2 : 1, R() > 0.85 ? 2 : 1); }
    var mg = g.createRadialGradient(420, 50, 0, 420, 50, 40); mg.addColorStop(0, 'rgba(255,250,220,0.5)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
    g.fillStyle = mg; g.fillRect(370, 0, 100, 100);
    g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(420, 50, 14, 0, 7); g.fill();
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
}
var houseLights = [], _windowLight = 0, _spriteLight = 1;
var glowMats = [], _glow = 0;   // halos des fenêtres et flaques de lumière (visibles le soir et la nuit)   // lumières des fenêtres (intensité selon l'heure)
function applyPhase() {
    var ph = Game.time.getPhase();
    if (ph === _phase) return;
    _phase = ph;
    var P = {
        day:   { sky: SKIES.day,   fog: '#bfe2f6', hemi: 0.7,  sun: 1.3,  sunC: '#fff0d0', win: 0,   lamp: 0,   spr: 1 },
        dawn:  { sky: SKIES.dawn,  fog: '#f6d2b8', hemi: 0.5,  sun: 0.9,  sunC: '#ffc89a', win: 0.4, lamp: 0.3, spr: 0.8, glow: 0.35 },
        dusk:  { sky: SKIES.dusk,  fog: '#e7a98f', hemi: 0.4,  sun: 0.7,  sunC: '#ff9f6a', win: 0.9, lamp: 0.6, spr: 0.65, glow: 0.6 },
        // Nuit noire : seules les fenêtres des maisons éclairent (Charlie ne porte plus de lumière)
        // Nuit douce : clair de lune bleuté (on voit tout), fenêtres dorées qui brillent
        night: { sky: SKIES.night, fog: '#141c40', hemi: 0.2, sun: 0.3, sunC: '#9db2ff', win: 1.8, lamp: 0.9, spr: 0.42, glow: 1, exp: 0.82 }
    }[ph];
    scene.background = P.sky;
    scene.fog.color.copy(lin(P.fog));
    hemi.intensity = P.hemi;
    hemi.color.copy(lin(ph === 'night' ? '#9fb2ff' : '#cfe9ff'));
    hemi.groundColor.copy(lin(ph === 'night' ? '#1e2a4a' : '#4d6b2f'));
    sun.intensity = P.sun; sun.color.copy(lin(P.sunC));
    renderer.toneMappingExposure = P.exp || 1;
    _glow = P.glow || 0;
    glowMats.forEach(function(m) { m.opacity = _glow * m.userData.base; });
    windowGlass.forEach(function(g) { g.emissiveIntensity = P.win; });
    _windowLight = P.lamp;
    houseLights = houseLights.filter(function(l) { return l.parent && l.parent.parent; });   // maisons encore là
    houseLights.forEach(function(l) { l.intensity = P.lamp; });
    _spriteLight = P.spr;
    spriteMats.forEach(function(m) { m.color.setScalar(P.spr); });
}

// ═══════════════════════ Clics : villageois, papillons, jardin, ou marcher ═══════════════════════
var _rc, _ndc;
function clickableEl(el) {
    while (el && el !== gameWorld) {
        if (el.onclick || el.classList.contains('garden-cell')) return el;
        el = el.parentElement;
    }
    return null;
}
function handleClick3d(e) {
    var s = Game.state;
    if (s.currentView !== 'world' || !renderer) return;
    var rect = renderer.domElement.getBoundingClientRect();
    _ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    _rc.setFromCamera(_ndc, camera);
    // 1) un objet 3D relié à un élément cliquable de la carte 2D ?
    var hits = _rc.intersectObjects(scene.children, true);
    for (var i = 0; i < hits.length; i++) {
        var o = hits[i].object;
        if (o === groundMesh) break;
        var el = o.userData && o.userData.el ? clickableEl(o.userData.el) : null;
        if (el) { el.click(); return; }
    }
    // 2) sinon : le point du sol → Charlie y marche (ou la pelle pose un chemin)
    var g = _rc.intersectObject(groundMesh, false)[0];
    if (!g) return;
    var px = g.point.x / U, py = g.point.z / U;
    if (s.shovelMode && s.tools.shovel) { Game.tools.placePath(px, py); return; }
    _walkTarget = { x: px, y: py };
    _stuck = 0;
}

// ═══════════════════════ Intérieurs en 3D ═══════════════════════
// La pièce 2D (#current-room) reste la logique (meubles, Charlie, sortie par le tapis) mais devient invisible ;
// on la redessine ici comme une maison de poupée vue de biais. Les clics et le glisser des meubles
// sont traduits en coordonnées de la pièce et renvoyés à furniture.js.
var room3d = null;              // { scene, camera, items, charlie, ... }
var RU = 1 / 57;                // 57 px de la pièce = 1 unité (la pièce fait 570 px ≈ 10 unités)
var ROOM_THEMES = {
    bakery:   { floor: '#f3d9a8', wall: '#fff1dc', trim: '#bf8c3e' },
    shop:     { floor: '#cfe8d8', wall: '#e8f6ec', trim: '#3e9e6a' },
    fishShop: { floor: '#bfe3f0', wall: '#e3f3fb', trim: '#2a8bbf' },
    museum:   { floor: '#3a3358', wall: '#4a4170', trim: '#8c7bc4' },
    souvenir: { floor: '#d7f3ee', wall: '#e2f6f2', trim: '#009688' },
    pizzeria: { floor: '#f6e0c4', wall: '#fff0e6', trim: '#c62828' }
};
function roomPx() { var r = document.getElementById('current-room'); return { w: r.clientWidth || 570, h: r.clientHeight || 570 }; }
// Coordonnées de la pièce (px, coin haut-gauche d'un emoji de 48 px) → position 3D (centre au sol)
function roomPos(x, y) { var R = roomPx(); return { x: (x + 24 - R.w / 2) * RU, z: (y + 24 - R.h / 2) * RU }; }

// Meubles en 3D (même liste que furniture.js / Game.RECIPES)
function makeFurniture(type, f) {
    var g = new T.Group(), on = !!f[4];
    switch (type) {
        case 'bed':
            rbox(g, 1.5, 0.45, 2.2, 0.12, '#9a6b48', 0, 0.25, 0);
            rbox(g, 1.35, 0.22, 2.0, 0.1, '#ffffff', 0, 0.55, 0);
            rbox(g, 1.38, 0.18, 1.3, 0.1, '#6fa8dc', 0, 0.62, 0.32);
            rbox(g, 0.9, 0.2, 0.45, 0.1, '#fff4f4', 0, 0.72, -0.72);
            rbox(g, 1.5, 0.9, 0.16, 0.08, '#8a5a3c', 0, 0.55, -1.1);
            break;
        case 'table':
            put(g, new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.12, 28), mat('#b07d4f')), 0, 0.8, 0);
            put(g, new T.Mesh(new T.CylinderGeometry(0.1, 0.16, 0.8, 12), mat('#8a5a3c')), 0, 0.4, 0);
            break;
        case 'chair':
            rbox(g, 0.6, 0.1, 0.6, 0.05, '#c98f5a', 0, 0.48, 0);
            rbox(g, 0.6, 0.6, 0.1, 0.05, '#c98f5a', 0, 0.8, -0.26);
            [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]].forEach(function(p) { rbox(g, 0.08, 0.48, 0.08, 0.03, '#8a5a3c', p[0], 0.24, p[1]); });
            break;
        case 'bookshelf':
            rbox(g, 1.4, 1.9, 0.36, 0.08, '#8a5a3c', 0, 0.95, -0.08);
            ['#e53935', '#43a047', '#1e88e5', '#fdd835', '#8e24aa', '#fb8c00', '#26a69a', '#ec407a'].forEach(function(c, i) {
                rbox(g, 0.15, i % 2 ? 0.38 : 0.44, 0.3, 0.03, c, -0.5 + (i % 4) * 0.33, i < 4 ? 1.5 : 0.8, 0.18);
            });
            [0.55, 1.25].forEach(function(y) { rbox(g, 1.3, 0.06, 0.4, 0.02, '#6e4428', 0, y, 0.12); });
            break;
        case 'lamp':
            put(g, new T.Mesh(new T.CylinderGeometry(0.25, 0.3, 0.08, 20), mat('#5d4037')), 0, 0.04, 0);
            put(g, new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.3, 10), mat('#5d4037')), 0, 0.7, 0);
            var shade = new T.MeshStandardMaterial({ color: lin('#fff3c4'), emissive: lin('#ffcf6a'), emissiveIntensity: on ? 1.2 : 0, roughness: 0.6, side: T.DoubleSide });
            put(g, new T.Mesh(new T.CylinderGeometry(0.22, 0.4, 0.45, 20, 1, true), shade), 0, 1.4, 0);
            if (on) { var l = new T.PointLight(lin('#ffcf80'), 1.8, 9, 1.6); l.position.set(0, 1.3, 0); g.add(l); }
            break;
        case 'plant':
            put(g, new T.Mesh(new T.CylinderGeometry(0.3, 0.22, 0.45, 18), mat('#d9774b')), 0, 0.22, 0);
            [[0, 0.75, 0, 0.32], [0.22, 0.62, 0.1, 0.22], [-0.2, 0.65, -0.05, 0.24]].forEach(function(b) { ball(g, b[3], '#4f9a3c', b[0], b[1], b[2]); });
            if (!f[3] || (Game.state.totalTimePlayed - f[3]) >= 12 * 60 * 1000) [[0.15, 0.95, 0.15], [-0.18, 0.85, 0.12]].forEach(function(p) { ball(g, 0.09, '#ffd54f', p[0], p[1], p[2]); });
            break;
        case 'mirror':
            rbox(g, 0.9, 1.6, 0.12, 0.3, '#c9a24a', 0, 0.9, 0);
            put(g, new T.Mesh(new T.PlaneGeometry(0.72, 1.4), new T.MeshStandardMaterial({ color: lin('#cfe9f7'), metalness: 0.9, roughness: 0.08 })), 0, 0.9, 0.07);
            break;
        case 'stove':
            rbox(g, 1.1, 0.95, 0.75, 0.08, '#e0e0e0', 0, 0.48, 0);
            [[-0.25, -0.12], [0.25, -0.12], [-0.25, 0.18], [0.25, 0.18]].forEach(function(p) { put(g, new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.04, 18), mat('#424242')), p[0], 0.97, p[1]); });
            rbox(g, 0.8, 0.45, 0.04, 0.04, '#616161', 0, 0.42, 0.38);
            break;
        case 'tv':
            rbox(g, 1.3, 0.5, 0.5, 0.08, '#8a5a3c', 0, 0.25, 0);
            rbox(g, 1.2, 0.8, 0.18, 0.1, '#37474f', 0, 0.95, 0);
            var scr = new T.MeshStandardMaterial({ color: lin('#1a2340'), emissive: lin('#7fb4ff'), emissiveIntensity: on ? 1.1 : 0, roughness: 0.3 });
            put(g, new T.Mesh(new T.PlaneGeometry(1.0, 0.62), scr), 0, 0.95, 0.1);
            if (on) { var tl = new T.PointLight(lin('#8fbfff'), 0.8, 5, 2); tl.position.set(0, 1, 0.6); g.add(tl); }
            break;
        case 'piano':
            rbox(g, 1.7, 1.1, 0.7, 0.1, '#2b2b2b', 0, 0.55, 0);
            rbox(g, 1.5, 0.08, 0.3, 0.02, '#ffffff', 0, 0.82, 0.42);
            for (var k = 0; k < 6; k++) rbox(g, 0.08, 0.05, 0.18, 0.01, '#111111', -0.6 + k * 0.24, 0.88, 0.36);
            break;
        case 'bath':
            rbox(g, 1.9, 0.6, 1.05, 0.3, '#ffffff', 0, 0.3, 0);
            put(g, new T.Mesh(new T.PlaneGeometry(1.6, 0.75), new T.MeshStandardMaterial({ color: lin('#8fd3f4'), roughness: 0.1, transparent: true, opacity: 0.85 })), 0, 0.56, 0).rotation.x = -Math.PI / 2;
            break;
        default:
            g.add(emojiSprite(f[0], 0.9));
    }
    return g;
}

function themeFor(s) {
    if (s.activeShop) return ROOM_THEMES[s.activeShop.theme] || ROOM_THEMES.shop;
    var h = s.activeHouse ? HOUSE_STYLES[s.activeHouse.id] || HOUSE_STYLES.charlie : HOUSE_STYLES.charlie;
    return { floor: '#d8b07a', wall: h.wall, trim: h.roof };
}

function buildRoom() {
    var s = Game.state, R = roomPx(), W = R.w * RU, D = R.h * RU, th = themeFor(s);
    var sc = new T.Scene();
    sc.background = lin('#20160f');
    var cam = new T.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    var g = new T.Group(); sc.add(g);
    // Sol en lattes, murs (fond + côtés), plinthe, fenêtres rondes
    rbox(g, W + 0.6, 0.3, D + 0.6, 0.12, th.trim, 0, -0.15, 0);
    rbox(g, W, 0.06, D, 0.04, th.floor, 0, 0.03, 0);
    for (var i = 1; i < 10; i++) rbox(g, 0.03, 0.02, D, 0.01, '#6e4b2a', -W / 2 + i * W / 10, 0.065, 0, { transparent: true, opacity: 0.18 });
    rbox(g, W + 0.6, 3.4, 0.3, 0.1, th.wall, 0, 1.7, -D / 2 - 0.15);
    rbox(g, 0.3, 3.4, D + 0.6, 0.1, th.wall, -W / 2 - 0.15, 1.7, 0);
    rbox(g, 0.3, 3.4, D + 0.6, 0.1, th.wall, W / 2 + 0.15, 1.7, 0);
    rbox(g, W, 0.25, 0.08, 0.03, th.trim, 0, 0.13, -D / 2 + 0.02);
    var glass = new T.MeshStandardMaterial({ color: lin('#a9dcf7'), emissive: lin('#1d2a55'), emissiveIntensity: 0, roughness: 0.15 });
    [-W / 4, W / 4].forEach(function(x) {
        put(g, new T.Mesh(geo('wframe', function() { return new T.TorusGeometry(0.42, 0.07, 10, 28); }), mat('#ffffff')), x, 2.1, -D / 2 + 0.02);
        var gl = new T.Mesh(geo('wglass', function() { return new T.CircleGeometry(0.4, 28); }), glass); gl.position.set(x, 2.1, -D / 2 + 0.01); g.add(gl);
    });
    // Tapis de sortie (étoile) en bas au centre, comme dans la pièce 2D
    var matZ = (R.h / 2 - 40) * RU;
    rbox(g, 1.4, 0.05, 0.7, 0.2, '#ffd54f', 0, 0.07, matZ);
    var star = emojiSprite('🌟', 0.6); star.position.set(0, 0.1, matZ); g.add(star);
    // Enseigne de la boutique sur le mur du fond
    if (s.activeShop) {
        var lab = labelSprite(s.activeShop.sign + ' ' + s.activeShop.name, 0.8); lab.position.set(0, 3.2, -D / 2); g.add(lab);
    }
    var hemi = new T.HemisphereLight(lin('#fff6e8'), lin('#6b5a48'), 0.75); sc.add(hemi);
    var top = new T.PointLight(lin('#fff1d6'), 0.9, 20, 1.5); top.position.set(0, 4.5, 1); top.castShadow = true; top.shadow.mapSize.set(1024, 1024); sc.add(top);
    room3d = { scene: sc, camera: cam, hemi: hemi, top: top, glass: glass, items: new T.Group(), key: '', charlie: makeCharlie(), fx: null, fxText: '', W: W, D: D };
    sc.add(room3d.items);
    sc.add(room3d.charlie);
    room3d.charlie.scale.setScalar(1.05);
    // Caméra : de face, en hauteur, toute la pièce dans le cadre
    cam.position.set(0, 9.2, D / 2 + 7.6);
    cam.lookAt(0, 0.6, 0.4);
    resizeRoom();
}
function resizeRoom() {
    if (!room3d) return;
    room3d.camera.aspect = window.innerWidth / window.innerHeight;
    // Sur téléphone (écran étroit), champ plus large pour que toute la pièce tienne
    room3d.camera.fov = window.innerWidth < window.innerHeight ? 62 : 40;
    room3d.camera.updateProjectionMatrix();
}

// Ce qui doit être dessiné dans la pièce : meubles, décor de boutique, commerçant, lit du villageois, boules à neige
function roomKey() {
    var s = Game.state, parts = [s.activeHouse ? s.activeHouse.id : (s.activeShop ? s.activeShop.id : ''), Game.time.isNight() ? 'n' : 'd'];
    if (s.activeHouse) (s.houseFurniture[s.activeHouse.id] || []).forEach(function(f) { parts.push(f[0] + f[1] + ',' + f[2] + (f[4] ? '*' : '') + ((!f[3] || s.totalTimePlayed - f[3] >= 720000) ? 'r' : '')); });
    var npc = document.getElementById('shop-npc');
    if (npc && npc.style.display !== 'none') parts.push('npc' + npc.textContent);
    parts.push(document.querySelectorAll('#current-room .house-sleeper').length, document.querySelectorAll('#current-room .snow-globe-display').length, document.querySelectorAll('#current-room .shop-decor').length);
    return parts.join('|');
}
function syncRoom() {
    var s = Game.state, key = roomKey();
    if (key === room3d.key) return;
    room3d.key = key;
    var items = room3d.items;
    while (items.children.length) items.remove(items.children[0]);
    var R = roomPx();
    // Meubles (maisons)
    if (s.activeHouse) {
        (s.houseFurniture[s.activeHouse.id] || []).forEach(function(f) {
            var o = makeFurniture(Game.furniture.typeOf(f[0]), f), p = roomPos(f[1], f[2]);
            o.position.set(p.x, 0.06, p.z);
            o.traverse(function(m) { m.userData.f = f; });
            items.add(o);
        });
    }
    // Décor de boutique (non déplaçable) + commerçant derrière son comptoir
    document.querySelectorAll('#current-room .shop-decor').forEach(function(el) {
        var p = roomPos(parseFloat(el.style.left), parseFloat(el.style.top));
        var sp = emojiSprite(el.textContent.trim(), 1.0); sp.position.set(p.x, 0.06, p.z); items.add(sp);
    });
    var npc = document.getElementById('shop-npc');
    if (npc && npc.style.display !== 'none') {
        rbox(items, 3.2, 1.0, 0.8, 0.12, '#a0703f', 0, 0.5, -R.h / 2 * RU + 2.3);
        var ns = emojiSprite(npc.textContent.trim(), 1.5); ns.position.set(0, 0.6, -R.h / 2 * RU + 1.6);
        ns.userData.el = npc; items.add(ns);
    }
    // Lit du villageois (avec le villageois qui dort la nuit)
    var bed = document.querySelector('#current-room .house-bed');
    if (bed) {
        var bp = roomPos(parseFloat(bed.style.left) + 30, parseFloat(bed.style.top) + 40);
        var b = makeFurniture('bed', ['🛏️']); b.position.set(bp.x, 0.06, bp.z); items.add(b);
        var sleeper = bed.querySelector('.sleeper-emoji');
        if (sleeper) {
            var c = makeCritter(sleeper.textContent.trim()); c.rotation.x = -Math.PI / 2; c.position.set(bp.x, 0.75, bp.z + 0.75); items.add(c);
            var z = emojiSprite('💤', 0.6); z.position.set(bp.x + 0.6, 1.4, bp.z - 0.6); items.add(z);
        }
    }
    // Boules à neige sur le mur du fond (chez Charlie)
    document.querySelectorAll('#current-room .snow-globe-display').forEach(function(el) {
        var p = roomPos(parseFloat(el.style.left), parseFloat(el.style.top));
        var sp = emojiSprite(el.textContent.trim(), 0.55); sp.position.set(p.x, 1.6, -R.h / 2 * RU + 0.25); items.add(sp);
    });
    lightRoom();
}
// Lumière de la pièce : chez Charlie, il fait sombre sans lampe allumée (très sombre la nuit)
function lightRoom() {
    var s = Game.state, night = Game.time.isNight();
    var mine = s.activeHouse && s.activeHouse.id === 'charlie';
    var lampOn = mine && (s.houseFurniture.charlie || []).some(function(f) { var t = Game.furniture.typeOf(f[0]); return (t === 'lamp' || t === 'tv') && f[4]; });
    room3d.hemi.intensity = mine ? (night ? (lampOn ? 0.18 : 0.06) : (lampOn ? 0.75 : 0.35)) : (night ? 0.45 : 0.75);
    room3d.top.intensity = mine ? (night ? 0.05 : (lampOn ? 0.9 : 0.35)) : (night ? 0.6 : 0.9);
    room3d.glass.emissiveIntensity = night ? 0.6 : 0;
}

function updateRoomCharlie(dt, time) {
    var s = Game.state, c = room3d.charlie, ic = document.getElementById('interior-charlie');
    var p = roomPos(s.interiorCharlie.x, s.interiorCharlie.y);
    var prev = c.userData.prev || p;
    animateWalker(c, (p.x - prev.x) * 40, (p.z - prev.z) * 40, dt, time);
    c.userData.prev = p;
    var y = 0.06, lie = false;
    if (ic && ic.classList.contains('pose-sleep')) { y = 0.75; lie = true; }
    else if (ic && ic.classList.contains('pose-bath')) y = -0.15;
    else if (ic && ic.classList.contains('pose-sit')) y = 0.2;
    c.rotation.x = lie ? -Math.PI / 2 : 0;
    c.position.set(p.x, y, p.z + (lie ? 0.5 : 0));
    // Ce que Charlie tient ou ressent (📖, 💤, 🎵...) au-dessus de sa tête
    var fx = document.getElementById('charlie-fx'), t = fx && fx.style.display !== 'none' ? fx.textContent : '';
    if (t !== room3d.fxText) {
        if (room3d.fx) room3d.scene.remove(room3d.fx);
        room3d.fx = null; room3d.fxText = t;
        if (t) { room3d.fx = emojiSprite(t, 0.7); room3d.scene.add(room3d.fx); }
    }
    if (room3d.fx) room3d.fx.position.set(p.x + 0.5, 2.2 + Math.sin(time * 4) * 0.08, p.z);
}

// ── Clics et glisser dans la pièce 3D ──
var _drag = null;
function roomPoint(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    _ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    _rc.setFromCamera(_ndc, room3d.camera);
    return _rc;
}
function floorToRoom(rc) {
    var t = -rc.ray.origin.y / rc.ray.direction.y;   // intersection avec le sol (y = 0)
    if (!(t > 0)) return null;
    var x = rc.ray.origin.x + rc.ray.direction.x * t, z = rc.ray.origin.z + rc.ray.direction.z * t, R = roomPx();
    return { x: x / RU + R.w / 2 - 24, y: z / RU + R.h / 2 - 24 };
}
function onRoomDown(e) {
    var s = Game.state;
    if (s.currentView !== 'interior' || !room3d || _cutscene) return;
    var rc = roomPoint(e);
    var hits = rc.intersectObjects(room3d.items.children, true);
    for (var i = 0; i < hits.length; i++) {
        var o = hits[i].object;
        if (o.userData.f) { _drag = { f: o.userData.f, x: e.clientX, y: e.clientY, moved: false }; e.preventDefault(); return; }
        if (o.userData.el) { o.userData.el.click(); return; }
    }
    var p = floorToRoom(rc);
    if (p) Game.furniture.floorClick(p.x, p.y);
}
function onRoomMove(e) {
    if (!_drag || !room3d) return;
    if (!_drag.moved && Math.hypot(e.clientX - _drag.x, e.clientY - _drag.y) < 6) return;
    if (Game.furniture.isBusy()) return;
    _drag.moved = true;
    var p = floorToRoom(roomPoint(e)), R = roomPx();
    if (!p) return;
    var f = _drag.f;
    f[1] = Math.max(0, Math.min(R.w - 50, Math.round(p.x / 20) * 20));
    f[2] = Math.max(0, Math.min(R.h - 50, Math.round(p.y / 20) * 20));
    var el = Game.furniture.elFor(f);
    if (el) { el.style.left = f[1] + 'px'; el.style.top = f[2] + 'px'; }
}
function onRoomUp() {
    if (!_drag) return;
    var d = _drag; _drag = null;
    if (d.moved) { Game.audio.play('craft'); return; }
    Game.furniture.interact(d.f, Game.furniture.elFor(d.f));
}

// ═══════════════════════ Entrer / sortir comme dans Animal Crossing ═══════════════════════
// Charlie se tourne vers la porte, la tire pour l'ouvrir, entre ; l'écran se ferme en cercle sur lui,
// puis s'ouvre en cercle dans la pièce. En sortant : il sort, et la porte se referme derrière lui.
var _cutscene = false, _exitHold = false, _lastBuildingId = null;
var _camFocus = null;   // pendant les animations de porte : la caméra se rapproche de la porte
function iris(closing, cx, cy, ms) {
    return new Promise(function(resolve) {
        var el = document.getElementById('r3d-iris');
        if (!el) { el = document.createElement('div'); el.id = 'r3d-iris'; document.body.appendChild(el); }
        var big = Math.hypot(window.innerWidth, window.innerHeight) * 1.1, t0 = performance.now();
        el.style.display = 'block';
        (function step(now) {
            var k = Math.min(1, (now - t0) / ms), e = k * k * (3 - 2 * k);
            var r = closing ? big * (1 - e) : big * e;
            el.style.left = cx + 'px'; el.style.top = cy + 'px';
            el.style.width = el.style.height = (2 * r) + 'px';
            if (k < 1) requestAnimationFrame(step);
            else { if (!closing) el.style.display = 'none'; resolve(); }
        })(t0);
    });
}
function screenOf(v3) {
    var v = v3.clone().project(camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
}
function doorRecFor(id) {
    var found = null;
    tracked.forEach(function(rec, el) { if (el.id === id) found = rec; });
    return found;
}
function tween(ms, fn) {
    return new Promise(function(resolve) {
        var t0 = performance.now();
        (function step(now) {
            var k = Math.min(1, (now - t0) / ms);
            fn(k * k * (3 - 2 * k));
            if (k < 1) requestAnimationFrame(step); else resolve();
        })(t0);
    });
}
function setGhosts(v) { charlie.traverse(function(o) { if (o.isMesh && o.material && o.material.depthFunc === T.GreaterDepth) o.visible = v; }); }
function walkLegs(ud) { ud.step += 0.25; var sw = Math.sin(ud.step) * 0.6; ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw; }
// Animation d'entrée devant la porte du bâtiment (élément 2D elId)
function enterAnimation(elId) {
    var rec = doorRecFor(elId), s = Game.state;
    var door = rec && rec.obj.userData.door;
    if (!door) return Promise.resolve();
    _cutscene = true; _exitHold = true; s.paused = true; setGhosts(false);
    var ud = charlie.userData, front = new T.Vector3(); door.getWorldPosition(front);
    _camFocus = { x: front.x + 0.45, z: front.z + 0.4, zoom: 0.38 };   // la caméra se rapproche de la porte
    var x0 = charlie.position.x, z0 = charlie.position.z, sx = front.x + 0.45, sz = front.z + 0.85;
    var r0 = charlie.rotation.y, r1 = Math.PI * (r0 >= 0 ? 1 : -1);
    return tween(650, function(k) {                       // se place devant la porte et se tourne vers elle
        charlie.position.x = x0 + (sx - x0) * k;
        charlie.position.z = z0 + (sz - z0) * k;
        charlie.rotation.y = r0 + (r1 - r0) * k;
        walkLegs(ud);
    }).then(function() {
        ud.facing = charlie.rotation.y;
        ud.legL.rotation.x = ud.legR.rotation.x = 0;
        return tween(260, function(k) { ud.armR.rotation.x = -1.3 * k; });   // tend le bras vers la poignée
    }).then(function() {
        Game.audio.play('craft');
        return tween(750, function(k) {                   // tire la porte vers lui (en reculant un peu)
            door.rotation.y = -1.9 * k;
            ud.body.position.z = -0.18 * Math.sin(k * Math.PI);
        });
    }).then(function() {
        ud.armR.rotation.x = 0;
        var zz = charlie.position.z;
        return tween(800, function(k) { charlie.position.z = zz - 1.4 * k; walkLegs(ud); });   // entre
    }).then(function() {
        ud.legL.rotation.x = ud.legR.rotation.x = 0;
        charlie.visible = false;                          // il est à l'intérieur
        var p = screenOf(new T.Vector3(front.x + 0.45, 1.2, front.z));
        Game.audio.play('craft');
        var closing = tween(520, function(k) { door.rotation.y = -1.9 * (1 - k); });   // la porte se referme
        return Promise.all([closing, iris(true, p.x, p.y, 950)]);
    }).then(function() {
        door.rotation.y = 0;
        ud.body.position.z = 0;
        charlie.visible = true;
    });
}
function afterEnter() {
    Game.state.paused = false; _exitHold = false; setGhosts(true); _camFocus = null;
    room3d = null;
    buildRoom();
    syncRoom();
    iris(false, window.innerWidth / 2, window.innerHeight * 0.55, 650).then(function() { _cutscene = false; });
}
// Animation de sortie : Charlie apparaît dans l'embrasure, sort, et la porte se referme derrière lui
function exitAnimation(elId) {
    var rec = doorRecFor(elId), s = Game.state;
    var door = rec && rec.obj.userData.door;
    if (!door) { _cutscene = false; return iris(false, window.innerWidth / 2, window.innerHeight / 2, 500); }
    s.paused = true; _exitHold = true; setGhosts(false);
    var ud = charlie.userData, front = new T.Vector3(); door.getWorldPosition(front);
    var ex = s.charlie.x * U, ez = s.charlie.y * U;
    s.charlie.visualX = s.charlie.x; s.charlie.visualY = s.charlie.y;
    _camFocus = { x: front.x + 0.45, z: front.z + 0.4, zoom: 0.38, snap: true };
    door.rotation.y = -1.9;
    charlie.position.set(front.x + 0.45, charlie.position.y, front.z - 0.5);
    charlie.rotation.y = 0; ud.facing = 0;
    var p = screenOf(new T.Vector3(front.x + 0.45, 1.2, front.z));
    return iris(false, window.innerWidth / 2, window.innerHeight / 2, 700).then(function() {
        return tween(900, function(k) {                   // sort
            charlie.position.x = front.x + 0.45 + (ex - front.x - 0.45) * k;
            charlie.position.z = front.z - 0.5 + (ez - front.z + 0.5) * k;
            walkLegs(ud);
        });
    }).then(function() {
        ud.legL.rotation.x = ud.legR.rotation.x = 0;
        charlie.rotation.y = Math.PI; ud.facing = Math.PI;   // se retourne pour refermer
        return tween(250, function(k) { ud.armR.rotation.x = -1.3 * k; });
    }).then(function() {
        Game.audio.play('craft');
        return tween(550, function(k) { door.rotation.y = -1.9 * (1 - k); });   // pousse la porte, elle se referme
    }).then(function() {
        ud.armR.rotation.x = 0;
        charlie.rotation.y = 0; ud.facing = 0;
        _camFocus = null;                                 // la caméra reprend sa place
        _exitHold = false; s.paused = false; setGhosts(true); _cutscene = false;
    });
}
function roomCharlieScreen() {
    if (!room3d) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var v = room3d.charlie.position.clone(); v.y += 1.2; v.project(room3d.camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
}
function wrapBuildings() {
    var B = Game.buildings, origHouse = B.enterHouse, origShop = B.enterShop, origExit = B.exitHouse;
    B.enterHouse = function(house) {
        var self = this, args = arguments;
        if (_cutscene) return;
        if (Game.state.currentView !== 'world') return origHouse.apply(self, args);
        _lastBuildingId = house.id === 'charlie' ? 'house-site' : 'house-' + house.id;
        enterAnimation(_lastBuildingId).then(function() { origHouse.apply(self, args); afterEnter(); });
    };
    B.enterShop = function(shopId) {
        var self = this, args = arguments, shop = (Game.SHOPS || []).find(function(sh) { return sh.id === shopId; });
        if (_cutscene) return;
        if (Game.state.currentView !== 'world' || !shop || (shop.nightOnly && !Game.time.isNight())) return origShop.apply(self, args);
        _lastBuildingId = shop.loc + '-anchor';
        enterAnimation(_lastBuildingId).then(function() { origShop.apply(self, args); afterEnter(); });
    };
    B.exitHouse = function() {
        var self = this, args = arguments;
        if (_cutscene) return;   // la sortie est déjà en cours (le tapis la redemande à chaque image)
        if (Game.state.currentView !== 'interior') return origExit.apply(self, args);
        _cutscene = true;
        var p = roomCharlieScreen();
        iris(true, p.x, p.y, 600).then(function() {
            origExit.apply(self, args);
            room3d = null;
            return exitAnimation(_lastBuildingId);
        });
    };
}

// ═══════════════════════ Démarrage et boucle ═══════════════════════
function init() {
    if (started) return;
    started = true;
    T = window.THREE;
    gameWorld = document.getElementById('game-world');
    var viewport = document.getElementById('viewport');
    var canvas = document.createElement('canvas');
    canvas.id = 'r3d-canvas';
    viewport.insertBefore(canvas, viewport.firstChild);

    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(LOW ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = !LOW;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    scene = new T.Scene();
    SKIES = {
        day: skyTexture('#5fb3ee', '#d3eefc'), dawn: skyTexture('#8fb4e8', '#ffd9bf'),
        dusk: skyTexture('#5a64b0', '#ffae86'), night: nightSky()
    };
    scene.fog = new T.Fog(lin('#bfe2f6'), 48, 105);
    camera = new T.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);

    hemi = new T.HemisphereLight(lin('#cfe9ff'), lin('#4d6b2f'), 0.7); scene.add(hemi);
    sun = new T.DirectionalLight(lin('#fff0d0'), 1.3); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    var sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 90;
    scene.add(sun); scene.add(sun.target);

    _ray = new T.Raycaster(); _down = new T.Vector3(0, -1, 0); _from = new T.Vector3();
    _rc = new T.Raycaster(); _ndc = new T.Vector2();

    buildTerrain();
    charlie = makeCharlie(); scene.add(charlie);
    addGhost(charlie);
    scan();
    applyPhase();

    Game.player.handleClick = handleClick3d;
    Game.player.afterMove = function() { if (!_cutscene) collide(); };
    wrapBuildings();
    // Petit état lisible pour les tests automatiques (animation de porte en cours, ouverture de la porte)
    Game.r3d.debug = function() {
        var rec = _lastBuildingId ? doorRecFor(_lastBuildingId) : null, d = rec && rec.obj.userData.door;
        return { cutscene: _cutscene, door: d ? d.rotation.y : null, room: !!room3d, iris: (document.getElementById('r3d-iris') || {}).style ? document.getElementById('r3d-iris').style.width : '' };
    };
    // Position à l'écran d'un meuble de la pièce 3D (tests automatiques)
    Game.r3d.furnitureScreen = function(f) {
        if (!room3d) return null;
        var p = roomPos(f[1], f[2]), v = new T.Vector3(p.x, 0.5, p.z).project(room3d.camera);
        return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
    };
    canvas.addEventListener('pointerdown', onRoomDown);
    window.addEventListener('pointermove', onRoomMove);
    window.addEventListener('pointerup', onRoomUp);
    window.addEventListener('resize', resize); resize();
    camera.position.set(Game.state.charlie.visualX * U, CAM_H, Game.state.charlie.visualY * U + CAM_D);
    _fpsEl = document.createElement('div');
    _fpsEl.id = 'r3d-fps';
    if (!SHOW_FPS) _fpsEl.style.display = 'none';
    document.body.appendChild(_fpsEl);
    // Les petites images qui sautent (🍎 +1...) : placées depuis la caméra 3D
    Game.particles.spawnWorld = function(emoji, worldX, worldY, opts) {
        var v = new T.Vector3(worldX * U, heightAt(worldX, worldY) + 1.2, worldY * U).project(camera);
        Game.particles.spawn(emoji, (v.x + 1) / 2 * window.innerWidth, (1 - v.y) / 2 * window.innerHeight, opts);
    };
    Game.r3d.renderer = renderer;
    requestAnimationFrame(loop);
}
function resize() {
    resizeRoom();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

// Si l'ordinateur rame (moins de 20 images/s pendant 10 s), on propose la vue 2D
var _slowSamples = [], _slowShown = false;
function watchSlow(fps) {
    if (_slowShown) return;
    _slowSamples.push(fps);
    if (_slowSamples.length < 20) return;
    var avg = _slowSamples.slice(-20).reduce(function(a, b) { return a + b; }, 0) / 20;
    if (avg >= 20) { _slowSamples = _slowSamples.slice(-20); return; }
    _slowShown = true;
    var box = document.createElement('div');
    box.id = 'r3d-slow';
    box.innerHTML = '🐢 Le jeu rame un peu sur cet ordinateur. <a href="#" id="r3d-low">Qualité réduite (plus fluide)</a> <button type="button" aria-label="Fermer">✕</button>';
    box.querySelector('button').onclick = function() { box.remove(); };
    box.querySelector('#r3d-low').onclick = function(e) {
        e.preventDefault();
        try { localStorage.setItem('village3d_low', '1'); } catch (err) {}
        setLowQuality();
        box.remove();
    };
    document.body.appendChild(box);
}
// Qualité réduite : pas d'ombres, moins de pixels (gardé pour les prochaines parties)
function setLowQuality() {
    LOW = true;
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
    scene.traverse(function(o) { if (o.material) o.material.needsUpdate = true; });
    resize();
}
var CAM_H = 16, CAM_D = 18;   // vue plus haute et plus éloignée : Charlie reste visible derrière les maisons   // caméra : hauteur et recul derrière Charlie
var _last = 0, _prev = null, _camTarget = null, _look = null;
var _fpsEl = null, _frames = 0, _fpsT = 0;
function loop(now) {
    requestAnimationFrame(loop);
    var dt = _last ? Math.min(0.1, (now - _last) / 1000) : 0.016;
    _last = now;
    var s = Game.state;
    var time = now / 1000;
    // Dans une maison ou une boutique : on dessine la pièce en 3D
    if (s.currentView === 'interior') {
        if (!room3d) { buildRoom(); syncRoom(); }
        _scanT += dt;
        if (_scanT > 0.25) { _scanT = 0; syncRoom(); lightRoom(); }
        updateRoomCharlie(dt, time);
        renderer.render(room3d.scene, room3d.camera);
        return;
    }
    if (s.currentView !== 'world') return;

    _dtFrame = dt;
    if (!_cutscene) { walkToTarget(dt); collide(); }
    // La rivière coule vers la mer (vers le bas de la carte), la mer ondule
    if (riverTex) { riverTex.offset.y -= dt * 0.35; riverTex.offset.x = Math.sin(time * 0.6) * 0.04; }
    if (seaTex) { seaTex.offset.x += dt * 0.03; seaTex.offset.y = Math.sin(time * 0.5) * 0.08; }
    if (lakeTex) { lakeTex.offset.x = Math.sin(time * 0.4) * 0.06; lakeTex.offset.y = Math.cos(time * 0.3) * 0.06; }   // un lac ondule sans couler
    _scanT += dt;
    if (_scanT > 0.4) { _scanT = 0; scan(); applyPhase(); }
    syncMoving(time);

    // Charlie suit sa position (lissée) du jeu 2D
    var cx = s.charlie.visualX, cy = s.charlie.visualY;
    var gy = heightAt(cx, cy);
    if (!_exitHold) {   // pendant l'animation de porte, c'est elle qui place Charlie
        animateWalker(charlie, _prev ? cx - _prev.x : 0, _prev ? cy - _prev.y : 0, dt, time);
        charlie.position.set(cx * U, gy, cy * U);
    }
    _prev = { x: cx, y: cy };

    // Caméra de biais qui suit Charlie ; le soleil (et ses ombres) suit aussi
    if (!_camTarget) { _camTarget = new T.Vector3(); _look = new T.Vector3(); }
    if (_camFocus) {
        // Gros plan sur la porte (animation d'entrée / sortie)
        var z = _camFocus.zoom;
        _camTarget.set(_camFocus.x, gy + CAM_H * z, _camFocus.z + CAM_D * z);
        if (_camFocus.snap) { camera.position.copy(_camTarget); _camFocus.snap = false; }
        else camera.position.lerp(_camTarget, Math.min(1, dt * 3));
        _look.set(camera.position.x, camera.position.y - CAM_H * z + 1.1, camera.position.z - CAM_D * z);
    } else {
        _camTarget.set(cx * U, gy + CAM_H, cy * U + CAM_D);
        camera.position.lerp(_camTarget, Math.min(1, dt * 4));
        _look.set(camera.position.x, camera.position.y - CAM_H + 1, camera.position.z - CAM_D);
    }
    camera.lookAt(_look);
    sun.position.set(cx * U - 12, 20, cy * U + 10);
    sun.target.position.set(cx * U, 0, cy * U);

    renderer.render(scene, camera);

    // Compteur d'images par seconde (pour vérifier que l'ordinateur suit)
    _frames++; _fpsT += dt;
    if (_fpsT >= 0.5) {
        var fps = Math.round(_frames / _fpsT);
        _fpsEl.textContent = fps + ' img/s';
        _frames = 0; _fpsT = 0;
        watchSlow(fps);
    }
}

})();
