// ── particles.js ── Système de particules (pool) ──
(function(){
"use strict";

var pool = [];
var activeParticles = [];

Game.particles = {};

function initPool() {
    for (var i = 0; i < Game.CONFIG.PARTICLE_POOL_SIZE; i++) {
        var el = document.createElement('div');
        el.className = 'particle';
        el.style.display = 'none';
        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '2000';
        el.style.fontSize = '1.5rem';
        el.style.transition = 'none';
        pool.push({ el: el, active: false, startTime: 0, duration: 0, x: 0, y: 0, vx: 0, vy: 0 });
    }
}

function getParticle() {
    for (var i = 0; i < pool.length; i++) {
        if (!pool[i].active) return pool[i];
    }
    return null;
}

Game.particles.init = function() {
    initPool();
    var container = document.getElementById('particle-layer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'particle-layer';
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2000;overflow:hidden;';
        document.body.appendChild(container);
    }
    pool.forEach(function(p){ container.appendChild(p.el); });
};

Game.particles.spawn = function(emoji, screenX, screenY, opts) {
    opts = opts || {};
    var count = opts.count || 1;
    for (var i = 0; i < count; i++) {
        var p = getParticle();
        if (!p) return;
        p.active = true;
        p.startTime = performance.now();
        p.duration = opts.duration || 1000;
        p.x = screenX + (opts.spread ? (Math.random() - 0.5) * opts.spread : 0);
        p.y = screenY + (opts.spread ? (Math.random() - 0.5) * opts.spread : 0);
        p.vx = (opts.vx || 0) + (Math.random() - 0.5) * (opts.randomVx || 0);
        p.vy = (opts.vy || -60) + (Math.random() - 0.5) * (opts.randomVy || 0);
        p.el.textContent = emoji;
        p.el.style.left = p.x + 'px';
        p.el.style.top = p.y + 'px';
        p.el.style.opacity = '1';
        p.el.style.display = 'block';
        p.el.style.fontSize = (opts.size || 1.5) + 'rem';
        activeParticles.push(p);
    }
};

Game.particles.update = function(now) {
    for (var i = activeParticles.length - 1; i >= 0; i--) {
        var p = activeParticles[i];
        var t = (now - p.startTime) / p.duration;
        if (t >= 1) {
            p.el.style.display = 'none';
            p.active = false;
            activeParticles.splice(i, 1);
            continue;
        }
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.el.style.left = p.x + 'px';
        p.el.style.top = p.y + 'px';
        p.el.style.opacity = (1 - t).toString();
        p.el.style.transform = 'scale(' + (1 - t * 0.3) + ')';
    }
};

// Convenience: spawn at world position (converts to screen)
Game.particles.spawnWorld = function(emoji, worldX, worldY, opts) {
    var s = Game.state;
    var sx = worldX + (window.innerWidth / 2 - s.charlie.visualX);
    var sy = worldY + (window.innerHeight / 2 - s.charlie.visualY);
    Game.particles.spawn(emoji, sx, sy, opts);
};

// Level-up confetti
Game.particles.confetti = function() {
    var emojis = ['🎉', '⭐', '✨', '🌟', '🎊'];
    for (var i = 0; i < 15; i++) {
        var e = emojis[Math.floor(Math.random() * emojis.length)];
        Game.particles.spawn(e, window.innerWidth / 2, window.innerHeight / 2, {
            spread: 300, randomVx: 200, randomVy: 100, vy: -100, duration: 1500
        });
    }
};

})();
