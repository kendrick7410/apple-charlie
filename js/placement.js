// ── placement.js ── Garde-fou du décor : aucun objet posé sur un autre, dans l'eau ou sur un chemin ──
// Chaque objet fixe de la carte a une emprise au sol (cercle ou rectangle), calculée comme la taille
// de son modèle 3D (voir render3d.js : makeTree, makeParasol, colliderFor...). Les placements
// aléatoires passent par Game.placement.place() : on retire au sort jusqu'à trouver une place libre,
// et si on n'en trouve pas, l'objet n'est pas posé (mieux vaut un objet de moins qu'un objet mal placé).
// À la fin du lancement, Game.placement.settle() replace ce qui gêne encore.
// Mode test : ?checkdecor dans l'adresse affiche dans la console tout chevauchement restant.
(function(){
"use strict";

var P = Game.placement = {};
var U = 40;   // 40 px de la carte = 1 unité 3D (comme render3d.js)
var MOVING = /villager-sprite|creature|sea-creature|mtn-animal|farmer-sprite|farm-escaped|farm-animal|wasp|cargo-boat|charlie-sprite|player-path|river-segment|^path$|hill|forest-ground|lake-water|lake-shimmer|mountain-base|mountain-snow|particle/;
// Taille au sol des objets de plage (rayon en unités 3D, cf. makeParasol, makeSandCastle...)
var DECOR_R = { '⛱️': 2.05,   // parasol + ses deux transats + la serviette (le modèle 3D tourne au hasard)
    '🏖️': 1.2, '🏐': 0.32, '🩴': 0.35, '🪵': 0.75, '🪁': 0.25, '🌿': 0.2, '🌾': 0.2 };
var HOUSE_S = 0.85, SHOP_S = 0.95;   // même taille que les modèles 3D (render3d.js)

function world() { return document.getElementById('game-world'); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
// Taille de police sans forcer le navigateur à recalculer la page (rapide : des centaines d'objets à poser)
function fontPx(el) {
    var f = el.style.fontSize, v = parseFloat(f);
    if (v && /rem$/.test(f)) return v * 16;
    if (v && /px$/.test(f)) return v;
    return parseFloat(getComputedStyle(el).fontSize) || 32;
}
function emojiOf(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
        if (n.nodeType === 1 && !n.classList.contains('building-label') && !n.classList.contains('speech-bubble') && n.textContent.trim() && !n.querySelector('.garden-cell')) return n.textContent.trim();
    }
    return '';
}
function labelOf(el) { var l = el.querySelector(':scope > .building-label'); return l ? l.textContent.trim() : ''; }
// Point au sol d'un emoji (bas-centre du dessin), comme groundPoint() de render3d.js
function foot(el, fs) {
    var x = parseFloat(el.style.left) || el.offsetLeft, y = parseFloat(el.style.top) || el.offsetTop;
    var w = fs * 1.24, h = fs * 1.24;   // un emoji occupe ≈ 1,24 × sa taille de police (mesuré)
    return { x: x + w / 2, y: y + h * 0.9 };
}
function rectOf(el, pad) {
    pad = pad || 0;
    var x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
    return { rect: true, x1: x - pad, y1: y - pad, x2: x + el.offsetWidth + pad, y2: y + el.offsetHeight + pad };
}
function boxAt(cx, cy, hw, hd) { return { rect: true, x1: cx - hw, y1: cy - hd, x2: cx + hw, y2: cy + hd }; }

// ── Emprise au sol d'un élément de la carte (null = ignoré : animaux, sols, chemins, étiquettes...) ──
// kind : building (bâtiment ou terrain réservé), mountain, water-ok (pilotis), small, solid...
P.footprint = function(el) {
    if (!el || el.nodeType !== 1 || el.id === 'player') return null;
    var cl = el.className && el.className.baseVal === undefined ? el.className : '';
    if (cl && MOVING.test(cl)) return null;
    var L = Game.CONFIG.LOCATIONS, id = el.id, fp = null;
    // Bâtiments : même centre et même taille que les modèles 3D (porte = point « Entrer »)
    if (id === 'house-site') fp = boxAt(L.charlieHouse.x, L.charlieHouse.y + 2, 2.9 * HOUSE_S * 0.9 * U, 3.8 * HOUSE_S / 2 * U);
    else if (/^house-/.test(id)) {
        var h = (Game.HOUSES || []).find(function(hh) { return 'house-' + hh.id === id; });
        if (h) fp = boxAt(h.x, h.y + 2, 2.9 * HOUSE_S * 0.9 * U, 3.8 * HOUSE_S / 2 * U);   // terrain à bâtir = place de la future maison
    } else if (id === 'fountain-anchor') {
        fp = { x: (parseFloat(el.style.left) || 0) + el.offsetWidth / 2, y: (parseFloat(el.style.top) || 0) + el.offsetHeight / 2, r: 2.45 * U };
    } else if (/-anchor$/.test(id)) {
        var sh = (Game.SHOPS || []).find(function(s) { return s.loc + '-anchor' === id; });
        var loc = sh && L[sh.loc] ? L[sh.loc] : { x: parseFloat(el.style.left) || 0, y: (parseFloat(el.style.top) || 0) + 56 };
        fp = boxAt(loc.x, loc.y - 56, 2.9 * SHOP_S * 0.9 * U, 3.8 * SHOP_S / 2 * U);
    } else if (id === 'garden-area') fp = rectOf(el, 10);
    if (fp) {
        // Parvis devant la porte (côté +y) : rien ne doit bloquer l'entrée d'une maison ou d'une boutique
        if (id !== 'fountain-anchor' && id !== 'garden-area') fp.y2 += 55;
        fp.kind = 'building'; return fp;
    }
    if (cl.indexOf('farm-pen') > -1) { fp = rectOf(el, 8); fp.kind = 'building'; return fp; }
    if (cl.indexOf('cargo-crate') > -1) { var fc = foot(el, fontPx(el)); return { x: fc.x, y: fc.y, r: 18, kind: 'crate' }; }

    // Décor de la ferme et ponton (éléments sans classe)
    if (!cl) {
        if (labelOf(el).indexOf('La Ferme') > -1) {   // grange : toit de 6 unités de large, 4,1 de profondeur
            var bx = (parseFloat(el.style.left) || 0) + el.offsetWidth / 2, by = (parseFloat(el.style.top) || 0) + 140;
            return { rect: true, x1: bx - 3 * U, y1: by - 2.1 * U, x2: bx + 3 * U, y2: by + 2.1 * U, kind: 'building' };
        }
        if (el.querySelector(':scope > div') && /🌽|🌾/.test(el.textContent) && el.offsetWidth > 120) { fp = rectOf(el, 4); fp.kind = 'building'; return fp; }
        if (!el.textContent.trim() && /repeating-linear-gradient/.test(el.style.background) && el.offsetWidth < 90) {   // botte de foin
            var s = Math.max(0.8, el.offsetWidth / U * 0.75), fh = foot(el, 40);
            return { x: (parseFloat(el.style.left) || 0) + el.offsetWidth / 2, y: fh.y, r: 0.6 * s * U, kind: 'solid' };
        }
        if (emojiOf(el) === '🚜') { var ft = foot(el, fontPx(el)); return { x: ft.x, y: ft.y, r: 70, kind: 'solid' }; }
        if (/a67c52|166, 124, 82/.test(el.style.backgroundImage)) { fp = rectOf(el, 0); fp.kind = 'dock'; return fp; }
        return null;
    }
    if (cl.indexOf('entity') === -1) return null;
    if (cl.indexOf('plaza-deco') > -1) {   // place du village : banc, lampadaire, mât, table de fête (solides)
        var PR = { bench: 34, lamp: 10, pole: 9, party: 46 }[el.dataset.kind] || 12;
        return { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0, r: PR, kind: 'solid' };
    }
    var e = emojiOf(el);
    if (!e || e === '❄️') return null;   // étiquettes seules, plaques de neige
    var fs = fontPx(el), size = fs / U, f = foot(el, fs);
    var out = { x: f.x, y: f.y, e: e };
    if (cl.indexOf('dock-post') > -1) { out.r = 10; out.kind = 'water-ok'; return out; }
    if (/^(🏔️|🗻|⛰️)/.test(e)) { out.r = 0.62 * Math.max(8, size * 2.6) * U; out.kind = 'mountain'; return out; }
    if (cl.indexOf('tree') > -1 || cl.indexOf('snowy-pine') > -1) { out.r = 0.9 * clamp(size / 1.1, 0.7, 1.3) * U; out.kind = 'tree'; return out; }
    if (cl.indexOf('stone') > -1 || e === '🪨') { out.r = 0.62 * clamp(size / 0.8, 0.6, 1.6) * U; out.kind = 'solid'; return out; }
    if (cl.indexOf('flower') > -1) { out.r = 10; out.kind = cl.indexOf('placed-flower') > -1 ? 'player' : 'small'; return out; }
    if (e === '🌴') { out.r = 0.8 * Math.max(0.8, size / 1.2) * U; out.kind = 'solid'; return out; }
    if (DECOR_R[e]) { out.r = DECOR_R[e] * U; out.kind = (e === '🌾' || e === '🌿') ? 'grass' : 'solid'; return out; }
    if (cl.indexOf('mountain-goat') > -1) { out.r = 20; out.kind = 'animal'; return out; }
    if (cl.indexOf('mountain-edelweiss') > -1) { out.r = 12; out.kind = 'pickup'; return out; }
    out.r = Math.max(0.8, size * 1.25) * U / 2; out.kind = 'sprite';   // autre emoji (panneau du port...)
    return out;
};

// ── Géométrie ──
function circleRect(c, r, R) {
    var dx = c.x - clamp(c.x, R.x1, R.x2), dy = c.y - clamp(c.y, R.y1, R.y2);
    return dx * dx + dy * dy < r * r;
}
function overlap(a, b) {
    if (a.rect && b.rect) return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
    if (a.rect) return circleRect(b, b.r, a);
    if (b.rect) return circleRect(a, a.r, b);
    var d = a.r + b.r;
    return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) < d * d;
}
// Paires autorisées : montagnes entre elles (un massif), pilotis et caisses sur le ponton,
// animaux sur la montagne, herbes au bord de tout, ce que Charlie a posé lui-même
function allowed(a, b) {
    var k1 = a.kind, k2 = b.kind;
    if (k1 === 'player' || k2 === 'player') return true;
    if (k1 === 'mountain' && k2 === 'mountain') return true;
    if (((k1 === 'animal' || k1 === 'pickup') && k2 === 'mountain') || ((k2 === 'animal' || k2 === 'pickup') && k1 === 'mountain')) return true;
    if ((k1 === 'dock' && (k2 === 'water-ok' || k2 === 'crate' || k2 === 'sprite')) || (k2 === 'dock' && (k1 === 'water-ok' || k1 === 'crate' || k1 === 'sprite'))) return true;
    if (k1 === 'crate' && k2 === 'crate') return true;   // caisses empilées sur le ponton
    if (k1 === 'grass' && k2 === 'grass') return true;
    return false;
}

// Zones interdites : rivière, lac, mer, chemins (calculées une fois)
var _river = null, _lake = null;
function river() { if (!_river) _river = Game.buildRiverSegments(); return _river; }
function inWater(fp) {
    if (fp.rect) return false;
    if (fp.kind === 'water-ok' || fp.kind === 'grass' || fp.kind === 'crate') return false;
    var pad = fp.r * 0.6, rr = river();
    for (var i = 0; i < rr.length; i++) {
        var s = rr[i];
        if (fp.x > s.x - pad && fp.x < s.x + s.w + pad && fp.y > s.y - pad && fp.y < s.y + s.h + pad) return 'rivière';
    }
    var lk = _lake || (_lake = Game.CONFIG.LOCATIONS.lake);
    if (lk) {
        var ex = (fp.x - lk.x) / (250 + pad), ey = (fp.y - lk.y) / (150 + pad);
        if (ex * ex + ey * ey < 1) return 'lac';
    }
    if (Game.world.shorelineY && fp.y + fp.r * 0.5 > Game.world.shorelineY(fp.x) - 15) return 'mer';
    return false;
}
function onPath(fp) {
    if (fp.rect || fp.kind === 'mountain' || fp.kind === 'water-ok') return false;
    var r = fp.kind === 'small' ? fp.r : fp.r * 0.8;
    for (var i = 0; i < Game.PATHS.length; i++) {
        var p = Game.PATHS[i];
        if (circleRect(fp, r, { x1: p.x, y1: p.y, x2: p.x + p.w, y2: p.y + p.h })) return true;
    }
    return false;
}
function inBounds(fp) {
    if (fp.rect) return true;
    return fp.x > 30 && fp.y > 30 && fp.x < Game.CONFIG.WORLD_W - 30 && fp.y < Game.CONFIG.WORLD_H - 30;
}

// Toutes les emprises présentes sur la carte (mises en cache par élément tant qu'il ne bouge pas)
function fpCached(el) {
    var key = el.style.left + '|' + el.style.top + '|' + el.style.fontSize + '|' + el.className + '|' + el.childNodes.length;
    if (el._fpKey !== key) { el._fpKey = key; el._fp = P.footprint(el); }
    return el._fp;
}
function all(except) {
    var out = [], kids = world().children;
    for (var i = 0; i < kids.length; i++) {
        if (kids[i] === except) continue;
        var fp = fpCached(kids[i]);
        if (fp) out.push({ el: kids[i], fp: fp });
    }
    return out;
}

// Raison pour laquelle cette emprise ne va pas (ou '' si tout va bien)
function problem(el, fp, others) {
    if (!inBounds(fp)) return 'hors de la carte';
    var w = inWater(fp);
    if (w) return 'dans l\'eau (' + w + ')';
    if (fp.kind !== 'building' && fp.kind !== 'dock' && onPath(fp)) return 'sur un chemin';
    for (var i = 0; i < others.length; i++) {
        var o = others[i];
        if (o.el === el || allowed(fp, o.fp)) continue;
        if (overlap(fp, o.fp)) return o;
    }
    return '';
}
// ── Obstacles pour ce qui bouge (habitants, animaux) ──
// Arbres, rochers, bâtiments, enclos, grange, foin, tracteur, palmiers, décor, balançoire, montagnes...
// rangés dans une grille (cases de 200 px) recalculée toutes les 1,5 s : rapide à interroger à chaque pas.
var SOLID_SKIP = { small: 1, player: 1, grass: 1, pickup: 1, animal: 1, 'water-ok': 1, dock: 1, crate: 1 };
var CELL = 200, _grid = null, _gridT = 0;
function gridAdd(g, fp) {
    var x1, y1, x2, y2;
    if (fp.rect) { x1 = fp.x1; y1 = fp.y1; x2 = fp.x2; y2 = fp.y2; }
    else { x1 = fp.x - fp.r; y1 = fp.y - fp.r; x2 = fp.x + fp.r; y2 = fp.y + fp.r; }
    for (var cx = Math.floor(x1 / CELL); cx <= Math.floor(x2 / CELL); cx++)
        for (var cy = Math.floor(y1 / CELL); cy <= Math.floor(y2 / CELL); cy++) {
            var k = cx + ',' + cy; (g[k] || (g[k] = [])).push(fp);
        }
}
function solidGrid() {
    var now = performance.now();
    if (_grid && now - _gridT < 1500) return _grid;
    _gridT = now;
    var g = {};
    all(null).forEach(function(o) { if (!SOLID_SKIP[o.fp.kind]) gridAdd(g, o.fp); });
    var sw = Game.state && Game.state.swing;
    if (sw && sw.x != null && !Game.state.swingPlacing) gridAdd(g, { x: sw.x, y: sw.y, r: 75, kind: 'solid' });   // balançoire (dessinée en 3D seulement)
    _grid = g;
    return g;
}
// Vrai si un rond de rayon r posé en (x, y) (point au sol) touche un obstacle.
// opts.mountain : les montagnes ne bloquent pas (animaux de montagne) ; opts.water === false : l'eau ne bloque pas
P.blocked = function(x, y, r, opts) {
    opts = opts || {};
    if (x < 30 || y < 30 || x > Game.CONFIG.WORLD_W - 30 || y > Game.CONFIG.WORLD_H - 30) return true;
    var me = { x: x, y: y, r: r, kind: 'animal' };
    if (opts.water !== false && inWater(me)) return true;
    var list = solidGrid()[Math.floor(x / CELL) + ',' + Math.floor(y / CELL)];
    if (list) for (var i = 0; i < list.length; i++) {
        var fp = list[i];
        if (opts.mountain && fp.kind === 'mountain') continue;
        if (overlap(me, fp)) return true;
    }
    // le rond peut déborder sur une case voisine
    var dx = [-1, 0, 1], seen = list || [];
    for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
        if (!dx[a] && !dx[b]) continue;
        var cx = Math.floor((x + dx[a] * r) / CELL), cy = Math.floor((y + dx[b] * r) / CELL);
        var l2 = solidGrid()[cx + ',' + cy];
        if (!l2 || l2 === list) continue;
        for (var j = 0; j < l2.length; j++) {
            if (seen.indexOf(l2[j]) > -1 || (opts.mountain && l2[j].kind === 'mountain')) continue;
            if (overlap(me, l2[j])) return true;
        }
    }
    return false;
};
P.refreshObstacles = function() { _grid = null; };
// Point au sol d'un élément qui bouge, par rapport à son coin haut-gauche (mis en cache)
P.groundOffset = function(el) {
    if (!el._gOff || !el._gOff.w) { var w = el.offsetWidth, h = el.offsetHeight; el._gOff = { w: w, x: (w || 40) / 2, y: (h || 40) * 0.85 }; }
    return el._gOff;
};
// Un pas sans traverser : on essaie le pas entier, sinon on glisse le long de l'obstacle (axe x ou y).
// Renvoie { x, y, hit } ; hit = true quand quelque chose a gêné.
P.move = function(el, x, y, nx, ny, r, opts) {
    var o = P.groundOffset(el);
    if (P.canStep(x, y, nx, ny, o.x, o.y, r, opts)) return { x: nx, y: ny, hit: false };
    if (P.canStep(x, y, nx, y, o.x, o.y, r, opts)) return { x: nx, y: y, hit: true };
    if (P.canStep(x, y, x, ny, o.x, o.y, r, opts)) return { x: x, y: ny, hit: true };
    return { x: x, y: y, hit: true };
};
// Fait avancer quelque chose qui bouge de (x,y) vers (nx,ny) sans entrer dans un obstacle.
// (ox, oy) = décalage entre la position stockée (coin de l'élément) et son point au sol.
// Renvoie true si le pas est accepté. S'il était déjà coincé dedans, on le laisse sortir.
function nearCharlie(x, y, r) {
    var c = Game.state && Game.state.charlie;
    return !!c && Game.state.currentView === 'world' && Math.hypot(x - c.x, y - c.y) < r + 22;
}
P.canStep = function(x, y, nx, ny, ox, oy, r, opts) {
    // Ils ne passent pas à travers Charlie non plus (s'ils sont déjà collés à lui, ils peuvent s'écarter)
    if (nearCharlie(nx + ox, ny + oy, r) && !nearCharlie(x + ox, y + oy, r)) return false;
    if (!P.blocked(nx + ox, ny + oy, r, opts)) return true;
    return P.blocked(x + ox, y + oy, r, opts);   // déjà coincé dedans (apparu là) : il peut se dégager
};

P.isFree = function(el) {
    var fp = P.footprint(el);
    return !fp || !problem(el, fp, all(el));
};

// ── Poser un objet au hasard sans gêner : pick() renvoie une position {x, y} (left/top de l'élément) ──
// L'élément est ajouté à la carte s'il ne l'est pas. Renvoie false (et l'enlève) s'il n'y a pas de place.
P.place = function(el, pick, tries) {
    tries = tries || 40;
    if (!el.parentNode) world().appendChild(el);
    el._pick = pick;   // pour le replacer plus tard si un bâtiment arrive dessus (settle)
    el.dataset.placed = '1';
    var others = all(el);
    for (var t = 0; t < tries; t++) {
        var p = pick();
        if (!p) continue;
        el.style.left = p.x + 'px';
        el.style.top = p.y + 'px';
        var fp = P.footprint(el);
        if (!fp || !problem(el, fp, others)) return true;
    }
    el.remove();
    return false;
};

// ── Un endroit libre pour quelque chose qui n'est pas encore posé (x, y = point au sol) ──
// kind : 'small' (fleur, coffre...), 'pickup' (peut être au pied d'une montagne), 'crate' (peut être sur le ponton)
P.spotFree = function(x, y, r, kind) {
    var fp = { x: x, y: y, r: r, kind: kind || 'small' };
    return !problem(null, fp, all(null));
};

// ── Fin du lancement : tout objet posé au hasard qui gêne encore est replacé (ou retiré) ──
P.settle = function() {
    var moved = 0, removed = 0;
    world().querySelectorAll(':scope > [data-placed]').forEach(function(el) {
        var fp = fpCached(el);
        if (!fp || !problem(el, fp, all(el))) return;
        if (el._pick && P.place(el, el._pick, 60)) moved++; else { el.remove(); removed++; }
    });
    return { moved: moved, removed: removed };
};

// ── Contrôle : liste tous les chevauchements restants (utilisé par ?checkdecor et les tests) ──
function describe(el, fp) {
    var e = fp.e || labelOf(el) || el.id || el.className || 'objet';
    return e + ' (' + Math.round(fp.rect ? (fp.x1 + fp.x2) / 2 : fp.x) + ',' + Math.round(fp.rect ? (fp.y1 + fp.y2) / 2 : fp.y) + ')';
}
P.check = function() {
    var list = all(null), issues = [];
    for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (!inBounds(a.fp)) issues.push(describe(a.el, a.fp) + ' : hors de la carte');
        var w = inWater(a.fp);
        if (w) issues.push(describe(a.el, a.fp) + ' : dans l\'eau (' + w + ')');
        if (a.fp.kind !== 'building' && a.fp.kind !== 'dock' && onPath(a.fp)) issues.push(describe(a.el, a.fp) + ' : sur un chemin');
        for (var j = i + 1; j < list.length; j++) {
            var b = list[j];
            if (!allowed(a.fp, b.fp) && overlap(a.fp, b.fp)) issues.push(describe(a.el, a.fp) + ' touche ' + describe(b.el, b.fp));
        }
    }
    return issues;
};

// Mode test : ?checkdecor → la console liste tout ce qui se chevauche encore
P.devCheck = function() {
    if (!/[?&]checkdecor\b/.test(location.search)) return;
    var issues = P.check();
    if (issues.length) console.warn('[décor] ' + issues.length + ' problème(s) :\n' + issues.join('\n'));
    else console.log('[décor] aucun chevauchement ✔');
};

})();
