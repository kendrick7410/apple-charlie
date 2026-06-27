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
    var x = 200 + Math.random() * (Game.CONFIG.WORLD_W - 400);
    var y = 200 + Math.random() * (Game.CONFIG.WORLD_H - 400);
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
        // Re-roll the animal ONLY when the day/night or season context changes,
        // not every frame. (Re-rolling every frame made each creature flicker
        // through many different animals at once — very unrealistic.)
        var ctx = (isNight ? 'night' : 'day') + '-' + season;
        if (c.ctx !== ctx) {
            c.ctx = ctx;
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
                    // Bigger + slower butterflies = much easier to tap and catch
                    c.el.style.fontSize = '1.9rem';
                    c.speedMul = 0.5;
                    c.el.style.pointerEvents = 'auto';
                    c.el.style.cursor = 'pointer';
                    c.el.onclick = (function(creature) { return function(e) {
                        e.stopPropagation();
                        Game.creatures.tryCapture(creature);
                    }; })(c);
                } else {
                    c.speciesId = null;
                    c.speedMul = 1;
                    c.el.style.fontSize = '1.5rem';
                    c.el.style.filter = '';
                    c.el.style.pointerEvents = 'none';
                    c.el.style.cursor = '';
                    c.el.onclick = null;
                }
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

        var sm = c.speedMul || 1;
        c.x += c.vx * sm;
        c.y += c.vy * sm;

        // Wrap
        if (c.x < 50) c.x = Game.CONFIG.WORLD_W - 100;
        if (c.x > Game.CONFIG.WORLD_W - 50) c.x = 100;
        if (c.y < 50) c.y = Game.CONFIG.WORLD_H - 100;
        if (c.y > Game.CONFIG.WORLD_H - 50) c.y = 100;

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
    // Generous capture radius so you rarely get "trop loin"
    if (Math.hypot(s.charlie.x - creature.x, s.charlie.y - creature.y) > 400) {
        Game.ui.notify("Trop loin ! Rapproche-toi 🦋");
        return;
    }
    if (!creature.speciesId) return;

    var sp = Game.BUTTERFLY_SPECIES[creature.speciesId];
    // High capture chances so it's easy, even for the rare ones
    var chance = { common: 1.0, uncommon: 1.0, rare: 0.9, legendary: 0.8 };
    if (Math.random() > (chance[sp.rarity] || 0.6)) {
        Game.ui.notify("Raté ! Le papillon s'enfuit ! 🦋");
        Game.audio.play('error');
        // Make it flee (gentler than before so you can chase it down)
        creature.vx = (Math.random() - 0.5) * 3;
        creature.vy = (Math.random() - 0.5) * 3;
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
    // Respawn after delay (ctx=null forces a fresh species roll so it reappears)
    setTimeout(function() {
        creature.x = 200 + Math.random() * (Game.CONFIG.WORLD_W - 400);
        creature.y = 200 + Math.random() * (Game.CONFIG.WORLD_H - 400);
        creature.ctx = null;
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
        w.x = Math.max(50, Math.min(Game.CONFIG.WORLD_W - 50, w.x));
        w.y = Math.max(50, Math.min(Game.CONFIG.WORLD_H - 50, w.y));
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
    var x = 400 + Math.random() * (Game.CONFIG.WORLD_W - 800);
    var y = 400 + Math.random() * (Game.CONFIG.WORLD_H - 800);
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
    if (isNight) {
        // Night creatures: fireflies, hedgehogs, and owls
        var r = Math.random();
        if (r > 0.7) return '🦉'; // Owls
        if (r > 0.3) return '✨'; // Fireflies
        return '🦔'; // Hedgehogs
    }
    if (season === 'winter') {
        // Winter: deer, eagles, occasional bears
        var r = Math.random();
        if (r > 0.95) return '🐻'; // Very rare bears
        if (r > 0.88) return '🦅'; // Eagles
        if (r > 0.75) return '🦌'; // Deer
        return ''; // Mostly empty in winter
    }
    if (season === 'spring' || season === 'summer') {
        // Spring/Summer: butterflies, birds, squirrels, deer, eagles, beavers, rare bears
        var r = Math.random();
        if (r > 0.96) return '🐻'; // Very rare bears
        if (r > 0.90) return '🦌'; // Deer
        if (r > 0.84) return '🦅'; // Eagles
        if (r > 0.76) return '🦫'; // Beavers
        if (r > 0.55) return '🐿️'; // Squirrels
        if (r > 0.30) return '🦋'; // Butterflies
        return '🐦'; // Birds
    }
    // Autumn: butterflies, birds, squirrels, hedgehogs, deer, eagles
    var r = Math.random();
    if (r > 0.92) return '🦅'; // Eagles
    if (r > 0.85) return '🦌'; // Deer
    if (r > 0.72) return '🦔'; // Hedgehogs
    if (r > 0.48) return '🐿️'; // Squirrels
    if (r > 0.28) return '🦋'; // Butterflies
    return '🐦'; // Birds
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
