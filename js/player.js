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
    Game.player.applySkin();
};

// Bonus du skin équipé (valeurs neutres si aucun pouvoir)
Game.player.skinBonus = function() {
    var pw = (Game.getSkin ? (Game.getSkin(Game.state.skin) || {}).power : null) || {};
    return { speed: pw.speed || 1, xp: pw.xp || 1, hunger: pw.hunger || 1, fish: pw.fish || 1, radius: pw.radius || 0 };
};

// Applique l'apparence du skin équipé à Charlie (monde + intérieur)
Game.player.applySkin = function() {
    var sk = Game.getSkin ? Game.getSkin(Game.state.skin) : null;
    var emoji = (sk && sk.emoji) || '🤠';
    var p = document.getElementById('player');
    if (p) p.innerHTML = emoji;
    var ic = document.getElementById('interior-charlie');
    if (ic) ic.textContent = emoji;
};

Game.player.update = function(dt, now) {
    var s = Game.state;
    if (s.currentView !== 'world') return;

    // Même vitesse partout sur la carte (seul le skin peut donner un bonus).
    // PLAYER_SPEED est en pixels par image à 60 images/s : on le cale sur le temps réel (dt),
    // sinon Charlie ralentit là où l'ordinateur affiche moins d'images (montagnes...).
    var speed = Game.CONFIG.PLAYER_SPEED * Game.player.skinBonus().speed * (dt || 16.67) / 16.67;
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
    // Joystick tactile (pouce gauche) : direction et vitesse selon jusqu'où on pousse
    if (s.joy && (s.joy.x || s.joy.y)) { dx = s.joy.x; dy = s.joy.y; }

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
    // On ne marche pas dans la mer : on s'arrête au bord de l'eau (côte courbe)
    if (Game.world.shorelineY) {
        var shore = Game.world.shorelineY(s.charlie.x) - 14;
        // En 3D on peut entrer dans la mer et nager (jusqu'à une certaine distance du bord)
        var seaLimit = (Game.r3d && Game.r3d.renderer) ? shore + 450 : shore;
        if (s.charlie.y > seaLimit) s.charlie.y = seaLimit;
    }
    // Vue 3D : on bute contre les maisons, arbres... AVANT de dessiner (sinon Charlie y entre un instant)
    if (Game.player.afterMove) Game.player.afterMove();

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
    if (Game.buildings && Game.buildings.checkProximity) Game.buildings.checkProximity();   // boutons à jour (Entrer, Pêcher...)
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
    Game.furniture.fitRoom();
    Game.furniture.update(dt);
    if (Game.furniture.isBusy()) return;   // Charlie lit, dort, joue du piano... il ne bouge pas

    var speed = Game.CONFIG.PLAYER_SPEED * 0.8 * (dt || 16.67) / 16.67;   // calé sur le temps réel
    var keys = s.keysDown;
    var dx = 0, dy = 0;

    if (keys['ArrowUp'] || keys['z'] || keys['w'] || keys['Z'] || keys['W']) dy = -1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = 1;
    if (keys['ArrowLeft'] || keys['q'] || keys['a'] || keys['Q'] || keys['A']) dx = -1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = 1;

    // Pas de touche appuyée : marche vers l'endroit touché / cliqué
    if (dx !== 0 || dy !== 0) {
        s.interiorTarget = null;
    } else if (s.interiorTarget) {
        var tx = s.interiorTarget.x - s.interiorCharlie.x, ty = s.interiorTarget.y - s.interiorCharlie.y;
        var td = Math.hypot(tx, ty);
        if (td < speed) { s.interiorTarget = null; }
        else { dx = tx / td; dy = ty / td; }
    }

    if (dx !== 0 && dy !== 0 && !s.interiorTarget) { dx *= 0.7071; dy *= 0.7071; }
    if (s.joy && (s.joy.x || s.joy.y)) { dx = s.joy.x; dy = s.joy.y; s.interiorTarget = null; }

    // Charlie ne traverse ni les meubles ni le comptoir : on avance axe par axe (il glisse le long)
    var ox = s.interiorCharlie.x, oy = s.interiorCharlie.y;
    var nx = Math.max(20, Math.min(522, ox + dx * speed));
    if (!Game.furniture.blocks(ox, oy, nx, oy)) s.interiorCharlie.x = nx;
    var ny = Math.max(20, Math.min(540, oy + dy * speed));
    if (!Game.furniture.blocks(s.interiorCharlie.x, oy, s.interiorCharlie.x, ny)) s.interiorCharlie.y = ny;
    // Bloqué contre un meuble en marchant vers un point : on s'arrête là
    if (s.interiorTarget && Math.hypot(s.interiorCharlie.x - ox, s.interiorCharlie.y - oy) < speed * 0.1) s.interiorTarget = null;

    var ic = document.getElementById('interior-charlie');
    if (ic) {
        ic.style.left = s.interiorCharlie.x + 'px';
        ic.style.top = s.interiorCharlie.y + 'px';
    }

    // Exit check
    if (s.interiorCharlie.y > 480 && s.interiorCharlie.x > 230 && s.interiorCharlie.x < 370) {
        s.interiorTarget = null;
        Game.buildings.exitHouse();
    }
};

})();
