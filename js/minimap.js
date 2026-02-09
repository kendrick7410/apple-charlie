// ── minimap.js ── Mini-carte canvas 150x150 ──
(function(){
"use strict";

var canvas, ctxM;
var SCALE;
var W = 150, H = 150;

Game.minimap = {};

Game.minimap.init = function() {
    canvas = document.createElement('canvas');
    canvas.id = 'minimap';
    canvas.width = W;
    canvas.height = H;
    canvas.style.cssText = 'position:fixed;top:10px;right:10px;width:150px;height:150px;border:3px solid #e8e2c8;border-radius:12px;z-index:1000;background:#8cd47e;box-shadow:0 4px 10px rgba(0,0,0,0.2);';
    document.body.appendChild(canvas);
    ctxM = canvas.getContext('2d');
    SCALE = W / Game.CONFIG.WORLD_W;
};

Game.minimap.update = function() {
    if (!ctxM) return;
    var s = Game.state;

    // Background (season color)
    ctxM.fillStyle = Game.SEASON_GRASS[s.season] || '#8cd47e';
    ctxM.fillRect(0, 0, W, H);

    // River
    ctxM.fillStyle = '#5ba3ff';
    var baseX = Game.CONFIG.LOCATIONS.riverBaseX;
    for (var y = 0; y < Game.CONFIG.WORLD_H; y += 80) {
        var rx = (baseX + Math.sin(y / 250) * 80) * SCALE;
        ctxM.fillRect(rx, y * SCALE, 150 * SCALE, 100 * SCALE);
    }

    // Paths
    ctxM.fillStyle = '#f3e5ab';
    ctxM.fillRect(700 * SCALE, 700 * SCALE, 600 * SCALE, 600 * SCALE);
    ctxM.fillRect(400 * SCALE, 970 * SCALE, 1800 * SCALE, 60 * SCALE);
    ctxM.fillRect(970 * SCALE, 400 * SCALE, 60 * SCALE, 2000 * SCALE);

    // Buildings
    ctxM.fillStyle = '#d4a574';
    var locs = Game.CONFIG.LOCATIONS;
    drawRect(locs.fountain.x, locs.fountain.y, 30);
    drawRect(locs.bakery.x, locs.bakery.y, 25);
    drawRect(locs.shop.x, locs.shop.y, 25);
    drawRect(locs.charlieHouse.x, locs.charlieHouse.y, 25);

    // Houses
    Game.HOUSES.forEach(function(h) {
        if (h.id === 'charlie') return;
        ctxM.fillStyle = '#c0956e';
        drawRect(h.x, h.y, 20);
    });

    // Villagers
    ctxM.fillStyle = '#ff6b6b';
    s.villagers.forEach(function(v) {
        ctxM.beginPath();
        ctxM.arc(v.x * SCALE, v.y * SCALE, 2, 0, Math.PI * 2);
        ctxM.fill();
    });

    // Garden
    ctxM.fillStyle = '#6b4226';
    drawRect(locs.garden.x, locs.garden.y, 30);

    // Player
    ctxM.fillStyle = '#ffdd00';
    ctxM.strokeStyle = '#000';
    ctxM.lineWidth = 1;
    ctxM.beginPath();
    ctxM.arc(s.charlie.visualX * SCALE, s.charlie.visualY * SCALE, 4, 0, Math.PI * 2);
    ctxM.fill();
    ctxM.stroke();

    // Time overlay
    if (Game.time.isNight()) {
        ctxM.fillStyle = 'rgba(20,20,80,0.3)';
        ctxM.fillRect(0, 0, W, H);
    }

    function drawRect(x, y, size) {
        ctxM.fillRect(x * SCALE - size * SCALE / 2, y * SCALE - size * SCALE / 2, size * SCALE, size * SCALE);
    }
};

})();
