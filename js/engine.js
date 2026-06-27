// ── engine.js ── Boucle de jeu (requestAnimationFrame) + inputs ──
(function(){
"use strict";

var lastTime = 0;
var fishJumpTimer = 0;
var fishShopTimer = 0;
var villageRevenueTimer = 0;
var hungerTimer = 0;

Game.engine = {};

Game.engine.init = function() {
    // Input handlers
    window.addEventListener('keydown', function(e) {
        if (Game.state.currentView === 'title') return;
        var key = e.key;
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(key) > -1) e.preventDefault();
        var alreadyDown = Game.state.keysDown[key.toLowerCase()];
        Game.state.keysDown[key] = true;
        Game.state.keysDown[key.toLowerCase()] = true;
        // Touche N : menu de téléportation (une fois par appui)
        if (!alreadyDown && key.toLowerCase() === 'n') Game.ui.toggleTeleport();
    });

    window.addEventListener('keyup', function(e) {
        var key = e.key;
        delete Game.state.keysDown[key];
        delete Game.state.keysDown[key.toLowerCase()];
    });

    // Click/Touch to move (world)
    var viewport = document.getElementById('viewport');

    function handleMoveInput(e) {
        if (Game.state.currentView !== 'world') return;
        if (e.target.closest('button, .ui-card, #action-fountain, #action-bakery, #action-shop, #action-river, #action-fishShop, #action-museum, .building-label, .villager-sprite, .garden-cell, #mobile-toggle, #joystick')) return;
        Game.audio.resume();
        Game.player.handleClick(e);
    }

    viewport.addEventListener('mousedown', handleMoveInput);
    viewport.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            // Simulate mouse event for touch
            var touch = e.touches[0];
            var mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            mouseEvent.clientX = touch.clientX;
            mouseEvent.clientY = touch.clientY;
            handleMoveInput(mouseEvent);
        }
    });

    // Touch joystick support
    Game.engine.initJoystick();
};

Game.engine.initJoystick = function() {
    var btns = document.querySelectorAll('#joystick button');
    var dirs = [
        { dx: 0, dy: -1 }, // up
        { dx: -1, dy: 0 }, // left
        { dx: 0, dy: 1 },  // down
        { dx: 1, dy: 0 }   // right
    ];
    var activeInterval = null;

    btns.forEach(function(btn, i) {
        var dir = dirs[i];

        function startMove() {
            Game.audio.resume();

            // Clear any existing interval
            if (activeInterval) {
                clearInterval(activeInterval);
            }

            // Move immediately on press
            move();

            // Continue moving while held
            activeInterval = setInterval(function() {
                move();
            }, 100);
        }

        function move() {
            if (Game.state.currentView === 'world') {
                // Direct position update for joystick - smoother movement
                var hungerMul = Game.state.hunger <= 0 ? 0.55 : 1;  // affamé = plus lent
                Game.state.charlie.x += dir.dx * (Game.CONFIG.TILE * 0.72) * hungerMul;
                Game.state.charlie.y += dir.dy * (Game.CONFIG.TILE * 0.72) * hungerMul;

                // IMPORTANT: Check for collectibles and building proximity after moving
                Game.buildings.checkProximity();
                Game.entities.checkCollect();
            } else if (Game.state.currentView === 'interior') {
                Game.state.interiorCharlie.x += dir.dx * (Game.CONFIG.TILE * 0.5);
                Game.state.interiorCharlie.y += dir.dy * (Game.CONFIG.TILE * 0.5);
                Game.state.interiorCharlie.x = Math.max(20, Math.min(540, Game.state.interiorCharlie.x));
                Game.state.interiorCharlie.y = Math.max(20, Math.min(540, Game.state.interiorCharlie.y));
                var ic = document.getElementById('interior-charlie');
                if (ic) {
                    ic.style.left = Game.state.interiorCharlie.x + 'px';
                    ic.style.top = Game.state.interiorCharlie.y + 'px';
                }
                if (Game.state.interiorCharlie.y > 480 && Game.state.interiorCharlie.x > 230 && Game.state.interiorCharlie.x < 370) {
                    Game.buildings.exitHouse();
                }
            }
        }

        function stopMove() {
            if (activeInterval) {
                clearInterval(activeInterval);
                activeInterval = null;
            }
        }

        // Mouse events
        btn.onmousedown = function(e) {
            e.preventDefault();
            startMove();
        };

        btn.onmouseup = btn.onmouseleave = function(e) {
            e.preventDefault();
            stopMove();
        };

        // Touch events
        btn.ontouchstart = function(e) {
            e.preventDefault();
            startMove();
        };

        btn.ontouchend = btn.ontouchcancel = function(e) {
            e.preventDefault();
            stopMove();
        };
    });
};

Game.engine.loop = function(now) {
    requestAnimationFrame(Game.engine.loop);

    if (Game.state.currentView === 'title' || Game.state.paused) return;

    var dt = now - lastTime;
    if (dt > 100) dt = 16; // Cap delta
    lastTime = now;

    // Update systems
    Game.time.update(now);
    Game.player.update(dt, now);
    Game.player.updateInterior(dt);
    Game.villagers.update(dt);
    Game.farming.update(dt);
    Game.creatures.update(dt);
    Game.mountain.update(dt, now);
    Game.coast.update(dt);
    Game.forest.update(dt);
    Game.particles.update(now);
    Game.weather.update(dt);

    // Faim qui se vide lentement
    hungerTimer += dt;
    if (hungerTimer >= Game.CONFIG.HUNGER_DRAIN_MS) {
        hungerTimer = 0;
        if (Game.state.hunger > 0) {
            Game.state.hunger = Math.max(0, Game.state.hunger - 1);
            Game.ui.update();
            if (Game.state.hunger === 30) Game.ui.notify("🍽️ Tu commences à avoir faim...");
            else if (Game.state.hunger === 0) Game.ui.notify("🍽️ Tu as très faim ! Mange vite (bouton 🍴 Manger).");
        }
    }

    // Fish shop passive selling
    fishShopTimer += dt;
    if (fishShopTimer >= Game.CONFIG.FISH_SHOP_SELL_INTERVAL) {
        fishShopTimer = 0;
        if (Game.state.fishShop.stock > 0) {
            Game.state.fishShop.stock--;
            Game.state.fishShop.revenue += Game.CONFIG.FISH_SHOP_SELL_PRICE;
            Game.ui.update();
        }
    }

    // Village revenue
    villageRevenueTimer += dt;
    if (villageRevenueTimer >= 60000) { // every real minute = 1 game day of revenue
        villageRevenueTimer = 0;
        var totalIncome = 0;
        for (var vn in Game.VILLAGER_JOBS) {
            totalIncome += Game.VILLAGER_JOBS[vn].income;
        }
        if (totalIncome > 0) {
            Game.state.villageRevenue += totalIncome;
        }
    }

    // Periodic updates
    fishJumpTimer += dt;
    if (fishJumpTimer > 8000) {
        fishJumpTimer = 0;
        if (Math.random() > 0.5) Game.creatures.spawnJumpingFish();
    }

    // Update minimap every few frames
    if (Math.floor(now / 500) !== Math.floor((now - dt) / 500)) {
        Game.minimap.update();
        Game.ui.updateClock();
        Game.quests.updateQuestTracker();
    }

    // Time overlay
    Game.engine.updateTimeOverlay();
};

Game.engine.updateTimeOverlay = function() {
    var overlay = document.getElementById('time-overlay');
    if (overlay) {
        overlay.style.background = Game.time.getOverlayColor();
    }
};

Game.engine.start = function() {
    lastTime = performance.now();
    requestAnimationFrame(Game.engine.loop);
};

})();
