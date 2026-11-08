// ── plaza.js ── Grande place du village : bancs, lampadaires, guirlandes en cercle, anniversaires ──
// Les objets de la place sont des éléments .plaza-deco (data-kind = bench | lamp | pole | party) :
// la 3D les dessine (render3d.js), ils sont solides (personne ne passe à travers) et posés seulement là où il y a de la place.
(function(){
"use strict";

Game.plaza = {};

function world() { return document.getElementById('game-world'); }
// Centre réel de la fontaine (là où elle est dessinée), sinon sa position de référence
function fountain() {
    var el = document.getElementById('fountain-anchor'), fp = el && Game.placement.footprint(el);
    return fp && !fp.rect ? { x: fp.x, y: fp.y } : Game.CONFIG.LOCATIONS.fountain;
}
Game.plaza.center = fountain;
function free(x, y, r) { return !(Game.placement && Game.placement.blocked && Game.placement.blocked(x, y, r, { water: true })); }
function deco(kind, x, y, extra) {
    var el = document.createElement('div');
    el.className = 'entity plaza-deco';
    el.dataset.kind = kind;
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    if (extra) Object.keys(extra).forEach(function(k) { el.dataset[k] = extra[k]; });
    world().appendChild(el);
    if (Game.placement.refreshObstacles) Game.placement.refreshObstacles();
    return el;
}

// Bâtiments autour de la place : maisons construites, boutiques, maison de Charlie (point devant la porte)
function buildingsAround() {
    var F = fountain(), L = Game.CONFIG.LOCATIONS, out = [];
    (Game.HOUSES || []).forEach(function(h) {
        if (h.id !== 'charlie' && !Game.buildings.isHouseBuilt(h.id)) return;
        var p = h.id === 'charlie' ? L.charlieHouse : h;
        out.push({ x: p.x, y: p.y + 50 });
    });
    (Game.SHOPS || []).forEach(function(sh) {
        var loc = L[sh.loc]; if (!loc || (Game.state.builtShops || []).indexOf(sh.id) === -1) return;
        out.push({ x: loc.x, y: loc.y });
    });
    return out.filter(function(b) { var d = Math.hypot(b.x - F.x, b.y - F.y); return d > 120 && d < 620; });
}

// Mâts des guirlandes : un devant chaque bâtiment, du côté de la place, là où il y a de la place
Game.plaza.placePoles = function() {
    world().querySelectorAll(':scope > .plaza-deco[data-kind="pole"]').forEach(function(el) { el.remove(); });
    if (Game.placement.refreshObstacles) Game.placement.refreshObstacles();
    var F = fountain(), list = [];
    buildingsAround().forEach(function(b) {
        var dx = F.x - b.x, dy = F.y - b.y, d = Math.hypot(dx, dy); dx /= d; dy /= d;
        for (var k = 70; k <= 170; k += 20) {          // on avance vers la fontaine jusqu'à trouver une place libre
            var x = b.x + dx * k, y = b.y + dy * k;
            if (free(x, y, 14)) { list.push({ x: x, y: y, a: Math.atan2(y - F.y, x - F.x) }); break; }
        }
    });
    list.sort(function(p, q) { return p.a - q.a; });
    list.forEach(function(p, i) { deco('pole', p.x, p.y, { order: i }); });
};

// Bancs (tournés vers la fontaine) et lampadaires au bord de la place
function placeFurniture() {
    var F = fountain(), R = (Game.CONFIG.PLAZA_R || 250) - 40;
    for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2 + Math.PI / 8, x = F.x + Math.cos(a) * R, y = F.y + Math.sin(a) * R;
        var kind = i % 2 ? 'lamp' : 'bench';
        if (!free(x, y, kind === 'bench' ? 40 : 14)) continue;
        deco(kind, x, y, { rot: Math.atan2(F.x - x, F.y - y).toFixed(3) });
    }
}

Game.plaza.init = function() {
    world().querySelectorAll(':scope > .plaza-deco').forEach(function(el) { el.remove(); });
    party = null;
    placeFurniture();
    Game.plaza.placePoles();
};

// ═══════════════════════ Anniversaires ═══════════════════════
// Un habitant par jour, à tour de rôle (cycle de 8 jours de jeu : 6 anniversaires puis 2 jours sans)
var BDAY = ['Eloise 🐰', 'Lea 🐱', 'Tom 🐶', 'Lucie 🦊', 'Ordralfabétix 🐡', 'Max 🐕'];
Game.plaza.birthdayToday = function() {
    var s = Game.state, name = BDAY[(s.dayNumber || 0) % 8];
    if (!name || !s.villagers.some(function(v) { return v.name === name; })) return null;
    return name;
};
Game.plaza.isBirthday = function(name) { return Game.plaza.birthdayToday() === name; };
Game.plaza.daysUntil = function(name) {   // dans combien de jours (0 = aujourd'hui)
    var i = BDAY.indexOf(name); if (i < 0) return null;
    return (i - (Game.state.dayNumber || 0) % 8 + 8) % 8;
};

var party = null, partySpot = null;
function partyActive() { var h = Game.state.gameHour; return !!Game.plaza.birthdayToday() && h >= 9 && h < 20; }
function findPartySpot() {
    var F = fountain();
    for (var r = 150; r <= 230; r += 20) for (var k = 0; k < 12; k++) {
        var a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35, x = F.x + Math.cos(a) * r, y = F.y + Math.sin(a) * r;
        if (free(x, y, 48) && free(x - 90, y - 30, 16)) return { x: x, y: y };
    }
    return { x: F.x, y: F.y + 160 };
}
// Où l'habitant fêté attend : une place LIBRE au sol à côté de sa table (point des pieds) ; null s'il n'y a pas de fête
var standSpot = null;
function findStand() {
    for (var r = 72; r <= 130; r += 12) for (var k = 0; k < 16; k++) {
        var a = Math.PI + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4, x = partySpot.x + Math.cos(a) * r, y = partySpot.y + Math.sin(a) * r;
        if (free(x, y, 18)) return { x: x, y: y };
    }
    return { x: partySpot.x - 100, y: partySpot.y };
}
Game.plaza.partyTarget = function(name) {
    if (!party || !Game.plaza.isBirthday(name)) return null;
    if (!standSpot) standSpot = findStand();
    return standSpot;   // point au sol (les pieds)
};

Game.plaza.update = function() {
    var s = Game.state, name = Game.plaza.birthdayToday();
    if (name && s.bdayAnnounced !== s.dayNumber) {
        s.bdayAnnounced = s.dayNumber;
        Game.ui.notify('🎂 C\'est l\'anniversaire de ' + name.split(' ')[0] + ' aujourd\'hui ! Fête sur la place. Un cadeau compte double, et un gâteau 🎂, c\'est encore mieux !');
    }
    var on = partyActive();
    if (on && !party) {
        partySpot = findPartySpot();
        party = deco('party', partySpot.x, partySpot.y, { rot: '0' }); standSpot = null;
        // Celui qui habite loin (le refuge) descend directement pour la fête
        var v = s.villagers.find(function(vl) { return vl.name === name; });
        if (v && Math.hypot(v.x - partySpot.x, v.y - partySpot.y) > 900) { v.x = partySpot.x - 160; v.y = partySpot.y + 40; v.el.style.left = v.x + 'px'; v.el.style.top = v.y + 'px'; }
    } else if (!on && party) {
        party.remove(); party = null; standSpot = null;
        if (Game.placement.refreshObstacles) Game.placement.refreshObstacles();
    }
};

})();
