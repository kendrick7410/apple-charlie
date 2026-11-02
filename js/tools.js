// ── tools.js ── Outils (hache, canne, arrosoir, pelle) ──
(function(){
"use strict";

Game.tools = {};

Game.tools.getToolbar = function() {
    var s = Game.state;
    var items = [];
    if (s.tools.axe) items.push({ emoji: '🪓', label: 'Hache', active: true });
    if (s.tools.rod) items.push({ emoji: '🎣', label: 'Canne', active: true });
    if (s.tools.watering) items.push({ emoji: '🚿', label: 'Arrosoir', active: true });
    if (s.tools.shovel) items.push({ emoji: '⛏️', label: 'Pelle', active: true, id: 'shovel' });
    if (s.tools.net) items.push({ emoji: '🥅', label: 'Filet', active: true, id: 'net' });
    return items;
};

Game.tools.hasAxe = function() { return Game.state.tools.axe; };
Game.tools.hasRod = function() { return Game.state.tools.rod; };
Game.tools.hasWatering = function() { return Game.state.tools.watering; };
Game.tools.hasShovel = function() { return Game.state.tools.shovel; };
Game.tools.hasNet = function() { return Game.state.tools.net; };

// Mettre / enlever les crampons (il faut les avoir achetés)
Game.tools.toggleCrampons = function() {
    var s = Game.state;
    if (!s.tools.crampons) { Game.ui.notify("Tu n'as pas de crampons ! (au Magasin)"); return; }
    s.cramponsOn = s.cramponsOn === false;
    Game.tools.updateCramponsBtn();
    Game.ui.notify(s.cramponsOn ? "🥾 Crampons enfilés : tu peux escalader (avec le piolet) !" : "🥾 Crampons enlevés");
};
Game.tools.updateCramponsBtn = function() {
    var s = Game.state, btn = document.getElementById('crampons-toggle');
    if (!btn) return;
    btn.style.display = s.tools.crampons ? '' : 'none';
    var on = s.cramponsOn !== false;
    btn.textContent = on ? '🥾 Crampons ON' : '🥾 Crampons OFF';
    btn.style.background = on ? '#66bb6a' : '#e8e2c8';
    btn.style.color = on ? 'white' : '#5d4037';
};

Game.tools.toggleShovel = function() {
    if (!Game.state.tools.shovel) {
        Game.ui.notify("Tu n'as pas de pelle !");
        return;
    }
    Game.state.shovelMode = !Game.state.shovelMode;
    var btn = document.getElementById('shovel-toggle');
    if (btn) {
        btn.textContent = Game.state.shovelMode ? '⛏️ Pelle ON' : '⛏️ Pelle OFF';
        btn.style.background = Game.state.shovelMode ? '#66bb6a' : '#e8e2c8';
        btn.style.color = Game.state.shovelMode ? 'white' : '#5d4037';
    }
    Game.ui.notify(Game.state.shovelMode ? "Mode pelle activé ! Clique pour tracer des chemins ⛏️" : "Mode pelle désactivé");
};

Game.tools.placePath = function(worldX, worldY) {
    if (!Game.state.shovelMode || !Game.state.tools.shovel) return;

    // Snap to grid of 60px
    var gx = Math.round(worldX / 60) * 60;
    var gy = Math.round(worldY / 60) * 60;

    // Check if path already exists at this position
    var existing = -1;
    for (var i = 0; i < Game.state.placedPaths.length; i++) {
        var p = Game.state.placedPaths[i];
        if (p.x === gx && p.y === gy) {
            existing = i;
            break;
        }
    }

    if (existing >= 0) {
        // Remove path
        Game.state.placedPaths.splice(existing, 1);
        var el = document.querySelector('.player-path[data-px="' + gx + '"][data-py="' + gy + '"]');
        if (el) el.remove();
        Game.audio.play('collect');
    } else {
        // Place path
        Game.state.placedPaths.push({ x: gx, y: gy });
        Game.tools.renderPathTile(gx, gy);
        Game.audio.play('craft');
    }
};

Game.tools.renderPathTile = function(x, y) {
    var world = document.getElementById('game-world');
    var tile = document.createElement('div');
    tile.className = 'path player-path';
    tile.style.left = x + 'px';
    tile.style.top = y + 'px';
    tile.style.width = '60px';
    tile.style.height = '60px';
    tile.dataset.px = x;
    tile.dataset.py = y;
    world.appendChild(tile);
};

Game.tools.renderAllPaths = function() {
    Game.state.placedPaths.forEach(function(p) {
        Game.tools.renderPathTile(p.x, p.y);
    });
};

})();
