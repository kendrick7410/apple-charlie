// ── render3d.js ── Vue 3D « diorama doux » (Three.js) — activée seulement avec ?3d dans l'adresse ──
// Le jeu continue de tourner sur la carte 2D (#game-world), qui devient invisible :
// toute la logique (ramasser, quêtes, chantiers, sauvegardes) reste identique.
// Cette vue relit la carte 2D et la redessine en 3D :
//   - modèles ronds pour Charlie, maisons, boutiques, chantiers, arbres, cailloux, fleurs, montagnes, fontaine, jardin ;
//   - « images debout » (emoji) pour le reste en attendant leurs modèles (villageois, animaux, décor de plage...).
// Les clics sur la 3D sont renvoyés aux éléments de la carte 2D (villageois, papillons, jardin) ou font marcher Charlie.
(function(){
"use strict";

var ACTIVE = /[?&]3d\b/.test(location.search);
Game.r3d = { active: ACTIVE };
if (!ACTIVE) return;
document.documentElement.classList.add('mode-3d');

var U = 1 / 40;                 // 40 px de la carte 2D = 1 unité 3D
var T = null;                   // THREE, une fois chargé
var renderer, scene, camera, sun, hemi, charlieLight, groundMesh;
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
    var orig = Game.startGame;
    Game.startGame = function() {
        orig.apply(this, arguments);
        loadThree().then(function() {
            var fonts = document.fonts && document.fonts.load ? document.fonts.load('64px "Noto Color Emoji"', '🌳') : Promise.resolve();
            return Promise.race([fonts, new Promise(function(r) { setTimeout(r, 2500); })]);
        }).then(init).catch(function(err) {
            console.warn('3D indisponible', err);
            document.documentElement.classList.remove('mode-3d');
        });
    };
});

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
function emojiSprite(e, size) {
    var s = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture(e), transparent: true, alphaTest: 0.35 }));
    s.center.set(0.5, 0.08);
    s.scale.set(size, size, 1);
    return s;
}
// Étiquette de taille fixe à l'écran (sinon énorme quand elle est près de la caméra)
function labelSprite(text, h) {
    var tex = labelTexture(text);
    var s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false }));
    s.center.set(0.5, 0);
    h = 0.036 * h / 0.55;
    s.scale.set(h * tex.userData.aspect, h, 1);
    s.renderOrder = 10;
    return s;
}
function rand(seed) { return function() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// ═══════════════════════ Modèles ronds ═══════════════════════
// Charlie, style « chibi » (même dessin que l'aperçu choisi)
var charlie = null;
function makeCharlie() {
    var root = new T.Group(), body = new T.Group(); root.add(body);
    var SKIN = mat('#f2c39a', { roughness: 0.6 }), SHIRT = mat('#ee7a2a'), JEANS = mat('#4466b0'), BOOT = mat('#6b4224', { roughness: 0.5 });
    var HAT = mat('#b57a3e', { roughness: 0.7, side: T.DoubleSide }), BAND = mat('#5b3a1a');
    function limb(r, len, m, x, y) {
        var piv = new T.Group(); piv.position.set(x, y, 0); body.add(piv);
        put(piv, new T.Mesh(capsuleGeo(r, len), m), 0, -len / 2 - r * 0.4, 0);
        return piv;
    }
    var legL = limb(0.12, 0.3, JEANS, -0.15, 0.62), legR = limb(0.12, 0.3, JEANS, 0.15, 0.62);
    ball(legL, 0.15, BOOT, 0, -0.52, 0.06, 1, 0.75, 1.35);
    ball(legR, 0.15, BOOT, 0, -0.52, 0.06, 1, 0.75, 1.35);
    put(body, new T.Mesh(capsuleGeo(0.31, 0.22), SHIRT), 0, 0.95, 0);
    put(body, new T.Mesh(new T.TorusGeometry(0.3, 0.05, 10, 28), mat('#5b3a1a')), 0, 0.78, 0).rotation.x = Math.PI / 2;
    ball(body, 0.06, mat('#f2c94c', { metalness: 0.7, roughness: 0.3 }), 0, 0.78, 0.33);
    put(body, new T.Mesh(new T.ConeGeometry(0.2, 0.26, 20), mat('#d63a3a')), 0, 1.2, 0.2).rotation.x = Math.PI + 0.35;
    var armL = limb(0.09, 0.3, SHIRT, -0.4, 1.18), armR = limb(0.09, 0.3, SHIRT, 0.4, 1.18);
    armL.rotation.z = 0.25; armR.rotation.z = -0.25;
    ball(armL, 0.1, SKIN, 0, -0.48, 0); ball(armR, 0.1, SKIN, 0, -0.48, 0);
    var head = new T.Group(); head.position.set(0, 1.68, 0); body.add(head);
    ball(head, 0.46, SKIN, 0, 0, 0);
    ball(head, 0.47, mat('#7a4a28'), 0, 0.16, -0.06, 1, 0.55, 1);
    [-0.16, 0.16].forEach(function(x) {
        ball(head, 0.07, mat('#2a1d14', { roughness: 0.3 }), x, 0.02, 0.41, 0.85, 1.25, 0.6);
        ball(head, 0.024, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 }), x + 0.025, 0.07, 0.455);
        ball(head, 0.07, mat('#ff9aa2', { roughness: 0.9, transparent: true, opacity: 0.75 }), x * 1.55, -0.12, 0.37, 1, 0.6, 0.3);
    });
    ball(head, 0.05, SKIN, 0, -0.06, 0.46);
    var smile = new T.Mesh(new T.TorusGeometry(0.075, 0.016, 8, 16, Math.PI), mat('#8a3b2e')); smile.rotation.z = Math.PI;
    put(head, smile, 0, -0.17, 0.425);
    // Chapeau de cowboy posé sur la tête, penché vers l'arrière (version validée)
    var hat = new T.Group(); hat.position.set(0, 0.22, -0.02); hat.rotation.x = -0.2; head.add(hat);
    var brimPts = [];
    for (var i = 0; i <= 14; i++) { var u = i / 14; brimPts.push(new T.Vector2(0.4 + u * 0.36, Math.pow(u, 2.6) * 0.15)); }
    put(hat, new T.Mesh(new T.LatheGeometry(brimPts, 40), HAT), 0, 0, 0).scale.set(1, 1, 0.9);
    var crownPts = [new T.Vector2(0.001, 0.4), new T.Vector2(0.2, 0.39), new T.Vector2(0.33, 0.33), new T.Vector2(0.4, 0.17), new T.Vector2(0.42, 0.02), new T.Vector2(0.41, -0.02)];
    put(hat, new T.Mesh(new T.LatheGeometry(crownPts, 32), HAT), 0, 0, 0).scale.set(1, 1, 0.9);
    put(hat, new T.Mesh(new T.CylinderGeometry(0.425, 0.43, 0.08, 32), BAND), 0, 0.07, 0).scale.set(1, 1, 0.9);
    root.scale.setScalar(0.85);
    root.userData = { body: body, head: head, legL: legL, legR: legR, armL: armL, armR: armR, step: 0, facing: 0 };
    return root;
}

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
    put(g, new T.Mesh(doorGeo, mat('#8a5a3c')), 0, 0.35, 1.66);
    ball(g, 0.06, mat('#f2c94c', { metalness: 0.6, roughness: 0.3 }), 0.28, 1.0, 1.82);
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
    var g = makeHouse(st, 0.95);
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
    g.scale.setScalar(0.8);
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
function makeMountain(h) {
    var g = new T.Group(), pts = [], i, u;
    for (i = 0; i <= 16; i++) { u = i / 16; pts.push(new T.Vector2(Math.max(0.001, (1 - Math.pow(u, 1.35)) * h * 0.75), u * h)); }
    put(g, new T.Mesh(new T.LatheGeometry(pts, 32), mat('#8d8f99', { roughness: 0.9 })), 0, 0, 0);
    var cap = [];
    for (i = 0; i <= 10; i++) { u = 0.62 + (i / 10) * 0.38; cap.push(new T.Vector2(Math.max(0.001, (1 - Math.pow(u, 1.35)) * h * 0.75 + 0.06), h * u)); }
    put(g, new T.Mesh(new T.LatheGeometry(cap, 32), mat('#f4f8fc', { roughness: 0.7 })), 0, 0.02, 0);
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
    var g = new T.Group(), i;
    for (i = 0; i < 6; i++) ball(g, 0.2 - i * 0.012, '#b08356', Math.sin(i * 0.4) * 0.05 * i, 0.25 + i * 0.42, 0, 1, 1.3, 1);
    var top = 2.6;
    for (i = 0; i < 6; i++) {
        var leaf = ball(g, 0.75, '#46a346', Math.cos(i / 6 * Math.PI * 2) * 0.6, top, Math.sin(i / 6 * Math.PI * 2) * 0.6, 1, 0.12, 0.35);
        leaf.rotation.y = -i / 6 * Math.PI * 2; leaf.rotation.z = -0.35;
    }
    ball(g, 0.14, '#7a5230', 0.15, top - 0.15, 0.1); ball(g, 0.14, '#7a5230', -0.12, top - 0.18, -0.05);
    g.scale.setScalar(s);
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
    var seg = 160;
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
        pos.setY(i, h);
        cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    groundMesh = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Mer
    var sea = new T.Mesh(new T.PlaneGeometry(W * U, (H - C.SEA_TOP + 400) * U), new T.MeshStandardMaterial({ color: lin('#3fa6dc'), roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(W * U / 2, -0.12, (C.SEA_TOP - 400 + (H - C.SEA_TOP + 400) / 2) * U);
    scene.add(sea);

    // Rivière, lacs : formes d'eau plates (ellipses fusionnées en un seul objet)
    var WATER = new T.MeshStandardMaterial({ color: lin('#4fb3e4'), roughness: 0.1, metalness: 0.1 });
    var verts = [];
    function ellipse(r, y) {
        var cx = (r.x + r.w / 2) * U, cz = (r.y + r.h / 2) * U, rx = r.w / 2 * U, rz = r.h / 2 * U, n = 20;
        for (var k = 0; k < n; k++) {
            var a1 = k / n * Math.PI * 2, a2 = (k + 1) / n * Math.PI * 2;
            verts.push(cx, y, cz, cx + Math.cos(a2) * rx, y, cz + Math.sin(a2) * rz, cx + Math.cos(a1) * rx, y, cz + Math.sin(a1) * rz);
        }
    }
    Game.buildRiverSegments().forEach(function(s) { ellipse({ x: s.x, y: s.y, w: s.w, h: s.h }, 0.04); });
    Array.prototype.forEach.call(world.querySelectorAll('.lake-water'), function(el) { ellipse(rectOf(el), 0.05); });
    var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(verts, 3)); wg.computeVertexNormals();
    var waterMesh = new T.Mesh(wg, WATER); waterMesh.receiveShadow = true; scene.add(waterMesh);

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
var MOVING = /villager-sprite|creature|sea-creature|mtn-animal|farmer-sprite|wasp/;

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
        case 'house': obj = makeHouse(HOUSE_STYLES[houseIdOf(el)] || HOUSE_STYLES.charlie, 0.8); break;
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
        case 'mountain': obj = makeMountain(Math.max(4, size * 1.4)); break;
        case 'palm': obj = makePalm(Math.max(0.8, size / 1.2)); break;
        default: {
            obj = new T.Group();
            var sp = emojiSprite(e || '❔', Math.max(0.8, size * 1.25)); obj.add(sp);
            obj.userData.sprite = sp;
        }
    }
    if (label && kind !== 'flower') {
        var top = { house: 4.6, shop: 5.6, construction: 3, plot: 2.2, fountain: 2.6, garden: 1.2, mountain: Math.max(4, size * 1.4) + 0.5 }[kind] || (kind === 'sprite' ? size * 1.3 : 3.5);
        var lab = labelSprite(label, 0.55); lab.position.y = top; obj.add(lab);
    }
    obj.traverse(function(o) { o.userData.el = o.userData.el || el; });
    return obj;
}

// Point au sol d'un élément 2D : bas-centre de son dessin (hors étiquette)
function groundPoint(el, kind) {
    var x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
    var first = el.firstElementChild && !el.firstElementChild.classList.contains('building-label') ? el.firstElementChild : null;
    var w = el.offsetWidth, h = first ? first.offsetHeight : el.offsetHeight;
    if (kind === 'garden' || kind === 'fountain') return { x: x + w / 2, y: y + el.offsetHeight / 2 };
    if (el.classList.contains('house-exterior') || /-anchor$/.test(el.id)) return { x: x + w / 2, y: y + h * 0.75 };
    return { x: x + w / 2, y: y + h * 0.9 };
}
var _ray, _down, _from;
function heightAt(px, py) {
    if (!groundMesh) return 0;
    _from.set(px * U, 50, py * U);
    _ray.set(_from, _down);
    var hit = _ray.intersectObject(groundMesh, false)[0];
    return hit ? Math.max(hit.point.y, -0.1) : 0;
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
    rec.obj.visible = el.style.display !== 'none';
    if (!rec.moving) placeRec(el, rec);
    if (kind === 'garden') syncGarden(el, rec.obj);
}
function placeRec(el, rec) {
    var p = groundPoint(el, rec.kind);
    if (rec.px === p.x && rec.py === p.y) return;
    rec.px = p.x; rec.py = p.y;
    rec.obj.position.set(p.x * U, rec.kind === 'mountain' ? heightAt(p.x, p.y) - 0.5 : heightAt(p.x, p.y), p.y * U);
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
var _scanT = 0;
function scan() {
    tracked.forEach(function(rec) { rec.seen = false; });
    var els = gameWorld.querySelectorAll(':scope > .entity');
    for (var i = 0; i < els.length; i++) syncElement(els[i]);
    tracked.forEach(function(rec, el) { if (!rec.seen) { scene.remove(rec.obj); tracked.delete(el); } });
}
function syncMoving(time) {
    tracked.forEach(function(rec, el) {
        if (!rec.moving) return;
        rec.obj.visible = el.style.display !== 'none';
        if (!rec.obj.visible) return;
        placeRec(el, rec);
        if (rec.obj.userData.sprite) rec.obj.userData.sprite.position.y = Math.abs(Math.sin(time * 6 + rec.px * 0.01)) * 0.12;
        // Bulle de dialogue des villageois
        var b = bubbleOf(el);
        if (b !== rec.bubble) {
            if (rec.bubbleSprite) rec.obj.remove(rec.bubbleSprite);
            rec.bubbleSprite = null; rec.bubble = b;
            if (b) { rec.bubbleSprite = labelSprite('💬 ' + b, 0.5); rec.bubbleSprite.position.y = 2.2; rec.obj.add(rec.bubbleSprite); }
        }
    });
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
function applyPhase() {
    var ph = Game.time.getPhase();
    if (ph === _phase) return;
    _phase = ph;
    var P = {
        day:   { sky: SKIES.day,   fog: '#bfe2f6', hemi: 0.7,  sun: 1.3, sunC: '#fff0d0', win: 0,   lamp: 0 },
        dawn:  { sky: SKIES.dawn,  fog: '#f6d2b8', hemi: 0.5,  sun: 0.9, sunC: '#ffc89a', win: 0.4, lamp: 0 },
        dusk:  { sky: SKIES.dusk,  fog: '#e7a98f', hemi: 0.45, sun: 0.8, sunC: '#ff9f6a', win: 0.8, lamp: 0.6 },
        night: { sky: SKIES.night, fog: '#1d2550', hemi: 0.1,  sun: 0.1, sunC: '#8fa6ff', win: 1.3, lamp: 1.6 }
    }[ph];
    scene.background = P.sky;
    scene.fog.color.copy(lin(P.fog));
    hemi.intensity = P.hemi;
    sun.intensity = P.sun; sun.color.copy(lin(P.sunC));
    windowGlass.forEach(function(g) { g.emissiveIntensity = P.win; });
    charlieLight.intensity = P.lamp;
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
    s.charlie.x = px;
    s.charlie.y = py;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    scene = new T.Scene();
    SKIES = {
        day: skyTexture('#5fb3ee', '#d3eefc'), dawn: skyTexture('#8fb4e8', '#ffd9bf'),
        dusk: skyTexture('#5a64b0', '#ffae86'), night: skyTexture('#070c26', '#25305e')
    };
    scene.fog = new T.Fog(lin('#bfe2f6'), 38, 85);
    camera = new T.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);

    hemi = new T.HemisphereLight(lin('#cfe9ff'), lin('#4d6b2f'), 0.7); scene.add(hemi);
    sun = new T.DirectionalLight(lin('#fff0d0'), 1.3); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    var sc = sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 80;
    scene.add(sun); scene.add(sun.target);
    charlieLight = new T.PointLight(lin('#ffd08a'), 0, 9, 1.6); scene.add(charlieLight);

    _ray = new T.Raycaster(); _down = new T.Vector3(0, -1, 0); _from = new T.Vector3();
    _rc = new T.Raycaster(); _ndc = new T.Vector2();

    buildTerrain();
    charlie = makeCharlie(); scene.add(charlie);
    scan();
    applyPhase();

    Game.player.handleClick = handleClick3d;
    window.addEventListener('resize', resize); resize();
    camera.position.set(Game.state.charlie.visualX * U, CAM_H, Game.state.charlie.visualY * U + CAM_D);
    _fpsEl = document.createElement('div');
    _fpsEl.id = 'r3d-fps';
    document.body.appendChild(_fpsEl);
    Game.r3d.renderer = renderer;
    requestAnimationFrame(loop);
}
function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

var CAM_H = 11, CAM_D = 15.5;   // caméra : hauteur et recul derrière Charlie
var _last = 0, _prev = null, _camTarget = null, _look = null;
var _fpsEl = null, _frames = 0, _fpsT = 0;
function loop(now) {
    requestAnimationFrame(loop);
    var dt = _last ? Math.min(0.1, (now - _last) / 1000) : 0.016;
    _last = now;
    var s = Game.state;
    if (s.currentView !== 'world') return;   // maisons / boutiques : l'intérieur est en 2D par-dessus
    var time = now / 1000;

    _scanT += dt;
    if (_scanT > 0.4) { _scanT = 0; scan(); applyPhase(); }
    syncMoving(time);

    // Charlie suit sa position (lissée) du jeu 2D
    var cx = s.charlie.visualX, cy = s.charlie.visualY;
    var ud = charlie.userData;
    var moving = false;
    if (_prev) {
        var dx = cx - _prev.x, dy = cy - _prev.y;
        if (Math.hypot(dx, dy) > 0.6) { moving = true; ud.facing = Math.atan2(dx, dy); }
    }
    _prev = { x: cx, y: cy };
    var turn = ud.facing - charlie.rotation.y;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    charlie.rotation.y += turn * Math.min(1, dt * 12);
    var gy = heightAt(cx, cy);
    charlie.position.set(cx * U, gy, cy * U);
    if (moving) ud.step += dt * 10;
    var sw = moving ? Math.sin(ud.step) * 0.65 : ud.legL.rotation.x * 0.8;
    ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw; ud.armL.rotation.x = -sw * 0.8; ud.armR.rotation.x = sw * 0.8;
    ud.body.position.y = moving ? Math.abs(Math.sin(ud.step)) * 0.07 : 0;
    ud.head.rotation.y = Math.sin(time * 1.1) * 0.15;
    charlieLight.position.set(cx * U, gy + 2.2, cy * U + 0.5);

    // Caméra de biais qui suit Charlie ; le soleil (et ses ombres) suit aussi
    if (!_camTarget) { _camTarget = new T.Vector3(); _look = new T.Vector3(); }
    _camTarget.set(cx * U, gy + CAM_H, cy * U + CAM_D);
    camera.position.lerp(_camTarget, Math.min(1, dt * 4));
    _look.set(camera.position.x, camera.position.y - CAM_H + 1, camera.position.z - CAM_D);
    camera.lookAt(_look);
    sun.position.set(cx * U - 12, 20, cy * U + 10);
    sun.target.position.set(cx * U, 0, cy * U);

    renderer.render(scene, camera);

    // Compteur d'images par seconde (pour vérifier que l'ordinateur suit)
    _frames++; _fpsT += dt;
    if (_fpsT >= 0.5) { _fpsEl.textContent = Math.round(_frames / _fpsT) + ' img/s'; _frames = 0; _fpsT = 0; }
}

})();
