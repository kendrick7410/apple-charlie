// ── harbor.js ── Grand port, phare, vieux bateau et île secrète (étape 4 du carnet du village) ──
// 1) « Agrandir le port » : deux quais en plus, bateaux de pêche amarrés, phare (sa lumière tourne la nuit).
// 2) « Réparer le vieux bateau » : l'épave de la plage devient un voilier amarré au grand port.
// 3) Le voilier emmène Charlie sur l'île secrète (on ne peut ni y aller ni en partir à la nage).
(function(){
"use strict";

Game.harbor = {};
var PORT_COST = { wood: 25, stone: 15, materials: 10, money: 300 };
var BOAT_COST = { wood: 20, materials: 5, money: 200 };
var ISLAND = { x: 5300, y: 5760, r: 190 };
Game.harbor.ISLAND = ISLAND;

function L() { return Game.CONFIG.LOCATIONS; }
function world() { return document.getElementById('game-world'); }
function shore(x) { return Game.world.shorelineY ? Game.world.shorelineY(x) : 5500; }
function el(cls, x, y, html, extra) {
    var d = document.createElement('div');
    d.className = 'entity harbor-item ' + cls;
    d.style.left = Math.round(x) + 'px'; d.style.top = Math.round(y) + 'px';
    if (html) d.innerHTML = html;
    if (extra) Object.keys(extra).forEach(function(k) { d.dataset[k] = extra[k]; });
    world().appendChild(d);
    return d;
}
function dockRect(x, y, w, h) {   // planches de quai (même style que le ponton : la 3D les reconnaît)
    var d = document.createElement('div');
    d.dataset.harbor = '1';
    d.style.cssText = 'position:absolute;z-index:4;pointer-events:none;border-radius:8px;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;' +
        'background-image:repeating-linear-gradient(90deg, #a67c52, #a67c52 18px, #8b6544 18px, #8b6544 22px);';
    world().appendChild(d);
}

// Sur l'île (le sable) / près de l'île (dans la mer autour)
Game.harbor.onIsland = function(x, y) { return Math.hypot(x - ISLAND.x, y - ISLAND.y) < ISLAND.r - 12; };
function nearIsland(x, y) { return Math.hypot(x - ISLAND.x, y - ISLAND.y) < ISLAND.r + 260; }
function bigDockY() { return shore(L().port.x) + 120; }
function boatSpot() { return { x: L().port.x - 330, y: bigDockY() + 60 }; }

Game.harbor.init = function() {
    world().querySelectorAll('.harbor-item, [data-harbor]').forEach(function(n) { n.remove(); });
    var s = Game.state, P = L().port, dy = bigDockY();
    if (s.portBig) {
        dockRect(P.x - 360, dy - 35, 315, 70);   // quai ouest
        dockRect(P.x + 45, dy - 35, 315, 70);    // quai est
        el('fish-boat', P.x + 150, dy + 75, '', { rot: '0.1' });
        el('fish-boat', P.x + 290, dy + 80, '', { rot: '-0.15' });
        el('lighthouse', P.x + 520, shore(P.x + 520) - 40, '<div class="building-label">🗼 Phare</div>');
    }
    if (s.boatFixed && s.portBig) {
        var b = boatSpot();
        el('sail-boat', b.x, b.y, '<div class="building-label">⛵ Le Charlie</div>');
    } else {
        el('old-boat', P.x - 420, shore(P.x - 420) - 70, '<div class="building-label">Vieux bateau</div>');
    }
    buildIsland();
    ensurePanel();
};

// L'île : palmiers, coquillages géants, cabane de pêcheur, coffre au trésor, ponton d'arrivée
function buildIsland() {
    var I = ISLAND;
    [[-110, -60, 5], [90, -90, 5.4], [-40, 70, 4.6], [120, 40, 4.8]].forEach(function(p) {
        var palm = el('island-item', I.x + p[0], I.y + p[1], '🌴'); palm.style.fontSize = p[2] + 'rem';
    });
    [[-130, 40], [60, 110], [150, -20]].forEach(function(p, i) { el('island-item giant-shell', I.x + p[0], I.y + p[1], '', { n: i }); });
    el('island-item island-hut', I.x - 10, I.y - 110, '<div class="building-label">Cabane du vieux pêcheur</div>');
    el('island-item island-chest' + (Game.state.islandChest ? ' open' : ''), I.x + 30, I.y + 10, '');
    el('island-item island-dock', I.x - 120, I.y - I.r + 10, '');
}

// ── Panneau d'action unique (agrandir le port / réparer le bateau / naviguer / rentrer / coffre) ──
function ensurePanel() {
    if (document.getElementById('action-harbor')) return;
    var p = document.createElement('div');
    p.id = 'action-harbor';
    p.style.cssText = 'position:fixed;bottom:80px;right:10px;z-index:1000;display:none;flex-direction:column;gap:6px;';
    document.body.appendChild(p);
    p.addEventListener('click', function(e) {
        var b = e.target.closest('button[data-act]'); if (!b) return;
        ({ port: buildPort, boat: fixBoat, sail: sailToIsland, home: sailHome, chest: openChest })[b.dataset.act]();
    });
}
function costHtml(cost) {
    var inv = Game.state.inventory, E = { wood: '🪵', stone: '🪨', materials: '🧱', money: '💰' };
    return Object.keys(cost).map(function(k) {
        var have = inv[k] || 0, ok = have >= cost[k];
        return '<span style="margin-right:7px;color:' + (ok ? '#2e7d32' : '#c62828') + '">' + E[k] + ' ' + Math.min(have, cost[k]) + '/' + cost[k] + '</span>';
    }).join('');
}
function card(title, text, btn, act) {
    return '<div class="ui-card" style="padding:10px;max-width:260px;"><div style="font-size:0.85rem;font-weight:bold;color:#5d4037;margin-bottom:4px;">' + title + '</div>' +
        '<div style="font-size:0.72rem;margin-bottom:6px;">' + text + '</div>' +
        (btn ? '<button data-act="' + act + '" class="btn-animal" style="width:100%;background:#1e88e5;box-shadow:0 4px 0 #1565c0;">' + btn + '</button>' : '') + '</div>';
}
var _panelKey = '';
Game.harbor.update = function() {
    var s = Game.state, p = document.getElementById('action-harbor'); if (!p) return;
    var c = s.charlie, P = L().port, html = '', key = '';
    if (s.currentView === 'world') {
        if (Game.harbor.onIsland(c.x, c.y)) {
            if (!s.islandChest && Math.hypot(c.x - ISLAND.x - 30, c.y - ISLAND.y - 10) < 110) { key = 'chest'; html = card('🧰 Un vieux coffre !', 'Il est couvert de coquillages… On l\'ouvre ?', 'Ouvrir le coffre 🗝️', 'chest'); }
            else { key = 'home'; html = card('🏝️ L\'île secrète', 'Quand tu veux, ton voilier te ramène au port.', 'Rentrer au port ⛵', 'home'); }
        } else if (!s.portBig && Math.hypot(c.x - P.x, c.y - (P.y + 120)) < 260) {
            key = 'port' + costHtml(PORT_COST);
            html = Game.bridge && !Game.bridge.fixed() ? card('⚓ Agrandir le port', 'Projet du carnet 📒 : répare d\'abord le pont du torrent.', '', '')
                : card('⚓ Agrandir le port', 'Deux quais en plus, des bateaux de pêche et un phare !<br>' + costHtml(PORT_COST), 'Agrandir le port 🔨', 'port');
        } else if (!s.boatFixed && Math.hypot(c.x - (P.x - 420), c.y - (shore(P.x - 420) - 70)) < 200) {
            key = 'boat' + costHtml(BOAT_COST) + s.portBig;
            html = !s.portBig ? card('⛵ Un vieux bateau échoué', 'Il faudrait un grand port pour le remettre à l\'eau… (carnet 📒)', '', '')
                : card('⛵ Le vieux bateau', 'Répare-le pour naviguer jusqu\'à l\'île au loin…<br>' + costHtml(BOAT_COST), 'Réparer le bateau 🔨', 'boat');
        } else if (s.boatFixed && Math.hypot(c.x - boatSpot().x, c.y - (bigDockY() - 10)) < 170) {
            key = 'sail'; html = card('⛵ Le Charlie', 'Ton voilier est prêt. Direction : l\'île secrète !', 'Naviguer vers l\'île 🏝️', 'sail');
        }
    }
    if (key !== _panelKey) { _panelKey = key; p.innerHTML = html; }
    p.style.display = html ? 'flex' : 'none';
};

function pay(cost) {
    var inv = Game.state.inventory;
    for (var k in cost) if ((inv[k] || 0) < cost[k]) { Game.ui.notify('Il manque encore des matériaux 🧱'); Game.audio.play('error'); return false; }
    for (var k2 in cost) inv[k2] -= cost[k2];
    return true;
}
function celebrate(msg, xp) {
    Game.audio.play('craft'); setTimeout(function() { if (Game.audio.playLevelUp) Game.audio.playLevelUp(); }, 400);
    if (Game.particles.confetti) Game.particles.confetti();
    Game.xp.add(xp); Game.ui.update(); Game.ui.notify(msg);
    _panelKey = ''; Game.harbor.init(); Game.saveGame();
}
function buildPort() { if (!pay(PORT_COST)) return; Game.state.portBig = true; celebrate('⚓ Le grand port est construit : deux quais, des bateaux de pêche et un phare ! Prochain projet : le vieux bateau échoué sur la plage ⛵', 100); }
function fixBoat() { if (!pay(BOAT_COST)) return; Game.state.boatFixed = true; celebrate('⛵ Le vieux bateau est réparé et amarré au grand port ! Il s\'appelle « Le Charlie ». Monte à bord pour l\'île secrète 🏝️', 100); }

// Traversée : l'écran devient la mer, Charlie arrive au ponton de l'île (ou au port)
function voyage(toX, toY, msg) {
    var f = document.createElement('div');
    f.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#1e6fa8;opacity:0;transition:opacity .7s;display:flex;align-items:center;justify-content:center;color:#fff;font:bold 1.6rem "Varela Round",sans-serif;';
    f.textContent = '⛵ 🌊 🌊 🌊';
    document.body.appendChild(f);
    requestAnimationFrame(function() { f.style.opacity = '1'; });
    Game.audio.playChime();
    setTimeout(function() { Game.player.teleport(toX, toY); _panelKey = ''; }, 900);
    setTimeout(function() { f.style.opacity = '0'; Game.ui.notify(msg); }, 1700);
    setTimeout(function() { f.remove(); }, 2500);
}
function sailToIsland() { voyage(ISLAND.x - 110, ISLAND.y - ISLAND.r + 70, '🏝️ Bienvenue sur l\'île secrète ! Explore-la… quelque chose brille près des palmiers.'); }
function sailHome() { var b = boatSpot(); voyage(b.x + 40, bigDockY() - 10, '⚓ De retour au port !'); }

function openChest() {
    var s = Game.state;
    if (s.islandChest) return;
    s.islandChest = true;
    s.inventory.money += 500;
    s.pearl = true;
    var ch = document.querySelector('.island-chest'); if (ch) ch.classList.add('open');
    if (Game.particles.confetti) Game.particles.confetti();
    Game.particles.spawn('💰', window.innerWidth / 2, window.innerHeight / 2, { count: 10, spread: 120, vy: -120 });
    if (Game.audio.playCoin) Game.audio.playCoin();
    Game.xp.add(150); Game.ui.update();
    Game.ui.notify('🧰 Le trésor du vieux pêcheur : 500 clochettes et une perle rare 🦪✨ !');
    _panelKey = ''; Game.saveGame();
}

// Garde-fou : on ne nage ni vers l'île ni depuis l'île (il faut le voilier)
var _warnT = 0;
Game.harbor.guard = function(px, py) {
    var c = Game.state.charlie, was = Game.harbor.onIsland(px, py), now = Game.harbor.onIsland(c.x, c.y);
    var bad = (was && !now) || (!was && !now && nearIsland(c.x, c.y) && !nearIsland(px, py));
    if (!bad) return;
    c.x = px; c.y = py;
    if (performance.now() - _warnT > 4000) { _warnT = performance.now(); Game.ui.notify('🌊 Les vagues sont trop fortes par ici… Il faut un bateau ⛵'); }
};

})();
