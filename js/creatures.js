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
    var y = 200 + Math.random() * (Game.CONFIG.BEACH_TOP - 350); // reste sur la terre
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
                    // Tous les papillons se ressemblent (même taille, même lueur dorée) ;
                    // on découvre l'espèce seulement en l'attrapant
                    c.el.style.filter = 'drop-shadow(0 0 5px rgba(255, 213, 79, 0.95))';
                    // Bigger + STATIONARY butterflies = very easy to tap and catch
                    c.el.style.fontSize = '2.4rem';
                    c.speedMul = 0;   // les papillons restent fixes (ne s'envolent plus)
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

        // Papillon : il suffit de marcher dessus (avec le filet) pour l'attraper
        if (c.type === '🦋' && s.tools.net && s.currentView === 'world' &&
            Math.hypot(s.charlie.x - c.x, s.charlie.y - c.y) < 70) {
            Game.creatures.tryCapture(c);
            if (!c.type) return;
        }

        // Move
        // Comportement naturel : l'animal choisit une direction (ou s'arrête un moment pour brouter),
        // puis tourne et accélère doucement vers elle au lieu de changer de sens d'un coup
        c.timer += dt;
        if (c.timer > (c.nextT || 2500)) {
            c.timer = 0;
            c.nextT = 2500 + Math.random() * 3000;
            if (Math.random() < 0.35) { c.tvx = 0; c.tvy = 0; }
            else { var ang = Math.random() * Math.PI * 2, spd = 0.5 + Math.random() * 0.7; c.tvx = Math.cos(ang) * spd; c.tvy = Math.sin(ang) * spd; }
        }
        var ease = Math.min(1, dt / 400);
        c.vx += ((c.tvx || 0) - c.vx) * ease;
        c.vy += ((c.tvy || 0) - c.vy) * ease;

        var sm = (c.speedMul == null) ? 1 : c.speedMul;  // 0 = fixe (papillons)
        c.x += c.vx * sm * dt / 16.67;
        c.y += c.vy * sm * dt / 16.67;

        // Wrap (limité à la terre, pas la mer)
        var landBottom = Game.CONFIG.BEACH_TOP - 100;
        if (c.x < 50) c.x = Game.CONFIG.WORLD_W - 100;
        if (c.x > Game.CONFIG.WORLD_W - 50) c.x = 100;
        if (c.y < 50) c.y = landBottom;
        if (c.y > landBottom) c.y = 100;

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
        Game.ui.notify("Il te faut un filet 🥅 pour attraper les papillons (au Magasin 🏪, 45💰) !");
        return;
    }
    // Tout papillon visible à l'écran peut être attrapé d'un clic
    if (Math.hypot(s.charlie.x - creature.x, s.charlie.y - creature.y) > 900) {
        Game.ui.notify("Trop loin ! Rapproche-toi 🦋");
        return;
    }
    if (!creature.speciesId) return;

    var sp = Game.BUTTERFLY_SPECIES[creature.speciesId];
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
        creature.y = 200 + Math.random() * (Game.CONFIG.BEACH_TOP - 350);
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
        if (r > 0.7) return '🦇'; // Chauves-souris (le seul hibou est Pedro, au musée)
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
