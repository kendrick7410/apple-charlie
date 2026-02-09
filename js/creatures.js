// ── creatures.js ── Papillons, oiseaux, lucioles ──
(function(){
"use strict";

var creatures = [];
var MAX = 15;

Game.creatures = {};

Game.creatures.init = function() {
    creatures = [];
    for (var i = 0; i < Game.CONFIG.CREATURE_COUNT; i++) {
        creatures.push(createCreature());
    }
};

function createCreature() {
    var el = document.createElement('div');
    el.className = 'entity creature';
    el.style.fontSize = '1.5rem';
    el.style.transition = 'none';
    el.style.zIndex = '15';
    var x = 200 + Math.random() * 2600;
    var y = 200 + Math.random() * 2600;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.getElementById('game-world').appendChild(el);
    return {
        el: el,
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        type: '',
        timer: 0
    };
}

Game.creatures.update = function(dt) {
    var s = Game.state;
    var season = s.season;
    var isNight = Game.time.isNight();

    creatures.forEach(function(c) {
        // Determine type based on season/time
        var newType = getCreatureType(season, isNight);
        if (c.type !== newType) {
            c.type = newType;
            c.el.textContent = newType;
            c.el.style.display = newType ? 'block' : 'none';
        }

        if (!c.type) return;

        // Move
        c.timer += dt;
        if (c.timer > 2000 + Math.random() * 2000) {
            c.timer = 0;
            c.vx = (Math.random() - 0.5) * 2;
            c.vy = (Math.random() - 0.5) * 2;
        }

        c.x += c.vx;
        c.y += c.vy;

        // Wrap
        if (c.x < 50) c.x = 2900;
        if (c.x > 2950) c.x = 100;
        if (c.y < 50) c.y = 2900;
        if (c.y > 2950) c.y = 100;

        c.el.style.left = c.x + 'px';
        c.el.style.top = c.y + 'px';

        // Firefly glow
        if (c.type === '✨' && isNight) {
            c.el.style.opacity = (0.5 + Math.sin(performance.now() * 0.003 + c.x) * 0.5).toString();
        } else {
            c.el.style.opacity = '1';
        }
    });
};

function getCreatureType(season, isNight) {
    if (isNight) return '✨'; // Fireflies at night
    if (season === 'winter') return ''; // Nothing in winter
    if (season === 'spring' || season === 'summer') {
        return Math.random() > 0.5 ? '🦋' : '🐦';
    }
    return '🐦'; // Birds in autumn
}

// Fish jumping in river
Game.creatures.spawnJumpingFish = function() {
    if (Game.state.season === 'winter') return;
    var baseX = Game.CONFIG.LOCATIONS.riverBaseX;
    var x = baseX + 30 + Math.random() * 80;
    var y = Math.random() * Game.CONFIG.WORLD_H;
    Game.particles.spawnWorld('🐟', x, y, { vy: -100, duration: 800 });
};

})();
