// ── minimap.js ── Mini-carte façon vraie carte : relief, forêt, rivière, plage, routes, bâtiments ──
// Le fond (tout ce qui ne bouge pas) est dessiné une seule fois dans un canvas caché, puis recopié
// à chaque image ; par-dessus : villageois, Charlie (flèche dans le sens de la marche) et la nuit.
(function(){
"use strict";

var canvas, ctxM, base, bctx;
var SIZE = 170;              // taille affichée (px)
var RES = 340;               // résolution interne (net sur les écrans haute densité)
var SCALE;                   // monde → canvas
var baseKey = '', keyTimer = 0, lastDir = 0;

Game.minimap = {};

Game.minimap.init = function() {
    canvas = document.createElement('canvas');
    canvas.id = 'minimap';
    canvas.width = RES;
    canvas.height = RES;
    // Sous la barre pause / vitesse (en haut à droite), pour ne plus la cacher
    canvas.style.cssText = 'position:fixed;top:56px;right:10px;width:' + SIZE + 'px;height:' + SIZE + 'px;' +
        'border:4px solid #f3ead2;border-radius:14px;z-index:999;background:#8cd47e;' +
        'box-shadow:0 4px 12px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(0,0,0,0.15);';
    document.body.appendChild(canvas);
    ctxM = canvas.getContext('2d');
    base = document.createElement('canvas');
    base.width = RES; base.height = RES;
    bctx = base.getContext('2d');
    SCALE = RES / Game.CONFIG.WORLD_W;
};

// Petit générateur pseudo-aléatoire stable (le fond ne « clignote » pas d'un dessin à l'autre)
function rng(seed) { return function() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

function worldEls(sel) { return Array.prototype.slice.call(document.querySelectorAll('#game-world > ' + sel)); }
function centerOf(el) {
    var x = parseFloat(el.style.left), y = parseFloat(el.style.top);
    if (isNaN(x)) x = el.offsetLeft;
    if (isNaN(y)) y = el.offsetTop;
    return { x: x + (el.offsetWidth || 0) / 2, y: y + (el.offsetHeight || 0) * 0.7 };
}

// Ce qui change rarement : saison, bâtiments construits, nombre d'arbres
function currentKey() {
    var s = Game.state;
    return [s.season, (s.builtHouses || []).join(','), (s.builtShops || []).join(','),
            document.querySelectorAll('#game-world > .tree').length, document.querySelectorAll('#game-world > .player-path').length].join('|');
}

function drawBase() {
    var c = bctx, s = Game.state, L = Game.CONFIG.LOCATIONS, K = SCALE, cfg = Game.CONFIG;
    var winter = s.season === 'winter';
    var r = rng(7), i, x;

    // Herbe : couleur de saison + petites taches plus claires/foncées (relief)
    c.fillStyle = Game.SEASON_GRASS[s.season] || '#8cd47e';
    c.fillRect(0, 0, RES, RES);
    for (i = 0; i < 260; i++) {
        c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,60,0,0.06)';
        c.beginPath(); c.arc(r() * RES, r() * RES, 4 + r() * 12, 0, Math.PI * 2); c.fill();
    }

    // Massif alpin : grande zone rocheuse claire
    var alp = c.createRadialGradient(3500 * K, 1000 * K, 10, 3500 * K, 1000 * K, 900 * K);
    alp.addColorStop(0, 'rgba(205,205,200,0.85)'); alp.addColorStop(0.7, 'rgba(185,190,170,0.5)'); alp.addColorStop(1, 'rgba(185,190,170,0)');
    c.fillStyle = alp; c.fillRect(0, 0, RES, RES);

    // Sol de la forêt
    worldEls('.forest-ground').forEach(function(el) {
        var fx = parseFloat(el.style.left), fy = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight;
        c.fillStyle = winter ? 'rgba(220,235,225,0.6)' : 'rgba(46,110,50,0.45)';
        c.beginPath(); c.ellipse((fx + w / 2) * K, (fy + h / 2) * K, w / 2 * K, h / 2 * K, 0, 0, Math.PI * 2); c.fill();
    });

    // Plage (bord ondulé) puis mer (dégradé + vaguelettes)
    var bt = cfg.BEACH_TOP * K, st = cfg.SEA_TOP * K;
    c.fillStyle = '#efd89a';
    c.beginPath(); c.moveTo(0, RES);
    for (x = 0; x <= RES; x += 4) c.lineTo(x, bt + Math.sin(x / 13) * 3 + Math.sin(x / 5));
    c.lineTo(RES, RES); c.closePath(); c.fill();
    var sea = c.createLinearGradient(0, st, 0, RES);
    sea.addColorStop(0, '#5cc3e6'); sea.addColorStop(1, '#1f7fb8');
    c.fillStyle = sea;
    c.beginPath(); c.moveTo(0, RES);
    for (x = 0; x <= RES; x += 4) c.lineTo(x, st + Math.sin(x / 17 + 1) * 3);
    c.lineTo(RES, RES); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2;
    c.beginPath();
    for (x = 0; x <= RES; x += 4) { var y0 = st + Math.sin(x / 17 + 1) * 3; if (x === 0) c.moveTo(x, y0); else c.lineTo(x, y0); }
    c.stroke();
    for (i = 0; i < 40; i++) {
        var wx = r() * RES, wy = st + 6 + r() * Math.max(1, RES - st - 6);
        c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + 3, wy - 2, wx + 6, wy); c.stroke();
    }

    // Lac
    if (L.lake) {
        c.fillStyle = '#4fb0e0'; c.strokeStyle = '#e6f4fb'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(L.lake.x * K, L.lake.y * K, 250 * K, 150 * K, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    }

    // Rivière : un trait continu et arrondi qui suit les segments (berge claire + eau)
    var segs = Game.buildRiverSegments();
    function riverStroke(width, color) {
        c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
        var prev = null;
        segs.forEach(function(sg) {
            var p = { x: (sg.x + sg.w / 2) * K, y: (sg.y + sg.h / 2) * K };
            if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 14) { c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(p.x, p.y); c.stroke(); }
            prev = p;
        });
    }
    riverStroke(150 * K + 3, 'rgba(230,214,160,0.9)');
    riverStroke(150 * K, '#4aa6e8');

    // Routes : bandes arrondies avec un liseré
    Game.PATHS.forEach(function(p) {
        c.fillStyle = '#b89a62';
        roundRect(c, p.x * K - 1, p.y * K - 1, p.w * K + 2, p.h * K + 2, 3); c.fill();
        c.fillStyle = '#f0dfae';
        roundRect(c, p.x * K, p.y * K, p.w * K, p.h * K, 3); c.fill();
    });
    worldEls('.player-path').forEach(function(el) {
        var q = centerOf(el); c.fillStyle = '#e8d29a'; c.fillRect(q.x * K - 2, q.y * K - 2, 4, 4);
    });

    // Champs et enclos de la ferme
    worldEls('div:not([class])').forEach(function(el) {
        if (/🌽|🌾/.test(el.textContent) && el.offsetWidth > 120) {
            var fx = parseFloat(el.style.left) * K, fy = parseFloat(el.style.top) * K, fw = el.offsetWidth * K, fh = el.offsetHeight * K;
            c.fillStyle = /🌽/.test(el.textContent) ? '#9bb846' : '#d9c055';
            c.fillRect(fx, fy, fw, fh);
            c.strokeStyle = 'rgba(90,70,30,0.6)'; c.lineWidth = 0.6;
            for (var k = 2; k < fw; k += 3) { c.beginPath(); c.moveTo(fx + k, fy); c.lineTo(fx + k, fy + fh); c.stroke(); }
        }
    });
    worldEls('.farm-pen').forEach(function(el) {
        c.fillStyle = 'rgba(160,120,70,0.35)'; c.strokeStyle = '#8a5a3c'; c.lineWidth = 1.5;
        var px = parseFloat(el.style.left) * K, py = parseFloat(el.style.top) * K;
        c.fillRect(px, py, el.offsetWidth * K, el.offsetHeight * K);
        c.strokeRect(px, py, el.offsetWidth * K, el.offsetHeight * K);
    });

    // Arbres : petites boules vertes avec ombre (blanches en hiver)
    worldEls('.tree').forEach(function(el) {
        var q = centerOf(el), e = el.textContent.trim();
        var col = winter ? '#e8f1ec' : (e === '🍂' ? '#d9822b' : (e === '🌲' ? '#2e6b3a' : '#3f8f3c'));
        c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.arc(q.x * K + 1, q.y * K + 1, 3.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(q.x * K, q.y * K, 3.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(q.x * K - 1, q.y * K - 1, 1.2, 0, Math.PI * 2); c.fill();
    });
    // Sapins d'altitude, palmiers et rochers
    worldEls('div').forEach(function(el) {
        var e = el.textContent.trim(), q;
        if (el.classList.contains('snowy-pine')) {
            q = centerOf(el);
            c.fillStyle = '#2e6b3a'; c.beginPath(); c.moveTo(q.x * K, q.y * K - 4); c.lineTo(q.x * K + 3, q.y * K + 2); c.lineTo(q.x * K - 3, q.y * K + 2); c.fill();
        } else if (e === '🌴') {
            q = centerOf(el); c.fillStyle = '#3e9b4f'; c.beginPath(); c.arc(q.x * K, q.y * K, 2.6, 0, Math.PI * 2); c.fill();
        } else if (el.classList.contains('rock') || el.classList.contains('stone')) {
            q = centerOf(el); c.fillStyle = '#9ea4a8'; c.beginPath(); c.arc(q.x * K, q.y * K, 1.8, 0, Math.PI * 2); c.fill();
        }
    });

    // Montagnes : cônes ombrés avec un sommet enneigé
    [L.mountain, L.mountain2, L.mountain3, L.mountain4].forEach(function(m, idx) {
        if (!m) return;
        var mx = m.x * K, my = m.y * K, R = (idx === 0 ? 260 : 200) * K;
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.beginPath(); c.ellipse(mx + 3, my + R * 0.55, R, R * 0.35, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#8d8f95';
        c.beginPath(); c.moveTo(mx, my - R); c.lineTo(mx + R, my + R * 0.55); c.lineTo(mx - R, my + R * 0.55); c.closePath(); c.fill();
        c.fillStyle = '#b5b8be';
        c.beginPath(); c.moveTo(mx, my - R); c.lineTo(mx - R, my + R * 0.55); c.lineTo(mx - R * 0.1, my + R * 0.55); c.closePath(); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.moveTo(mx, my - R); c.lineTo(mx + R * 0.38, my - R * 0.38); c.lineTo(mx + R * 0.1, my - R * 0.45);
        c.lineTo(mx - R * 0.08, my - R * 0.32); c.lineTo(mx - R * 0.38, my - R * 0.38); c.closePath(); c.fill();
    });

    // Port : ponton en bois
    if (L.port) { c.fillStyle = '#8b6544'; c.fillRect(L.port.x * K - 3, (cfg.SEA_TOP - 60) * K, 6, 22); }

    // Bâtiments : petites maisons vues de dessus (toit coloré + ombre)
    function building(bx0, by0, w, roof) {
        var bx = bx0 * K, by = by0 * K;
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(bx - w / 2 + 1.5, by - w / 2 + 1.5, w, w);
        c.fillStyle = roof; c.fillRect(bx - w / 2, by - w / 2, w, w);
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(bx - w / 2, by - w / 2, w, w / 2);   // pan de toit éclairé
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.8; c.strokeRect(bx - w / 2, by - w / 2, w, w);
    }
    (Game.HOUSES || []).forEach(function(h) {
        var built = h.id === 'charlie' || !Game.buildings || !Game.buildings.isHouseBuilt || Game.buildings.isHouseBuilt(h.id);
        if (built) building(h.x, h.y, 9, h.id === 'charlie' ? '#ff8a3d' : '#c0614b');
        else { c.strokeStyle = 'rgba(120,90,60,0.6)'; c.lineWidth = 1; c.setLineDash([2, 2]); c.strokeRect(h.x * K - 4, h.y * K - 4, 8, 8); c.setLineDash([]); }
    });
    (Game.SHOPS || []).forEach(function(sh) {
        var loc = L[sh.loc]; if (!loc) return;
        if (!s.builtShops || s.builtShops.indexOf(sh.id) > -1) building(loc.x, loc.y, 11, '#4f86c6');
    });
    // Fontaine, jardin, grange
    c.fillStyle = '#dfe7ea'; c.beginPath(); c.arc(L.fountain.x * K, L.fountain.y * K, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5ab4e0'; c.beginPath(); c.arc(L.fountain.x * K, L.fountain.y * K, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a5230'; c.fillRect(L.garden.x * K - 6, L.garden.y * K - 6, 12, 12);
    var LB = L.farmBarn || { x: L.farm.x, y: L.farm.y - 340 };
    building(LB.x, LB.y + 70, 12, '#b83227');   // grange rouge
}

function roundRect(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

Game.minimap.update = function(dt) {
    if (!ctxM) return;
    var s = Game.state, K = SCALE;
    keyTimer -= (dt || 16);
    if (keyTimer <= 0) {
        keyTimer = 2000;
        var k = currentKey();
        if (k !== baseKey) { baseKey = k; drawBase(); }
    }
    ctxM.drawImage(base, 0, 0);

    // Villageois : petits ronds roses bordés de blanc
    (s.villagers || []).forEach(function(v) {
        ctxM.fillStyle = '#ff6b8b'; ctxM.strokeStyle = '#fff'; ctxM.lineWidth = 1.2;
        ctxM.beginPath(); ctxM.arc(v.x * K, v.y * K, 3.2, 0, Math.PI * 2); ctxM.fill(); ctxM.stroke();
    });

    // Charlie : flèche jaune dans le sens de la marche
    var ch = s.charlie, vx = ch.visualX !== undefined ? ch.visualX : ch.x, vy = ch.visualY !== undefined ? ch.visualY : ch.y;
    if (Math.hypot(ch.x - vx, ch.y - vy) > 0.5) lastDir = Math.atan2(ch.y - vy, ch.x - vx);
    ctxM.save();
    ctxM.translate(vx * K, vy * K); ctxM.rotate(lastDir + Math.PI / 2);
    ctxM.fillStyle = '#ffd400'; ctxM.strokeStyle = '#3a2a00'; ctxM.lineWidth = 1.5;
    ctxM.beginPath(); ctxM.moveTo(0, -8); ctxM.lineTo(6, 6); ctxM.lineTo(0, 3); ctxM.lineTo(-6, 6); ctxM.closePath();
    ctxM.fill(); ctxM.stroke();
    ctxM.restore();

    // Nuit : voile bleu
    if (Game.time.isNight()) {
        ctxM.fillStyle = 'rgba(20,20,80,0.35)';
        ctxM.fillRect(0, 0, RES, RES);
    }
};

})();
