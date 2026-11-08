// ── festivals.js ── Fêtes de saison : une petite chasse par saison, puis une décoration qui reste ──
// Printemps : 8 œufs décorés autour de la place → panier d'œufs géant sur la place
// Été : 6 grands coquillages sur la plage → château de sable géant
// Automne : 8 citrouilles près de la ferme → pyramide de citrouilles
// Hiver : 6 boules de neige sur la place → bonhomme de neige
// Une fête par saison (Game.state.seasonCount compte les saisons passées) ; tout est posé là où il y a de la place.
(function(){
"use strict";

Game.fest = {};
var FEST = {
    spring: { item: 'egg',      n: 8, name: 'la chasse aux œufs', icon: '🥚', trophy: 'eggbasket', reward: 150 },
    summer: { item: 'shell',    n: 6, name: 'le concours de châteaux de sable', icon: '🐚', trophy: 'castle', reward: 150 },
    autumn: { item: 'pumpkin',  n: 8, name: 'la récolte des citrouilles', icon: '🎃', trophy: 'pumpkins', reward: 150 },
    winter: { item: 'snowball', n: 6, name: 'la fête de la neige', icon: '❄️', trophy: 'snowman', reward: 150 }
};
function world() { return document.getElementById('game-world'); }
function key() { return Game.state.season + ':' + (Game.state.seasonCount || 0); }
function free(x, y, r) { return !(Game.placement.blocked(x, y, r, { water: true })); }
function center(season) {
    var L = Game.CONFIG.LOCATIONS;
    if (season === 'summer') return { x: L.beach.x, y: Game.CONFIG.BEACH_TOP + 260, rx: 1200, ry: 230 };
    if (season === 'autumn') return { x: L.farm.x, y: L.farm.y - 120, rx: 520, ry: 420 };
    var F = Game.plaza ? Game.plaza.center() : L.fountain;
    return { x: F.x, y: F.y, rx: 620, ry: 620 };
}
function deco(cls, kind, x, y) {
    var el = document.createElement('div');
    el.className = 'entity fest-item ' + cls;
    el.dataset.kind = kind;
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
    world().appendChild(el);
    return el;
}
var items = [], trophy = null, hud = null;

function clear() {
    world().querySelectorAll('.fest-item').forEach(function(e) { e.remove(); });
    items = []; trophy = null;
}
function spawnHunt(season) {
    var f = FEST[season], C = center(season), tries = 0;
    while (items.length < f.n && tries++ < 400) {
        var a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random());
        var x = C.x + Math.cos(a) * d * C.rx, y = C.y + Math.sin(a) * d * C.ry;
        if (Math.hypot(x - C.x, y - C.y) < 90 || !free(x, y, 22)) continue;
        if (items.some(function(o) { return Math.hypot(o.x - x, o.y - y) < 120; })) continue;
        items.push({ x: x, y: y, el: deco('fest-pick', f.item, x, y) });
    }
}
function placeTrophy(season) {
    var C = center(season), f = FEST[season];
    for (var r = 120; r <= 360; r += 30) for (var k = 0; k < 16; k++) {
        var a = k / 16 * Math.PI * 2 + 0.3, x = C.x + Math.cos(a) * r, y = C.y + Math.sin(a) * r * (season === 'summer' ? 0.6 : 1);
        if (free(x, y, 50)) { trophy = deco('fest-trophy', f.trophy, x, y); if (Game.placement.refreshObstacles) Game.placement.refreshObstacles(); return; }
    }
}
function done() { return (Game.state.festDone || {})[key()]; }

// Au lancement et à chaque nouvelle saison : la chasse (ou la décoration si elle est déjà faite)
Game.fest.start = function() {
    var s = Game.state; s.festDone = s.festDone || {};
    clear();
    if (done()) placeTrophy(s.season);
    else spawnHunt(s.season);
};
Game.fest.onSeasonChange = function() {
    Game.fest.start();
    var f = FEST[Game.state.season];
    if (!done()) Game.ui.notify(f.icon + ' C\'est ' + f.name + ' ! Trouve les ' + f.n + ' ' + f.icon + ' cachés' + (Game.state.season === 'summer' ? ' sur la plage' : Game.state.season === 'autumn' ? ' près de la ferme' : ' autour de la place') + '.');
};

Game.fest.update = function() {
    var s = Game.state, f = FEST[s.season];
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'fest-hud';
        hud.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(calc(-50% + 200px));z-index:1400;pointer-events:none;background:#fffdf6;border:3px solid #e8dcc0;border-radius:999px;padding:5px 14px;font:bold 14px "Varela Round",sans-serif;color:#4e342e;box-shadow:0 4px 10px rgba(0,0,0,.15);display:none;';
        document.body.appendChild(hud);
    }
    var left = items.filter(function(o) { return !o.got; }).length;
    var show = s.currentView === 'world' && !done() && items.length > 0 && !Game.adminMode;
    hud.style.display = show ? 'block' : 'none';
    if (show) hud.textContent = f.icon + ' ' + (items.length - left) + ' / ' + items.length;
    if (!show || s.currentView !== 'world') return;
    var c = s.charlie;
    items.forEach(function(o) {
        if (o.got || Math.hypot(c.x - o.x, c.y - o.y) > 55) return;
        o.got = true; o.el.remove();
        Game.audio.playChime();
        Game.particles.spawnWorld(f.icon, o.x, o.y, { count: 4, spread: 30, vy: -60 });
        if (items.every(function(q) { return q.got; })) finish();
    });
};
function finish() {
    var s = Game.state, f = FEST[s.season];
    s.festDone[key()] = true;
    s.inventory.money += f.reward;
    Game.xp.add(60);
    if (Game.particles.confetti) Game.particles.confetti();
    if (Game.audio.playLevelUp) Game.audio.playLevelUp();
    Game.ui.update();
    var what = { eggbasket: 'Un panier d\'œufs géant décore la place', castle: 'Un château de sable géant se dresse sur la plage', pumpkins: 'Une pyramide de citrouilles décore la ferme', snowman: 'Un bonhomme de neige garde la place' }[f.trophy];
    Game.ui.notify('🎉 Bravo ! ' + f.name.charAt(0).toUpperCase() + f.name.slice(1) + ' est réussie ! ' + what + ' (+' + f.reward + ' 💰)');
    items = [];
    placeTrophy(s.season);
    Game.saveGame();
}

})();
