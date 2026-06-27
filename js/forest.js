// ── forest.js ── Le loup-garou qui rôde dans la forêt ──
(function(){
"use strict";

Game.forest = {};

var wolf = null;
var WOLF_RANGE = 330;   // le loup ne sort jamais de la forêt
var ZONE = 410;         // "zone du loup" : où Charlie ralentit à la vitesse du loup
var PENALTY = 15;       // clochettes perdues quand il t'attrape
var wasInZone = false;

Game.forest.WOLF_SPEED = 1.8;  // vitesse du loup (et de Charlie dans sa zone)

function center() { return Game.CONFIG.LOCATIONS.forest; }

// Es-tu dans la zone du loup ? (utilisé pour te ralentir à sa vitesse)
Game.forest.inZone = function(x, y) {
    var c = center();
    return Math.hypot(x - c.x, y - c.y) < ZONE;
};

Game.forest.init = function() {
    if (wolf && wolf.el) wolf.el.remove();
    var c = center();
    var el = document.createElement('div');
    el.className = 'entity werewolf';
    el.style.cssText = 'position:absolute;font-size:3.2rem;z-index:16;pointer-events:none;';
    el.style.left = c.x + 'px';
    el.style.top = c.y + 'px';
    el.textContent = '🐺';
    document.getElementById('game-world').appendChild(el);
    wolf = { el: el, x: c.x, y: c.y, vx: 0, vy: 0, t: 0, cooldown: 0 };
};

Game.forest.update = function(dt) {
    if (!wolf) return;
    var s = Game.state;
    if (s.currentView !== 'world') return;

    var c = center();
    var px = s.charlie.x, py = s.charlie.y;
    var inForest = Game.forest.inZone(px, py);
    var distToWolf = Math.hypot(px - wolf.x, py - wolf.y);

    // Avertissement quand on entre/sort de la zone du loup
    if (inForest && !wasInZone) Game.ui.notify("🐺 Zone du loup : tu ralentis à sa vitesse, attention !");
    wasInZone = inForest;

    if (inForest && distToWolf < 300) {
        // le joueur s'aventure près de lui → il fonce dessus (mais reste dans la forêt)
        var dx = px - wolf.x, dy = py - wolf.y;
        var d = distToWolf || 1;
        wolf.vx = (dx / d) * Game.forest.WOLF_SPEED;
        wolf.vy = (dy / d) * Game.forest.WOLF_SPEED;
    } else {
        // sinon il se balade tranquillement dans la forêt
        wolf.t += dt;
        if (wolf.t > 1400) { wolf.t = 0; wolf.vx = (Math.random() - 0.5) * 2.4; wolf.vy = (Math.random() - 0.5) * 2.4; }
    }

    wolf.x += wolf.vx;
    wolf.y += wolf.vy;

    // rester dans la forêt
    var fd = Math.hypot(wolf.x - c.x, wolf.y - c.y);
    if (fd > WOLF_RANGE) {
        var a = Math.atan2(wolf.y - c.y, wolf.x - c.x);
        wolf.x = c.x + Math.cos(a) * WOLF_RANGE;
        wolf.y = c.y + Math.sin(a) * WOLF_RANGE;
        wolf.vx *= -0.5; wolf.vy *= -0.5;
    }

    wolf.el.style.left = wolf.x + 'px';
    wolf.el.style.top = wolf.y + 'px';

    // s'il te touche : -15 clochettes + téléportation à la fontaine
    if (wolf.cooldown > 0) wolf.cooldown -= dt;
    if (wolf.cooldown <= 0 && Math.hypot(px - wolf.x, py - wolf.y) < 66) {
        wolf.cooldown = 2500;
        s.inventory.money = Math.max(0, s.inventory.money - PENALTY);
        Game.audio.play('error');
        Game.particles.spawnWorld('🐺', wolf.x, wolf.y, { count: 4, spread: 30 });
        var f = Game.CONFIG.LOCATIONS.fountain;
        s.charlie.x = f.x; s.charlie.y = f.y + 90;
        s.charlie.visualX = f.x; s.charlie.visualY = f.y + 90;
        if (Game.player.updateCamera) Game.player.updateCamera();
        Game.ui.update();
        Game.ui.notify("🐺 Le loup-garou t'a attrapé ! -" + PENALTY + " clochettes, retour à la fontaine !");
    }
};

})();
