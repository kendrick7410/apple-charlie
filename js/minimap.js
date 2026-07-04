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

    // Beach (sand) + Sea (bottom of the map)
    ctxM.fillStyle = '#efd89a';
    ctxM.fillRect(0, Game.CONFIG.BEACH_TOP * SCALE, W, (Game.CONFIG.WORLD_H - Game.CONFIG.BEACH_TOP) * SCALE);
    ctxM.fillStyle = '#2f9fd0';
    ctxM.fillRect(0, Game.CONFIG.SEA_TOP * SCALE, W, (Game.CONFIG.WORLD_H - Game.CONFIG.SEA_TOP) * SCALE);

    // River (bras ouest + bras central, géométrie partagée)
    ctxM.fillStyle = '#5ba3ff';
    Game.buildRiverSegments().forEach(function(seg) {
        ctxM.fillRect(seg.x * SCALE, seg.y * SCALE, seg.w * SCALE, seg.h * SCALE);
    });

    // Paths (réseau partagé)
    ctxM.fillStyle = '#f3e5ab';
    Game.PATHS.forEach(function(p) {
        ctxM.fillRect(p.x * SCALE, p.y * SCALE, p.w * SCALE, p.h * SCALE);
    });

    // Buildings
    ctxM.fillStyle = '#d4a574';
    var locs = Game.CONFIG.LOCATIONS;
    drawRect(locs.fountain.x, locs.fountain.y, 30);
    drawRect(locs.bakery.x, locs.bakery.y, 25);
    drawRect(locs.shop.x, locs.shop.y, 25);
    drawRect(locs.charlieHouse.x, locs.charlieHouse.y, 25);
    drawRect(locs.souvenirShop.x, locs.souvenirShop.y, 25);
    drawRect(locs.pizzeria.x, locs.pizzeria.y, 25);

    // Port
    ctxM.fillStyle = '#8b6544';
    drawRect(locs.port.x, locs.port.y + 150, 22);

    // Mountains (4 peaks)
    ctxM.fillStyle = '#e8e8f0';
    [locs.mountain, locs.mountain2, locs.mountain3, locs.mountain4].forEach(function(m){ drawRect(m.x, m.y, 26); });

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
