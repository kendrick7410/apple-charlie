// ── player.js ── Mouvement fluide de Charlie + animations ──
(function(){
"use strict";

var walkFrame = 0;
var walkTimer = 0;
var WALK_FRAME_INTERVAL = 200;
var stepSoundTimer = 0;

Game.player = {};

Game.player.init = function() {
    var world = document.getElementById('game-world');
    var p = document.createElement('div');
    p.id = 'player';
    p.className = 'entity charlie-sprite';
    p.innerHTML = '🤠';
    world.appendChild(p);
};

Game.player.update = function(dt, now) {
    var s = Game.state;
    if (s.currentView !== 'world') return;

    var speed = Game.CONFIG.PLAYER_SPEED;
    var moved = false;
    var keys = s.keysDown;

    // Movement input
    var dx = 0, dy = 0;
    if (keys['ArrowUp'] || keys['z'] || keys['w'] || keys['Z'] || keys['W']) { dy = -1; s.charlie.facing = 'up'; }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) { dy = 1; s.charlie.facing = 'down'; }
    if (keys['ArrowLeft'] || keys['q'] || keys['a'] || keys['Q'] || keys['A']) { dx = -1; s.charlie.facing = 'left'; }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) { dx = 1; s.charlie.facing = 'right'; }

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
    }

    if (dx !== 0 || dy !== 0) {
        s.charlie.x += dx * speed;
        s.charlie.y += dy * speed;
        s.charlie.walking = true;
        moved = true;
    } else {
        s.charlie.walking = false;
    }

    // Clamp
    s.charlie.x = Math.max(30, Math.min(Game.CONFIG.WORLD_W - 30, s.charlie.x));
    s.charlie.y = Math.max(30, Math.min(Game.CONFIG.WORLD_H - 30, s.charlie.y));

    // Smooth interpolation (lerp)
    var lerp = Game.CONFIG.LERP_SPEED;
    s.charlie.visualX += (s.charlie.x - s.charlie.visualX) * lerp;
    s.charlie.visualY += (s.charlie.y - s.charlie.visualY) * lerp;

    // Update DOM
    var p = document.getElementById('player');
    if (p) {
        p.style.left = s.charlie.visualX + 'px';
        p.style.top = s.charlie.visualY + 'px';

        // Walk animation
        if (s.charlie.walking) {
            walkTimer += dt;
            if (walkTimer >= WALK_FRAME_INTERVAL) {
                walkTimer = 0;
                walkFrame = (walkFrame + 1) % 2;
                p.style.transform = walkFrame === 1 ? 'scaleX(-1)' : 'scaleX(1)';
            }
            // Step sounds
            stepSoundTimer += dt;
            if (stepSoundTimer > 300) {
                stepSoundTimer = 0;
                Game.audio.play('step');
            }
        } else {
            p.style.transform = 'scaleX(1)';
            walkTimer = 0;
            stepSoundTimer = 0;
        }
    }

    // Camera
    Game.player.updateCamera();

    // Check interactions
    if (moved) {
        Game.buildings.checkProximity();
        Game.entities.checkCollect();
    }
};

Game.player.updateCamera = function() {
    var s = Game.state;
    var tx = -(s.charlie.visualX - window.innerWidth / 2);
    var ty = -(s.charlie.visualY - window.innerHeight / 2);
    var world = document.getElementById('game-world');
    if (world) world.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
};

Game.player.teleport = function(x, y) {
    var s = Game.state;
    s.charlie.x = x;
    s.charlie.y = y;
    s.charlie.visualX = x;
    s.charlie.visualY = y;
    Game.player.updateCamera();
};

// Click-to-move or shovel
Game.player.handleClick = function(e) {
    if (Game.state.currentView !== 'world') return;
    var world = document.getElementById('game-world');
    var rect = world.getBoundingClientRect();
    var worldX = e.clientX - rect.left;
    var worldY = e.clientY - rect.top;

    // If shovel mode, place path instead of moving
    if (Game.state.shovelMode && Game.state.tools.shovel) {
        Game.tools.placePath(worldX, worldY);
        return;
    }

    Game.state.charlie.x = worldX;
    Game.state.charlie.y = worldY;
};

// Interior movement
Game.player.updateInterior = function(dt) {
    var s = Game.state;
    if (s.currentView !== 'interior') return;

    var speed = Game.CONFIG.PLAYER_SPEED * 0.8;
    var keys = s.keysDown;
    var dx = 0, dy = 0;

    if (keys['ArrowUp'] || keys['z'] || keys['w'] || keys['Z'] || keys['W']) dy = -1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = 1;
    if (keys['ArrowLeft'] || keys['q'] || keys['a'] || keys['Q'] || keys['A']) dx = -1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    s.interiorCharlie.x += dx * speed;
    s.interiorCharlie.y += dy * speed;
    s.interiorCharlie.x = Math.max(20, Math.min(540, s.interiorCharlie.x));
    s.interiorCharlie.y = Math.max(20, Math.min(540, s.interiorCharlie.y));

    var ic = document.getElementById('interior-charlie');
    if (ic) {
        ic.style.left = s.interiorCharlie.x + 'px';
        ic.style.top = s.interiorCharlie.y + 'px';
    }

    // Exit check
    if (s.interiorCharlie.y > 480 && s.interiorCharlie.x > 230 && s.interiorCharlie.x < 370) {
        Game.buildings.exitHouse();
    }
};

})();
