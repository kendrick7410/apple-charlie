// ── beach.js ── Mission de la plage : la chasse au trésor (chaud / froid) ──
(function(){
"use strict";

Game.beach = {
    active: false,
    chestX: 0,
    chestY: 0,
    lastDist: null,
    cooldownUntil: 0,
    REWARD_MIN: 80,
    REWARD_MAX: 140
};

function setHud(text) {
    var el = document.getElementById('beach-temp');
    if (el) el.textContent = text;
}

Game.beach.start = function() {
    var B = Game.beach, s = Game.state;
    if (B.active) return;
    var W = Game.CONFIG.WORLD_W;
    // coffre enfoui quelque part sur le sable, pas trop loin du joueur
    var cx = Math.max(320, Math.min(W - 320, s.charlie.x + (Math.random() - 0.5) * 1800));
    var top = Game.CONFIG.BEACH_TOP + 90;
    var bottom = Game.world.shorelineY(cx) - 80;
    var cy = top + Math.random() * Math.max(60, bottom - top);
    B.chestX = cx; B.chestY = cy;
    B.active = true; B.lastDist = null;

    var panel = document.getElementById('action-beach');
    if (panel) panel.style.display = 'none';
    var hud = document.getElementById('beach-hud');
    if (hud) hud.style.display = 'block';
    setHud('🧊 Glacial');
    Game.audio.play('levelup');
    Game.ui.notify("🗺️ Chasse au trésor ! Un coffre est enfoui dans le sable. Suis le chaud/froid pour le trouver !");
};

Game.beach.update = function(dt, now) {
    var s = Game.state;
    if (s.currentView !== 'world') return;
    var B = Game.beach;

    if (B.active) {
        var d = Math.hypot(s.charlie.x - B.chestX, s.charlie.y - B.chestY);
        if (d < 75) { finish(now); return; }

        var trend = '';
        if (B.lastDist != null) {
            if (d < B.lastDist - 1.5) trend = '  ⬆️ tu te rapproches';
            else if (d > B.lastDist + 1.5) trend = '  ⬇️ tu t\'éloignes';
        }
        B.lastDist = d;

        var temp;
        if (d < 150) temp = '🔥🔥 TU BRÛLES !';
        else if (d < 350) temp = '🔥 Tu chauffes';
        else if (d < 650) temp = '😎 Tiède';
        else if (d < 1000) temp = '❄️ Froid';
        else temp = '🧊 Glacial';
        setHud(temp + trend);
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

function finish(now) {
    var B = Game.beach, s = Game.state;
    B.active = false;
    var reward = B.REWARD_MIN + Math.floor(Math.random() * (B.REWARD_MAX - B.REWARD_MIN + 1));
    s.inventory.money += reward;
    Game.xp.add(35);
    Game.audio.playCoin();
    Game.particles.spawnWorld('💎', B.chestX, B.chestY, { count: 8, spread: 60, vy: -80 });
    Game.particles.spawnWorld('🪙', B.chestX, B.chestY, { count: 6, spread: 50, vy: -60 });
    var hud = document.getElementById('beach-hud');
    if (hud) hud.style.display = 'none';
    B.cooldownUntil = now + 20000;
    Game.ui.update();
    Game.ui.notify("🪙 Coffre au trésor trouvé ! +" + reward + " clochettes 💰");
}

Game.beach.reset = function() {
    var B = Game.beach;
    B.active = false; B.lastDist = null; B.cooldownUntil = 0;
    var hud = document.getElementById('beach-hud');
    if (hud) hud.style.display = 'none';
    var p = document.getElementById('action-beach');
    if (p) p.style.display = 'none';
};

})();
