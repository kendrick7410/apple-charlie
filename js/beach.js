// ── beach.js ── Mission de la plage : la chasse au trésor (chaud / froid) ──
(function(){
"use strict";

Game.beach = {
    active: false,
    chestX: 0,
    chestY: 0,
    lastDist: null,
    cooldownUntil: 0,
    TOTAL: 3,            // il faut trouver 3 coffres
    found: 0,
    deadline: 0,        // temps limite (timestamp)
    LIMIT: 60000,       // 60 secondes pour les 3 coffres
    FIND_RADIUS: 55,    // plus petit → il faut être plus précis
    REWARD_MIN: 150,
    REWARD_MAX: 260
};

function setHud(text) {
    var el = document.getElementById('beach-temp');
    if (el) el.textContent = text;
}

// Cache un coffre n'importe où sur toute la plage (pas près du joueur : plus dur)
function placeChest() {
    var B = Game.beach;
    var W = Game.CONFIG.WORLD_W;
    var cx = 320 + Math.random() * (W - 640);
    var top = Game.CONFIG.BEACH_TOP + 90;
    var bottom = Game.world.shorelineY(cx) - 80;
    var cy = top + Math.random() * Math.max(60, bottom - top);
    B.chestX = cx; B.chestY = cy; B.lastDist = null;
}

Game.beach.start = function() {
    var B = Game.beach;
    if (B.active) return;
    B.active = true;
    B.found = 0;
    B.deadline = performance.now() + B.LIMIT;
    placeChest();

    var panel = document.getElementById('action-beach');
    if (panel) panel.style.display = 'none';
    var hud = document.getElementById('beach-hud');
    if (hud) hud.style.display = 'block';
    setHud('🧊 Glacial');
    Game.audio.play('levelup');
    Game.ui.notify("🗺️ Chasse au trésor ! Trouve " + B.TOTAL + " coffres avant la fin du chrono ⏱️ (60 s). Suis le chaud/froid !");
};

Game.beach.update = function(dt, now) {
    var s = Game.state;
    if (s.currentView !== 'world') return;
    var B = Game.beach;

    if (B.active) {
        var remaining = Math.ceil((B.deadline - now) / 1000);
        if (remaining <= 0) { failTimeout(now); return; }

        var d = Math.hypot(s.charlie.x - B.chestX, s.charlie.y - B.chestY);
        if (d < B.FIND_RADIUS) { chestFound(now); return; }

        // Tendance moins sensible (seuil plus large) → indices plus grossiers
        var trend = '';
        if (B.lastDist != null) {
            if (d < B.lastDist - 3) trend = '  ⬆️';
            else if (d > B.lastDist + 3) trend = '  ⬇️';
        }
        B.lastDist = d;

        // Bandes de température plus larges → il faut chercher plus
        var temp;
        if (d < 120) temp = '🔥🔥 TU BRÛLES !';
        else if (d < 380) temp = '🔥 Tu chauffes';
        else if (d < 750) temp = '😎 Tiède';
        else if (d < 1200) temp = '❄️ Froid';
        else temp = '🧊 Glacial';

        setHud(temp + trend + '   ⏱️ ' + remaining + 's   •   Coffre ' + (B.found + 1) + '/' + B.TOTAL);
        return;
    }

    // pas active : propose la chasse quand on est sur la plage (après le cooldown)
    var p = document.getElementById('action-beach');
    if (!p) return;
    var onBeach = s.charlie.y >= Game.CONFIG.BEACH_TOP - 50;
    var enterEl = document.getElementById('action-enter');
    var enterShown = enterEl && getComputedStyle(enterEl).display !== 'none';
    p.style.display = (onBeach && now >= B.cooldownUntil && !enterShown) ? 'flex' : 'none';
};

function chestFound(now) {
    var B = Game.beach;
    B.found++;
    Game.audio.playCoin();
    Game.particles.spawnWorld('🪙', B.chestX, B.chestY, { count: 5, spread: 50, vy: -60 });

    if (B.found >= B.TOTAL) {
        finishAll(now);
    } else {
        placeChest();
        setHud('🧊 Glacial   ⏱️   •   Coffre ' + (B.found + 1) + '/' + B.TOTAL);
        Game.ui.notify("💰 Coffre " + B.found + "/" + B.TOTAL + " trouvé ! Vite, cherche le suivant !");
    }
}

function finishAll(now) {
    var B = Game.beach, s = Game.state;
    B.active = false;
    var reward = B.REWARD_MIN + Math.floor(Math.random() * (B.REWARD_MAX - B.REWARD_MIN + 1));
    s.inventory.money += reward;
    Game.xp.add(60);
    Game.audio.playCoin();
    Game.particles.spawnWorld('💎', B.chestX, B.chestY, { count: 8, spread: 60, vy: -80 });
    Game.particles.spawnWorld('🏆', B.chestX, B.chestY, { count: 4, spread: 40, vy: -70 });
    var hud = document.getElementById('beach-hud');
    if (hud) hud.style.display = 'none';
    B.cooldownUntil = now + 20000;
    Game.ui.update();
    Game.ui.notify("🏆 Les " + B.TOTAL + " coffres trouvés ! +" + reward + " clochettes 💰");
}

function failTimeout(now) {
    var B = Game.beach;
    B.active = false;
    var hud = document.getElementById('beach-hud');
    if (hud) hud.style.display = 'none';
    Game.audio.play('error');
    B.cooldownUntil = now + 12000;
    Game.ui.notify("⏱️ Temps écoulé ! Tu as trouvé " + B.found + "/" + B.TOTAL + " coffres. Réessaie !");
}

Game.beach.reset = function() {
    var B = Game.beach;
    B.active = false; B.lastDist = null; B.cooldownUntil = 0; B.found = 0;
    var hud = document.getElementById('beach-hud');
    if (hud) hud.style.display = 'none';
    var p = document.getElementById('action-beach');
    if (p) p.style.display = 'none';
};

})();
