// ── admin.js ── Placement du décor (Game.decorLayout) + éditeur de la page admin (?admin) ──
// Le décor posé au hasard (arbres, palmiers, parasols et transats, châteaux de sable, rochers, roseaux...)
// peut être remplacé par une liste fixe, Game.DECOR_LAYOUT (js/decor-layout.js), réglée dans la page admin.
// Les objets à ramasser (fleurs, cailloux) restent au hasard.
(function(){
"use strict";

var SAFE_CLASS = /^[a-z0-9 _-]{0,80}$/i;

// Grands éléments déplaçables d'un bloc : 'loc:<clé de Game.CONFIG.LOCATIONS>' ou 'house:<id de Game.HOUSES>'
var PLACE_RE = /^(loc|house):[A-Za-z0-9_]{1,30}$/;
function placeObj(tag) {
    if (!PLACE_RE.test(tag)) return null;
    var k = tag.split(':')[1];
    if (tag.indexOf('loc:') === 0) return Game.CONFIG.LOCATIONS[k] || null;
    return (Game.HOUSES || []).find(function(h) { return h.id === k; }) || null;
}
function setPlace(tag, x, y) {
    var o = placeObj(tag);
    if (!o) return;
    o.x = Math.round(x); o.y = Math.round(y);
    if (tag === 'loc:charlieHouse') { var ch = (Game.HOUSES || []).find(function(h) { return h.id === 'charlie'; }); if (ch) { ch.x = o.x; ch.y = o.y; } }
}

Game.decorLayout = {
    // Tout ce que la page admin peut déplacer un par un (le décor ; les grands éléments sont des groupes, voir data-place)
    editable: function() {
        return Array.prototype.slice.call(document.querySelectorAll(
            '#game-world > [data-placed]:not(.flower):not(.stone), #game-world > [data-layout], #game-world > [data-decor]'));
    },
    snapshot: function() {
        return {
            version: 2,
            items: Game.decorLayout.editable().map(function(el) {
                var it = { c: el.dataset.decor ? '' : el.className.replace(/\s*admin-(sel|bad)\b/g, '').trim(), x: Math.round(parseFloat(el.style.left) || 0), y: Math.round(parseFloat(el.style.top) || 0) };
                if (el.dataset.decor) { it.k = el.dataset.decor; if (el.dataset.w) it.w = +el.dataset.w; return it; }   // foin, tracteur
                if (!el.classList.contains('tree')) it.h = el.textContent.trim();
                if (el.style.fontSize) it.f = el.style.fontSize.replace(/^([0-9]+\.[0-9]{2})[0-9]*/, '$1');   // taille arrondie
                if (el.style.zIndex) it.z = el.style.zIndex;
                return it;
            })
        };
    },
    create: function(it) {
        var world = document.getElementById('game-world'), el;
        if (it.k === 'hay') el = Game.farm.hayBale(+it.x || 0, +it.y || 0, +it.w || 56);
        else if (it.k === 'tractor') el = Game.farm.tractor(+it.x || 0, +it.y || 0);
        if (el) { el.dataset.layout = '1'; delete el.dataset.place; return el; }
        el = document.createElement('div');
        el.className = SAFE_CLASS.test(it.c || '') ? (it.c || 'entity') : 'entity';
        if (it.f && /^[0-9.]+(rem|px)$/.test(it.f)) el.style.fontSize = it.f;
        if (it.z && /^[0-9]+$/.test(String(it.z))) el.style.zIndex = it.z;
        el.style.left = (+it.x || 0) + 'px';
        el.style.top = (+it.y || 0) + 'px';
        if (el.classList.contains('tree')) {
            el.innerHTML = Game.SEASON_TREE[Game.state.season];
            el.dataset.hasApple = Game.state.season !== 'winter' ? 'true' : 'false';
        } else {
            el.textContent = String(it.h || '').slice(0, 16);   // jamais de HTML venant du fichier : seulement l'emoji
        }
        el.dataset.layout = '1';
        world.appendChild(el);
        return el;
    },
    // Remplace le décor tiré au hasard par la liste fixe (appelé au lancement d'une partie)
    apply: function(layout) {
        layout = layout || Game.DECOR_LAYOUT;
        if (!layout || !layout.items || !layout.items.length) return false;
        Game.decorLayout.editable().forEach(function(el) { el.remove(); });
        layout.items.forEach(function(it) { Game.decorLayout.create(it); });
        if (Game.placement.refreshObstacles) Game.placement.refreshObstacles();
        return true;
    },
    // Nouvelles positions des maisons, chantiers, boutiques, montagnes, ferme, jardin... (avant de construire la carte)
    applyPlaces: function(places) {
        if (!places) return;
        Object.keys(places).forEach(function(tag) { var p = places[tag]; if (p && isFinite(p.x) && isFinite(p.y)) setPlace(tag, p.x, p.y); });
    },
    placeXY: function(tag) { var o = placeObj(tag); return o ? { x: o.x, y: o.y } : null; },
    setPlace: setPlace
};
// Le placement validé change les positions des grands éléments dès le chargement (la carte est construite après)
if (Game.DECOR_LAYOUT && Game.DECOR_LAYOUT.places) Game.decorLayout.applyPlaces(Game.DECOR_LAYOUT.places);

// ═══════════════════════ Éditeur (page admin) ═══════════════════════
var params = new URLSearchParams(location.search);
Game.adminMode = params.has('admin');
if (!Game.adminMode) return;

var PASS_KEY = 'village_admin';
function password() { try { return sessionStorage.getItem(PASS_KEY) || ''; } catch (e) { return ''; } }

var A = Game.admin = { zoom: 0.6, sel: null, drag: null, palette: [] };
// Positions des grands éléments déplacés (maisons, chantiers, boutiques, montagnes, ferme, jardin...)
A.places = JSON.parse(JSON.stringify((Game.DECOR_LAYOUT && Game.DECOR_LAYOUT.places) || {}));
function groupEls(tag) {
    return Array.prototype.slice.call(document.querySelectorAll('#game-world > [data-place]')).filter(function(el) {
        return el.dataset.place === tag && !el.dataset.decor && !el.dataset.layout;
    });
}
function placeEls() {   // tous les éléments qui appartiennent à un grand élément
    return Array.prototype.slice.call(document.querySelectorAll('#game-world > [data-place]')).filter(function(el) { return !el.dataset.decor && !el.dataset.layout; });
}
function isGroup(el) { return !!(el && el.dataset.place && !el.dataset.decor && !el.dataset.layout); }
// Déplace d'un bloc tout un grand élément jusqu'à (x, y) (sa position de référence)
function movePlace(tag, x, y) {
    var cur = Game.decorLayout.placeXY(tag);
    if (!cur) return;
    var dx = x - cur.x, dy = y - cur.y;
    groupEls(tag).forEach(function(el) {
        el.style.left = ((parseFloat(el.style.left) || 0) + dx) + 'px';
        el.style.top = ((parseFloat(el.style.top) || 0) + dy) + 'px';
        if (is3d()) Game.r3d.syncNow(el);
    });
    Game.decorLayout.setPlace(tag, x, y);
    A.places[tag] = { x: Math.round(x), y: Math.round(y) };
}
function is3d() { return !!(Game.r3d && Game.r3d.active && Game.r3d.ready && Game.r3d.ready()); }

function api(method, path, body) {
    return fetch('admin-api/' + path, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password() },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
    });
}

A.start = function() {
    if (!password()) { location.href = 'admin.html'; return; }
    api('POST', 'check').then(function(r) {
        if (r.status !== 200) { try { sessionStorage.removeItem(PASS_KEY); } catch (e) {} location.href = 'admin.html'; return; }
        openWorld();
    }).catch(function() { openWorld(); status('⚠️ Serveur admin injoignable', true); });
};

function openWorld() {
    Game.saveGame = function() {};           // la page admin ne touche à aucune partie
    Game.worldId = '__admin';
    Game.newGame();
    Game.titlescreen.hide();
    Game.startGame();
    Game.CONFIG.PLAYER_SPEED = 16;          // on se déplace vite sur la carte (flèches)
    setZoom(A.zoom);
    buildPanel();
    // La 3D se charge un peu après : dès qu'elle est prête, zoom et zones au sol
    var tries = 0, wait = setInterval(function() {
        if (is3d() || ++tries > 60) { clearInterval(wait); setZoom(A.zoom); refresh(); }
    }, 500);
    // Brouillon déjà validé sur le serveur ? On le reprend
    api('GET', 'layout').then(function(r) { return r.status === 200 ? r.json() : null; }).then(function(d) {
        if (d && d.layout) {
            if (d.layout.places) Object.keys(d.layout.places).forEach(function(tag) { var pl = d.layout.places[tag]; movePlace(tag, pl.x, pl.y); });
            if (d.layout.items && d.layout.items.length) Game.decorLayout.apply(d.layout);
            status('📂 Dernière validation du ' + new Date(d.saved).toLocaleString('fr-BE') + ' chargée');
        }
        refresh();
    }).catch(refresh);
}

// ── Panneau ──
function buildPanel() {
    var css = document.createElement('style');
    css.textContent =
        '#admin-panel{position:fixed;top:10px;right:10px;width:270px;max-height:calc(100vh - 20px);overflow:auto;z-index:20000;background:#fffdf6;border:3px solid #eadfc4;border-radius:18px;padding:14px;font-family:"Varela Round",sans-serif;color:#4e342e;box-shadow:0 8px 24px rgba(0,0,0,.2);font-size:14px;line-height:1.4}' +
        '#admin-panel h2{margin:0 0 6px;font-size:18px;color:#5b7d4c}' +
        '#admin-panel .row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
        '#admin-panel button{border:2px solid #e6dcc4;background:#fff;border-radius:10px;padding:5px 9px;cursor:pointer;font-family:inherit;font-size:14px;color:#4e342e}' +
        '#admin-panel button:hover{background:#f6f1e3}' +
        '#admin-panel .pal button{font-size:22px;padding:2px 6px}' +
        '#admin-panel .go{background:#8fbf7f;color:#fff;border-color:#7aa96b;font-weight:bold;width:100%;padding:10px;font-size:16px}' +
        '#admin-panel .warn{color:#c62828;font-weight:bold}' +
        '#admin-status{margin-top:8px;font-size:13px;min-height:18px}' +
        '.admin-sel{outline:3px solid #2979ff !important;outline-offset:2px;border-radius:8px}' +
        '.admin-bad{outline:3px dashed #e53935 !important;outline-offset:2px;border-radius:8px}' +
        'body.admin-mode #game-world > *{pointer-events:none}' +
        'body.admin-mode #player{opacity:.25}' +
        'body.admin-mode .ui-card, body.admin-mode [id^="action-"], body.admin-mode #minimap, body.admin-mode #notify-stack, body.admin-mode #mobile-toggle, body.admin-mode #joystick{display:none !important}';
    document.head.appendChild(css);
    document.body.classList.add('admin-mode');

    var p = document.createElement('div');
    p.id = 'admin-panel';
    var places = [['🏖️ Plage', 3000, 5100], ['⚓ Port', 4100, 5050], ['🏡 Village', 1000, 1000], ['🌳 Forêt', 1900, 450], ['⛰️ Montagnes', 3400, 1000], ['🚜 Ferme', 2500, 2450]];
    p.innerHTML =
        '<h2>🛠️ Placer le décor</h2>' +
        '<div>Glisse un objet pour le déplacer : décor, mais aussi maisons, chantiers, boutiques, montagnes, ferme, jardin, fontaine (ils bougent d\'un bloc). Glisse le fond (ou les flèches) pour te promener. Molette = zoom. Sous chaque objet, sa vraie place : <b style="color:#43a047">verte</b> = bien, <b style="color:#e53935">rouge</b> = il gêne.</div>' +
        '<div class="row">' + places.map(function(pl, i) { return '<button data-go="' + i + '">' + pl[0] + '</button>'; }).join('') + '</div>' +
        '<div class="row"><button data-z="-">➖ Zoom</button><button data-z="+">➕ Zoom</button></div>' +
        '<div><b>Ajouter</b> (au centre de l\'écran) :</div><div class="row pal" id="admin-pal"></div>' +
        '<div class="row"><button id="admin-del">🗑️ Supprimer l\'objet choisi (Suppr)</button></div>' +
        '<div id="admin-count"></div>' +
        '<div class="row"><button class="go" id="admin-save">✅ Valider et envoyer</button></div>' +
        '<div class="row"><button id="admin-random">🎲 Revenir au décor au hasard</button></div>' +
        (params.has('dev2d') ? '<div class="row"><a href="./?admin" style="font-size:13px;color:#5b7d4c">🧊 Passer en vue 3D (vrais objets)</a></div>' : '<div class="row"><a href="./?dev2d&admin" style="font-size:13px;color:#5b7d4c">🗺️ Passer en vue 2D (ordinateur lent)</a></div>') +
        '<div id="admin-status"></div>';
    document.body.appendChild(p);
    p.addEventListener('click', function(e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.go !== undefined) { var pl = places[+b.dataset.go]; Game.player.teleport(pl[1], pl[2]); }
        if (b.dataset.z) setZoom(A.zoom * (b.dataset.z === '+' ? 1.25 : 0.8));
        if (b.dataset.add !== undefined) addItem(A.palette[+b.dataset.add]);
        if (b.id === 'admin-del') deleteSel();
        if (b.id === 'admin-save') save(false);
        if (b.id === 'admin-random' && confirm('Tout remettre comme au départ (décor au hasard, bâtiments à leur place d\'origine) ?')) save(true);
    });
    // Palette : un bouton par sorte d'objet présent sur la carte
    var seen = {};
    Game.decorLayout.snapshot().items.forEach(function(it) {
        var k = it.c + '|' + (it.h || '🌳') + '|' + (it.k || '');
        if (seen[k]) return;
        seen[k] = 1;
        A.palette.push(it);
    });
    document.getElementById('admin-pal').innerHTML = A.palette.map(function(it, i) {
        var lab = it.k === 'hay' ? '<span style="font-size:14px">Botte de foin</span>' : it.k === 'tractor' ? '🚜' : (it.h || (/forest/.test(it.c) ? '🌲' : '🌳'));
        return '<button data-add="' + i + '" title="' + (it.k || it.c) + '">' + lab + '</button>';
    }).join('');
}

function setZoom(z) {
    A.zoom = Math.max(0.15, Math.min(1.5, z));
    if (is3d()) { Game.adminZoom = 1; Game.r3d.viewZoom = Math.max(0.6, Math.min(4, 1 / A.zoom)); }   // 3D : la caméra recule
    else Game.adminZoom = A.zoom;                                                                       // 2D : la carte rétrécit
}
function status(t, bad) {
    var s = document.getElementById('admin-status');
    if (s) { s.textContent = t; s.className = bad ? 'warn' : ''; }
}

// Objets qui en touchent un autre (ou l'eau, un chemin...) : entourés en rouge
function refresh() {
    var bad = 0, list = Game.decorLayout.editable();
    list.forEach(function(el) {
        var ok = Game.placement.isFree(el);
        el.classList.toggle('admin-bad', !ok);
        if (!ok) bad++;
        mark(el, ok);
    });
    // Les grands éléments aussi : une maison posée sur la rivière ou sur un autre bâtiment est signalée
    placeEls().forEach(function(el) {
        if (!Game.placement.footprint(el)) return;
        var ok = Game.placement.isFree(el);
        el.classList.toggle('admin-bad', !ok);
        if (!ok) bad++;
        mark(el, ok);
    });
    var c = document.getElementById('admin-count');
    if (c) c.innerHTML = list.length + ' objets • ' + (bad ? '<span class="warn">' + bad + ' mal placés (en rouge)</span>' : 'tout est bien placé ✔');
    if (Game.placement.refreshObstacles) Game.placement.refreshObstacles();
    return bad;
}

// 3D : zone au sol sous chaque objet (sa vraie place) : verte, rouge s'il gêne, bleue s'il est choisi
function mark(el, ok) {
    if (!is3d()) return;
    if (ok === undefined) ok = !el.classList.contains('admin-bad');
    Game.r3d.adminMark(el, Game.placement.footprint(el), el === A.sel ? 'sel' : (ok ? 'ok' : 'bad'));
}
function select(el) {
    var old = A.sel;
    if (A.sel) A.sel.classList.remove('admin-sel');
    A.sel = el;
    if (el) el.classList.add('admin-sel');
    if (old) mark(old);
    if (el) mark(el);
}
function addItem(it) {
    if (!it) return;
    var c = Game.state.charlie;
    select(Game.decorLayout.create(Object.assign({}, it, { x: Math.round(c.visualX), y: Math.round(c.visualY) })));
    refresh();
}
function deleteSel() {
    if (!A.sel) { status('Clique d\'abord sur un objet'); return; }
    if (isGroup(A.sel)) { status('Les maisons, boutiques, montagnes, la ferme et le jardin ne se suppriment pas : déplace-les.', true); return; }
    if (is3d()) Game.r3d.adminMark(A.sel, null, null);
    A.sel.remove(); A.sel = null; refresh();
}

// ── Souris / doigt : glisser un objet, ou glisser le fond pour se déplacer ──
function worldPoint(e) {
    if (is3d()) return Game.r3d.groundPx(e.clientX, e.clientY) || { x: 0, y: 0 };
    var r = document.getElementById('game-world').getBoundingClientRect();
    return { x: (e.clientX - r.left) / A.zoom, y: (e.clientY - r.top) / A.zoom };
}
function hit(e) {
    var all = Game.decorLayout.editable().concat(placeEls());
    if (is3d()) return Game.r3d.pick(e.clientX, e.clientY, all);
    var best = null, area = Infinity;
    all.forEach(function(el) {
        var r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && r.width * r.height < area) { best = el; area = r.width * r.height; }
    });
    return best;
}
function active(e) { return document.body.classList.contains('admin-mode') && !(e.target.closest && e.target.closest('#admin-panel')); }
window.addEventListener('pointerdown', function(e) {
    if (!active(e)) return;
    e.preventDefault(); e.stopPropagation();
    var el = hit(e), p = worldPoint(e);
    if (isGroup(el)) {   // grand élément : tout le groupe bouge ensemble
        select(el);
        var tag = el.dataset.place, els = groupEls(tag);
        A.drag = { group: tag, els: els, start: p, from: els.map(function(g) { return { x: parseFloat(g.style.left) || 0, y: parseFloat(g.style.top) || 0 }; }), dx: 0, dy: 0 };
    } else if (el) {
        select(el);
        A.drag = { el: el, dx: p.x - parseFloat(el.style.left), dy: p.y - parseFloat(el.style.top) };
    } else {
        select(null);
        A.drag = { pan: true, x: e.clientX, y: e.clientY };
    }
}, true);
window.addEventListener('pointermove', function(e) {
    if (!A.drag) return;
    e.preventDefault(); e.stopPropagation();
    if (A.drag.pan) {
        var c = Game.state.charlie;
        if (is3d()) {
            // le point du sol attrapé reste sous la souris
            var a = Game.r3d.groundPx(A.drag.x, A.drag.y), b = Game.r3d.groundPx(e.clientX, e.clientY);
            if (a && b) Game.player.teleport(c.x - (b.x - a.x), c.y - (b.y - a.y));
        } else Game.player.teleport(c.x - (e.clientX - A.drag.x) / A.zoom, c.y - (e.clientY - A.drag.y) / A.zoom);
        A.drag.x = e.clientX; A.drag.y = e.clientY;
    } else if (A.drag.group) {
        var q = worldPoint(e), d = A.drag;
        d.dx = Math.round(q.x - d.start.x); d.dy = Math.round(q.y - d.start.y);
        d.els.forEach(function(g, i) {
            g.style.left = (d.from[i].x + d.dx) + 'px'; g.style.top = (d.from[i].y + d.dy) + 'px';
            if (is3d()) { Game.r3d.syncNow(g); if (Game.placement.footprint(g)) mark(g); }
        });
    } else {
        var p = worldPoint(e);
        A.drag.el.style.left = Math.round(p.x - A.drag.dx) + 'px';
        A.drag.el.style.top = Math.round(p.y - A.drag.dy) + 'px';
        if (is3d()) { Game.r3d.syncNow(A.drag.el); mark(A.drag.el); }
    }
}, true);
window.addEventListener('pointerup', function(e) {
    if (!A.drag) return;
    e.stopPropagation();
    var moved = !A.drag.pan, d = A.drag;
    A.drag = null;
    if (d.group && (d.dx || d.dy)) {   // nouvelle position de référence du grand élément
        var cur = Game.decorLayout.placeXY(d.group);
        if (cur) { Game.decorLayout.setPlace(d.group, cur.x + d.dx, cur.y + d.dy); A.places[d.group] = Game.decorLayout.placeXY(d.group); }
        status('📦 ' + d.group.replace('loc:', '').replace('house:', 'maison ') + ' déplacé');
    }
    if (moved) refresh();
}, true);
window.addEventListener('click', function(e) { if (active(e)) { e.stopPropagation(); e.preventDefault(); } }, true);
window.addEventListener('wheel', function(e) {
    if (!active(e)) return;
    e.preventDefault();
    setZoom(A.zoom * (e.deltaY < 0 ? 1.1 : 0.9));
}, { passive: false });
window.addEventListener('keydown', function(e) {
    if (!document.body.classList.contains('admin-mode')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && A.sel) { e.preventDefault(); deleteSel(); }
}, true);

// ── Valider : envoie la liste au serveur ; Claude la met ensuite en ligne ──
function save(random) {
    var bad = random ? 0 : refresh();
    if (bad && !confirm(bad + ' objet(s) sont mal placés (en rouge). Envoyer quand même ?')) return;
    var layout = random ? { version: 2, items: [], places: {} } : Game.decorLayout.snapshot();
    if (!random) layout.places = A.places;
    status('Envoi…');
    api('POST', 'layout', { layout: layout }).then(function(r) {
        if (r.status === 200) status('✅ Validé et enregistré (' + layout.items.length + ' objets). Dis à Claude « c\'est validé » pour la mise en ligne.');
        else if (r.status === 401) { status('Mot de passe refusé', true); setTimeout(function() { location.href = 'admin.html'; }, 1200); }
        else status('⚠️ Erreur du serveur (' + r.status + ')', true);
    }).catch(function() { status('⚠️ Serveur admin injoignable', true); });
}

})();
