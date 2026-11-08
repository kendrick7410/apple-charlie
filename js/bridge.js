// ── bridge.js ── Le pont du torrent (Prairie aux Lucioles) et le carnet du village ──
// Le torrent de l'est a trop de courant pour nager : on ne le traverse que par le pont, une fois réparé.
// Le carnet du village (bouton 📒) liste les grands projets : pont, grand port, vieux bateau.
(function(){
"use strict";

Game.bridge = {};
var COST = { wood: 15, stone: 10, money: 150 };
var HALF_LEN = 150, HALF_W = 46;   // le tablier : de la route d'un côté à la route de l'autre

function B() { return Game.CONFIG.LOCATIONS.bridge; }
Game.bridge.fixed = function() { return !!Game.state.bridgeFixed; };
// Sur le tablier du pont (de berge à berge)
Game.bridge.onDeck = function(x, y) { var b = B(); return Math.abs(x - b.x) < HALF_LEN && Math.abs(y - b.y) < HALF_W; };
// Dans l'eau du torrent (le lit fait 150 px de large ; petite marge pour les pieds)
function inTorrent(x, y) { return y < Game.CONFIG.SEA_TOP + 100 && Math.abs(x - Game.torrentX(y)) < 88; }
Game.bridge.inTorrent = inTorrent;

Game.bridge.init = function() {
    var w = document.getElementById('game-world'), old = document.getElementById('bridge');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'bridge';
    el.className = 'entity torrent-bridge' + (Game.bridge.fixed() ? ' fixed' : '');
    el.style.left = B().x + 'px'; el.style.top = B().y + 'px';
    w.appendChild(el);
    // Panneau d'action (s'empile avec les autres en bas à droite)
    if (!document.getElementById('action-bridge')) {
        var p = document.createElement('div');
        p.id = 'action-bridge';
        p.style.cssText = 'position:fixed;bottom:80px;right:10px;z-index:1000;display:none;flex-direction:column;gap:6px;';
        p.innerHTML = '<div class="ui-card" style="padding:10px;max-width:250px;">' +
            '<div style="font-size:0.85rem;font-weight:bold;color:#5d4037;margin-bottom:4px;">🌉 Le vieux pont du torrent</div>' +
            '<div style="font-size:0.72rem;margin-bottom:6px;">Le pont est cassé ! De l\'autre côté : la <b>Prairie aux Lucioles</b>, ses papillons rares, ses arbres fruitiers et le <b>refuge des animaux</b> 🐶🐱🐹.</div>' +
            '<div id="bridge-cost" style="font-size:0.78rem;margin-bottom:6px;"></div>' +
            '<button id="bridge-btn" class="btn-animal" style="background:#8d6e63;box-shadow:0 4px 0 #6d4c41;width:100%;">Réparer le pont 🔨</button></div>';
        document.body.appendChild(p);
        document.getElementById('bridge-btn').onclick = function() { Game.bridge.repair(); };
    }
};

function costHtml() {
    var inv = Game.state.inventory, E = { wood: '🪵', stone: '🪨', money: '💰' };
    return Object.keys(COST).map(function(k) {
        var have = inv[k] || 0, ok = have >= COST[k];
        return '<span style="margin-right:8px;color:' + (ok ? '#2e7d32' : '#c62828') + '">' + E[k] + ' ' + Math.min(have, COST[k]) + '/' + COST[k] + (ok ? ' ✔' : '') + '</span>';
    }).join('');
}
Game.bridge.update = function() {
    var s = Game.state, p = document.getElementById('action-bridge');
    if (!p) return;
    var near = s.currentView === 'world' && !Game.bridge.fixed() && Math.hypot(s.charlie.x - (B().x - 200), s.charlie.y - B().y) < 230;
    p.style.display = near ? 'flex' : 'none';
    if (near) document.getElementById('bridge-cost').innerHTML = costHtml();
};

Game.bridge.repair = function() {
    var s = Game.state, inv = s.inventory;
    for (var k in COST) if ((inv[k] || 0) < COST[k]) { Game.ui.notify('Il manque encore des matériaux pour réparer le pont 🌉'); Game.audio.play('error'); return; }
    for (var k2 in COST) inv[k2] -= COST[k2];
    s.bridgeFixed = true;
    var el = document.getElementById('bridge'); if (el) el.classList.add('fixed');
    Game.audio.play('craft'); setTimeout(function() { if (Game.audio.playLevelUp) Game.audio.playLevelUp(); }, 400);
    Game.particles.spawnWorld('🔨', B().x, B().y, { count: 8, spread: 80 });
    if (Game.particles.confetti) Game.particles.confetti();
    Game.xp.add(80);
    Game.ui.update();
    Game.ui.notify('🌉 Le pont est réparé ! Traverse le torrent : la Prairie aux Lucioles et le refuge des animaux t\'attendent 🐶🐱🐹');
    document.getElementById('action-bridge').style.display = 'none';
    Game.saveGame();
};

// Garde-fou : Charlie n'entre jamais dans le torrent (seulement sur le pont réparé)
var _warnT = 0;
Game.bridge.guard = function(px, py) {
    var c = Game.state.charlie;
    var ok = !inTorrent(c.x, c.y) || (Game.bridge.fixed() && Game.bridge.onDeck(c.x, c.y));
    if (ok) return;
    if (inTorrent(px, py) && !(Game.bridge.fixed() && Game.bridge.onDeck(px, py))) return;   // déjà dans l'eau (ancienne partie) : on le laisse sortir
    c.x = px; c.y = py;
    var now = performance.now();
    if (now - _warnT > 4000) {
        _warnT = now;
        Game.ui.notify(Game.bridge.fixed() ? '🌊 Trop de courant ! Passe par le pont 🌉' : '🌊 Le courant du torrent est bien trop fort pour nager… Il faut réparer le pont 🌉');
    }
};

// ═══════════════════════ Carnet du village ═══════════════════════
var PROJECTS = [
    { icon: '🌉', name: 'Réparer le pont du torrent', where: 'Au bout de la route de la ferme, à l\'est', done: function() { return Game.bridge.fixed(); },
      what: 'Ouvre la Prairie aux Lucioles et le refuge des animaux', cost: COST },
    { icon: '⚓', name: 'Agrandir le port', where: 'Au port, sur la plage', done: function() { return !!Game.state.portBig; },
      what: 'Un grand port avec des quais, des bateaux de pêche et un phare', cost: { wood: 25, stone: 15, materials: 10, money: 300 } },
    { icon: '⛵', name: 'Réparer le vieux bateau', where: 'Le bateau échoué sur la plage, à gauche du port', done: function() { return !!Game.state.boatFixed; },
      what: 'Navigue jusqu\'à l\'île secrète… et son trésor', cost: { wood: 20, materials: 5, money: 200 } }
];
Game.bridge.toggleCarnet = function() {
    var old = document.getElementById('carnet-panel');
    if (old) { old.remove(); return; }
    var p = document.createElement('div'), E = { wood: '🪵', stone: '🪨', materials: '🧱', money: '💰' };
    p.id = 'carnet-panel';
    p.innerHTML = '<div class="controls-card" style="max-width:460px"><button class="controls-close" aria-label="Fermer">✕</button>' +
        '<h2>📒 Carnet du village</h2><p class="controls-intro">Les grands projets du village, un par un.</p>' +
        PROJECTS.map(function(pr, i) {
            var done = pr.done(), locked = !done && i > 0 && !PROJECTS[i - 1].done();
            var cost = pr.cost ? Object.keys(pr.cost).map(function(k) { return pr.cost[k] + ' ' + E[k]; }).join(' · ') : '';
            return '<section class="ctrl-sec" style="opacity:' + (locked ? 0.55 : 1) + '"><h3>' + (done ? '✅' : locked ? '🔒' : pr.icon) + ' ' + pr.name + '</h3>' +
                '<div style="font-size:.92rem">' + pr.what + '</div>' +
                '<div style="font-size:.85rem;color:#8a7a66;margin-top:4px">📍 ' + pr.where + (cost && !done ? ' · ' + cost : '') + (pr.soon && !done ? ' · bientôt' : '') + '</div></section>';
        }).join('') + '</div>';
    p.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(70,60,35,.28);display:flex;align-items:center;justify-content:center;padding:16px;';
    p.onclick = function(e) { if (e.target === p || e.target.classList.contains('controls-close')) p.remove(); };
    document.body.appendChild(p);
};

})();
