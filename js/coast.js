// ── coast.js ── Mer & plage, animaux mer/montagne à collectionner, port & bateaux ──
(function(){
"use strict";

Game.coast = {};

var sea = [];     // animaux de la mer posés sur la plage
var mtn = [];     // animaux de la montagne
var boats = [];   // bateaux de marchandise
var crates = [];  // caisses déposées au port
var boatTimer = 0;

var SEA_TARGET = 9;   // combien d'animaux de mer en même temps
var MTN_TARGET = 7;   // combien d'animaux de montagne en même temps

function pickWeighted(table) {
    var total = 0, ids = [];
    for (var id in table) { ids.push(id); total += table[id].weight; }
    var r = Math.random() * total;
    for (var i = 0; i < ids.length; i++) { r -= table[ids[i]].weight; if (r <= 0) return ids[i]; }
    return ids[ids.length - 1];
}

function makeEntity(emoji, x, y, cls, fontSize, rarity) {
    var el = document.createElement('div');
    el.className = 'entity ' + cls;
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontSize = fontSize || '2rem';
    el.style.zIndex = '14';
    if (rarity) el.style.filter = 'drop-shadow(0 0 5px ' + (Game.RARITY_COLORS[rarity] || '#fff') + ')';
    el.textContent = emoji;
    document.getElementById('game-world').appendChild(el);
    return el;
}

function spawnSeaCreature() {
    var id = pickWeighted(Game.SEA_SPECIES);
    var sp = Game.SEA_SPECIES[id];
    var x = 320 + Math.random() * (Game.CONFIG.WORLD_W - 640);
    // sur le sable, au-dessus du bord de l'eau (côte courbe)
    var shore = Game.world.shorelineY ? Game.world.shorelineY(x) : Game.CONFIG.SEA_TOP;
    var y = (Game.CONFIG.BEACH_TOP + 70) + Math.random() * Math.max(60, (shore - 90) - (Game.CONFIG.BEACH_TOP + 70));
    var el = makeEntity(sp.emoji, x, y, 'sea-creature', '1.9rem', sp.rarity);
    sea.push({ el: el, x: x, y: y, id: id });
}

function mtnCenters() {
    var L = Game.CONFIG.LOCATIONS;
    return [
        L.mountain, L.mountain2, L.mountain3, L.mountain4,
        { x: 2700, y: 760 }, { x: 4320, y: 800 }, { x: 2720, y: 1380 },
        { x: 4300, y: 1380 }, { x: 3500, y: 360 }
    ];
}

function spawnMtnAnimal() {
    var id = pickWeighted(Game.MOUNTAIN_SPECIES);
    var sp = Game.MOUNTAIN_SPECIES[id];
    var c = mtnCenters()[Math.floor(Math.random() * 4)];
    var x = Math.max(2700, Math.min(Game.CONFIG.WORLD_W - 100, c.x + (Math.random() - 0.5) * 520));
    var y = Math.max(280, Math.min(2050, c.y + (Math.random() - 0.5) * 420));
    var el = makeEntity(sp.emoji, x, y, 'mtn-animal', '2.4rem', sp.rarity);
    if (sp.sprite) { el.textContent = ''; el.innerHTML = sp.sprite; }
    mtn.push({ el: el, x: x, y: y, id: id, vx: (Math.random() - 0.5) * 1.1, vy: (Math.random() - 0.5) * 1.1, t: 0 });
}

Game.coast.init = function() {
    [sea, mtn, boats, crates].forEach(function(arr){ arr.forEach(function(o){ if (o.el) o.el.remove(); }); });
    sea = []; mtn = []; boats = []; crates = []; boatTimer = 0;
    for (var i = 0; i < SEA_TARGET; i++) spawnSeaCreature();
    for (var j = 0; j < MTN_TARGET; j++) spawnMtnAnimal();
};

function collectCreature(kind, arr, idx, collectionKey) {
    var item = arr[idx];
    var table = (kind === 'sea') ? Game.SEA_SPECIES : Game.MOUNTAIN_SPECIES;
    var sp = table[item.id];
    var s = Game.state;
    var coll = s[collectionKey];
    var isNew = !coll[item.id];
    coll[item.id] = (coll[item.id] || 0) + 1;
    s.inventory.money += sp.value;
    Game.xp.add(Math.max(3, Math.floor(sp.value / 4)));
    Game.audio.playChime();
    Game.particles.spawnWorld(sp.emoji, item.x, item.y, { count: 3, spread: 20 });
    if (item.el) item.el.remove();
    arr.splice(idx, 1);
    Game.ui.update();
    if (Game.ui.updateCollections) Game.ui.updateCollections();
    var tag = { common: '', uncommon: '✨', rare: '💎', legendary: '👑' };
    Game.ui.notify((isNew ? 'NOUVEAU ! ' : '') + sp.name + ' ' + sp.emoji + ' ' + (tag[sp.rarity] || '') + ' +' + sp.value + '💰');
}

// ── Bateaux de marchandise ──
function spawnBoat() {
    var port = Game.CONFIG.LOCATIONS.port;
    var startY = Game.CONFIG.WORLD_H + 80;
    var shore = Game.world.shorelineY ? Game.world.shorelineY(port.x) : port.y + 400;
    var el = makeEntity('⛴️', port.x - 30, startY, 'cargo-boat', '4rem');
    el.style.zIndex = '6';
    // Le bateau s'arrête dans l'eau, au bout du ponton
    boats.push({ el: el, x: port.x - 30, y: startY, dockY: shore + 120, phase: 'in', wait: 0 });
    Game.ui.notify("⛴️ Un bateau de marchandise arrive au port !");
}

function dropCrate() {
    var port = Game.CONFIG.LOCATIONS.port;
    var x = port.x + (Math.random() - 0.5) * 120;
    var y = port.y + 70 + Math.random() * 80;
    var el = makeEntity('📦', x, y, 'cargo-crate', '2.4rem');
    crates.push({ el: el, x: x, y: y, mats: 2 + Math.floor(Math.random() * 3), wood: 3 + Math.floor(Math.random() * 4) });
}

function updateBoats(dt) {
    boatTimer += dt;
    if (boats.length === 0 && boatTimer > Game.CONFIG.BOAT_INTERVAL) {
        boatTimer = 0;
        spawnBoat();
    }
    var step = 0.9 * (dt / 16);
    for (var i = boats.length - 1; i >= 0; i--) {
        var b = boats[i];
        if (b.phase === 'in') {
            b.y -= step;
            if (b.y <= b.dockY) { b.y = b.dockY; b.phase = 'unload'; b.wait = 0; dropCrate(); }
        } else if (b.phase === 'unload') {
            b.wait += dt;
            if (b.wait > 4000) b.phase = 'out';
        } else {
            b.y += step;
            if (b.y > Game.CONFIG.WORLD_H + 120) { b.el.remove(); boats.splice(i, 1); }
        }
        b.el.style.top = b.y + 'px';
    }
}

Game.coast.update = function(dt) {
    var s = Game.state;
    if (s.currentView !== 'world') return;
    var cx = s.charlie.x, cy = s.charlie.y;

    // Animaux de mer : on les ramasse en marchant dessus
    for (var i = sea.length - 1; i >= 0; i--) {
        if (Math.hypot(cx - sea[i].x, cy - sea[i].y) < 70) collectCreature('sea', sea, i, 'seaCollection');
    }
    while (sea.length < SEA_TARGET) spawnSeaCreature();

    // Animaux de montagne : ils se baladent lentement, on les ramasse en marchant dessus
    for (var k = mtn.length - 1; k >= 0; k--) {
        var a = mtn[k];
        a.t += dt;
        if (a.t > 1600) { a.t = 0; a.vx = (Math.random() - 0.5) * 1.1; a.vy = (Math.random() - 0.5) * 1.1; }
        a.x += a.vx; a.y += a.vy;
        a.el.style.left = a.x + 'px';
        a.el.style.top = a.y + 'px';
        if (Math.hypot(cx - a.x, cy - a.y) < 78) collectCreature('mtn', mtn, k, 'mountainCollection');
    }
    while (mtn.length < MTN_TARGET) spawnMtnAnimal();

    // Bateaux + caisses de marchandise
    updateBoats(dt);
    for (var c = crates.length - 1; c >= 0; c--) {
        if (Math.hypot(cx - crates[c].x, cy - crates[c].y) < 78) {
            s.inventory.materials += crates[c].mats;
            s.inventory.wood += crates[c].wood;
            Game.audio.play('collect');
            Game.particles.spawnWorld('📦', crates[c].x, crates[c].y, { count: 4, spread: 30 });
            Game.ui.notify("Marchandise récupérée : +" + crates[c].mats + "🧱 +" + crates[c].wood + "🪵");
            crates[c].el.remove();
            crates.splice(c, 1);
            Game.ui.update();
        }
    }
};

})();
