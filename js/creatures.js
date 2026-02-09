// ── creatures.js ── Papillons (capturables), oiseaux, lucioles, guêpes ──
(function(){
"use strict";

var creatures = [];
var wasps = [];

Game.creatures = {};

Game.creatures.init = function() {
    creatures = [];
    wasps = [];
    for (var i = 0; i < Game.CONFIG.CREATURE_COUNT; i++) {
        creatures.push(createCreature());
    }
};

function pickSpecies(table, season, isNight) {
    var valid = [];
    var totalW = 0;
    for (var id in table) {
        var sp = table[id];
        if (sp.season && sp.season.indexOf(season) === -1) continue;
        if (sp.night && !isNight) continue;
        valid.push({ id: id, weight: sp.weight });
        totalW += sp.weight;
    }
    if (valid.length === 0) return null;
    var r = Math.random() * totalW;
    for (var i = 0; i < valid.length; i++) {
        r -= valid[i].weight;
        if (r <= 0) return valid[i].id;
    }
    return valid[valid.length - 1].id;
}

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
        speciesId: null,
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
            // Assign butterfly species
            if (newType === '🦋') {
                c.speciesId = pickSpecies(Game.BUTTERFLY_SPECIES, season, isNight);
                var sp = c.speciesId ? Game.BUTTERFLY_SPECIES[c.speciesId] : null;
                if (sp && sp.color) {
                    c.el.style.filter = 'drop-shadow(0 0 4px ' + sp.color + ')';
                } else {
                    c.el.style.filter = '';
                }
                // Make butterflies capturable
                c.el.style.pointerEvents = 'auto';
                c.el.style.cursor = 'pointer';
                c.el.onclick = (function(creature) { return function(e) {
                    e.stopPropagation();
                    Game.creatures.tryCapture(creature);
                }; })(c);
            } else {
                c.speciesId = null;
                c.el.style.filter = '';
                c.el.style.pointerEvents = 'none';
                c.el.style.cursor = '';
                c.el.onclick = null;
            }
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

    // Wasp spawning
    updateWasps(dt, season, isNight);
};

// ── Butterfly capture ──
Game.creatures.tryCapture = function(creature) {
    var s = Game.state;
    if (!s.tools.net) {
        Game.ui.notify("Il te faut un filet ! 🥅");
        return;
    }
    // Check proximity
    if (Math.hypot(s.charlie.x - creature.x, s.charlie.y - creature.y) > 150) {
        Game.ui.notify("Trop loin ! Rapproche-toi 🦋");
        return;
    }
    if (!creature.speciesId) return;

    var sp = Game.BUTTERFLY_SPECIES[creature.speciesId];
    // Capture chance based on rarity
    var chance = { common: 0.9, uncommon: 0.75, rare: 0.5, legendary: 0.3 };
    if (Math.random() > (chance[sp.rarity] || 0.5)) {
        Game.ui.notify("Raté ! Le papillon s'enfuit ! 🦋");
        Game.audio.play('error');
        // Make it flee
        creature.vx = (Math.random() - 0.5) * 6;
        creature.vy = (Math.random() - 0.5) * 6;
        return;
    }

    // Caught!
    s.inventory.butterflies++;
    s.specimens.butterflies[creature.speciesId] = (s.specimens.butterflies[creature.speciesId] || 0) + 1;
    Game.xp.add(sp.value);
    Game.audio.play('collect');
    Game.particles.spawnWorld('🦋', creature.x, creature.y, { count: 3, spread: 20 });
    Game.ui.update();

    var rarityLabel = { common: '', uncommon: '✨', rare: '💎', legendary: '👑' };
    Game.ui.notify(sp.name + " capturé ! " + (rarityLabel[sp.rarity] || '') + " 🦋");

    // Remove creature temporarily
    creature.el.style.display = 'none';
    creature.type = '';
    creature.speciesId = null;
    creature.el.style.pointerEvents = 'none';
    creature.el.onclick = null;
    // Respawn after delay
    setTimeout(function() {
        creature.x = 200 + Math.random() * 2600;
        creature.y = 200 + Math.random() * 2600;
    }, 10000);
};

// ── Wasp system ──
function updateWasps(dt, season, isNight) {
    // Spawn conditions: spring/summer, daytime, not raining
    var canSpawn = (season === 'spring' || season === 'summer') && !isNight && Game.state.weather !== 'rain';

    // Random spawn
    if (canSpawn && wasps.length < 5 && Math.random() < 0.001) {
        spawnWasp();
    }

    // Update existing wasps
    for (var i = wasps.length - 1; i >= 0; i--) {
        var w = wasps[i];
        w.life -= dt;
        if (w.life <= 0) {
            w.el.remove();
            wasps.splice(i, 1);
            continue;
        }
        // Move faster than normal creatures, buzz around
        w.timer += dt;
        if (w.timer > 800) {
            w.timer = 0;
            w.vx = (Math.random() - 0.5) * 4;
            w.vy = (Math.random() - 0.5) * 4;
        }
        w.x += w.vx;
        w.y += w.vy;
        w.x = Math.max(50, Math.min(2950, w.x));
        w.y = Math.max(50, Math.min(2950, w.y));
        w.el.style.left = w.x + 'px';
        w.el.style.top = w.y + 'px';
    }
}

function spawnWasp() {
    var el = document.createElement('div');
    el.className = 'entity creature wasp';
    el.style.fontSize = '1.3rem';
    el.style.zIndex = '16';
    el.style.transition = 'none';
    el.textContent = '🐝';
    var x = 400 + Math.random() * 2200;
    var y = 400 + Math.random() * 2200;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.getElementById('game-world').appendChild(el);
    wasps.push({
        el: el,
        x: x, y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        timer: 0,
        life: Game.CONFIG.WASP_LIFESPAN
    });
}

function getCreatureType(season, isNight) {
    if (isNight) return '✨'; // Fireflies at night
    if (season === 'winter') return ''; // Nothing in winter
    if (season === 'spring' || season === 'summer') {
        return Math.random() > 0.5 ? '🦋' : '🐦';
    }
    return Math.random() > 0.7 ? '🦋' : '🐦'; // Some butterflies in autumn
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
