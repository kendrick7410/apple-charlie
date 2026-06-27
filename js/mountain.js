// ── mountain.js ── Le Défi du Cervin : mission chronométrée, récompense en clochettes ──
(function(){
"use strict";

Game.mountain = {
    active: false,
    startTime: 0,
    elapsed: 0,
    flowers: [],        // edelweiss DOM à récolter
    remaining: 0,
    cooldownUntil: 0,
    TOTAL: 5,           // nombre d'edelweiss à récolter
    SPREAD: 700,        // rayon de dispersion autour du sommet
    NEAR: 420,          // distance pour proposer le défi
    FAST_SEC: 25,       // <= ce temps → récompense max
    SLOW_SEC: 110,      // >= ce temps → récompense min
    MAX_REWARD: 150,    // clochettes max
    MIN_REWARD: 50      // clochettes min
};

function peak() { return Game.CONFIG.LOCATIONS.mountain; }

Game.mountain.nearMountain = function() {
    var s = Game.state, m = peak();
    return Math.hypot(s.charlie.x - m.x, s.charlie.y - m.y) < Game.mountain.NEAR;
};

Game.mountain.start = function() {
    var M = Game.mountain;
    if (M.active) return;
    var m = peak();

    // Disperse les edelweiss en cercle AUTOUR DU JOUEUR (pas loin, faciles à trouver)
    M.flowers = [];
    M.remaining = M.TOTAL;
    var s = Game.state;
    var center = { x: s.charlie.x, y: s.charlie.y };
    for (var i = 0; i < M.TOTAL; i++) {
        var angle = (i / M.TOTAL) * Math.PI * 2 + Math.random() * 0.5;
        var dist = 160 + Math.random() * 180; // entre 160 et 340 px → toujours visibles
        var fx = Math.max(120, Math.min(Game.CONFIG.WORLD_W - 120, center.x + Math.cos(angle) * dist));
        var fy = Math.max(120, Math.min(Game.CONFIG.WORLD_H - 120, center.y + Math.sin(angle) * dist));
        var el = document.createElement('div');
        el.className = 'entity mountain-edelweiss';
        el.style.cssText = 'position:absolute;font-size:2rem;z-index:14;filter:drop-shadow(0 0 6px #fff);';
        el.style.left = fx + 'px';
        el.style.top = fy + 'px';
        el.textContent = '🌼';
        document.getElementById('game-world').appendChild(el);
        M.flowers.push({ el: el, x: fx, y: fy });
    }

    M.active = true;
    M.startTime = performance.now();
    M.elapsed = 0;
    var panel = document.getElementById('action-mountain');
    if (panel) panel.style.display = 'none';
    var hud = document.getElementById('mountain-hud');
    if (hud) hud.style.display = 'block';
    updateHud();
    Game.audio.play('levelup');
    Game.ui.notify("⛰️ Défi du Cervin lancé ! Récolte les " + M.TOTAL + " edelweiss 🌼 le plus vite possible !");
};

function updateHud() {
    var rem = document.getElementById('mountain-remaining');
    var tim = document.getElementById('mountain-timer');
    if (rem) rem.textContent = Game.mountain.remaining;
    if (tim) tim.textContent = Math.floor(Game.mountain.elapsed / 1000);
}

Game.mountain.update = function(dt, now) {
    var s = Game.state;
    if (s.currentView !== 'world') return;
    var M = Game.mountain;

    if (M.active) {
        M.elapsed = now - M.startTime;
        var cx = s.charlie.x, cy = s.charlie.y;
        // Récolte en marchant dessus
        for (var i = M.flowers.length - 1; i >= 0; i--) {
            var f = M.flowers[i];
            if (Math.hypot(cx - f.x, cy - f.y) < 75) {
                if (f.el) f.el.remove();
                M.flowers.splice(i, 1);
                M.remaining--;
                Game.audio.play('collect');
                Game.particles.spawnWorld('🌼', f.x, f.y, { count: 3, spread: 20 });
                if (M.remaining <= 0) {
                    finish(now);
                } else {
                    Game.ui.notify("🌼 Edelweiss ! Encore " + M.remaining + " à trouver.");
                    updateHud();
                }
            }
        }
        // Rafraîchit le chrono ~2x/seconde
        if (Math.floor(now / 500) !== Math.floor((now - dt) / 500)) updateHud();
        return;
    }

    // Inactif : propose le défi quand on est près du Cervin (après le cooldown)
    var p = document.getElementById('action-mountain');
    if (!p) return;
    p.style.display = (Game.mountain.nearMountain() && now >= M.cooldownUntil) ? 'flex' : 'none';
};

function finish(now) {
    var M = Game.mountain, s = Game.state;
    M.active = false;
    var sec = M.elapsed / 1000;

    // Récompense : plus c'est rapide, plus il y a de clochettes (50 → 150)
    var reward;
    if (sec <= M.FAST_SEC) reward = M.MAX_REWARD;
    else if (sec >= M.SLOW_SEC) reward = M.MIN_REWARD;
    else {
        var t = (sec - M.FAST_SEC) / (M.SLOW_SEC - M.FAST_SEC);
        reward = Math.round(M.MAX_REWARD - t * (M.MAX_REWARD - M.MIN_REWARD));
    }
    reward = Math.max(M.MIN_REWARD, Math.min(M.MAX_REWARD, reward));

    s.inventory.money += reward;
    Game.xp.add(40);
    Game.audio.playCoin();
    Game.particles.spawn('💰', window.innerWidth / 2, window.innerHeight / 2, { count: 8, spread: 80, vy: -90 });
    Game.ui.update();

    var hud = document.getElementById('mountain-hud');
    if (hud) hud.style.display = 'none';
    M.cooldownUntil = now + 20000; // 20s avant de pouvoir relancer
    Game.ui.notify("🏔️ Défi réussi en " + Math.floor(sec) + "s ! +" + reward + " clochettes 💰");
}

// Remise à zéro (nouvelle partie) : enlève les edelweiss restants
Game.mountain.reset = function() {
    var M = Game.mountain;
    M.flowers.forEach(function(f){ if (f.el) f.el.remove(); });
    M.flowers = [];
    M.active = false;
    M.remaining = 0;
    M.cooldownUntil = 0;
    var hud = document.getElementById('mountain-hud');
    if (hud) hud.style.display = 'none';
    var p = document.getElementById('action-mountain');
    if (p) p.style.display = 'none';
};

})();
