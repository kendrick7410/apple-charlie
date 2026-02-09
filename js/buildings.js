// ── buildings.js ── Interactions bâtiments + intérieurs ──
(function(){
"use strict";

Game.buildings = {};

Game.buildings.checkProximity = function() {
    var s = Game.state;
    var cx = s.charlie.x, cy = s.charlie.y;
    var loc = Game.CONFIG.LOCATIONS;

    // Fountain
    var fountainPanel = document.getElementById('action-fountain');
    if (fountainPanel) fountainPanel.style.display = Math.hypot(cx - loc.fountain.x, cy - loc.fountain.y) < 120 ? 'flex' : 'none';

    // Bakery
    var bakeryPanel = document.getElementById('action-bakery');
    if (bakeryPanel) bakeryPanel.style.display = Math.hypot(cx - loc.bakery.x, cy - loc.bakery.y) < 100 ? 'flex' : 'none';

    // Shop
    var shopPanel = document.getElementById('action-shop');
    if (shopPanel) shopPanel.style.display = Math.hypot(cx - loc.shop.x, cy - loc.shop.y) < 100 ? 'flex' : 'none';

    // River fishing
    var isNearRiver = cx > 450 && cx < 750;
    var isNearBridge = (cy > 930 && cy < 1050) || (cy > 1780 && cy < 1900);
    var riverPanel = document.getElementById('action-river');
    if (riverPanel) riverPanel.style.display = (isNearRiver && !isNearBridge && s.season !== 'winter') ? 'flex' : 'none';

    // Charlie's house
    if (Math.hypot(cx - loc.charlieHouse.x, cy - loc.charlieHouse.y) < 100) {
        if (s.houseLevel < 4) {
            if (s.inventory.materials > 0) Game.buildings.buildHouse();
        } else {
            Game.buildings.enterHouse(Game.HOUSES.find(function(h){ return h.id === 'charlie'; }));
        }
    }

    // NPC houses
    Game.HOUSES.forEach(function(h) {
        if (h.id !== 'charlie' && Math.hypot(cx - h.x, cy - (h.y + 50)) < 60) {
            Game.buildings.enterHouse(h);
        }
    });
};

Game.buildings.enterHouse = function(house) {
    var s = Game.state;
    if (s.currentView === 'interior') return;
    s.currentView = 'interior';
    s.activeHouse = house;
    s.interiorCharlie = { x: 280, y: 450 };

    var room = document.getElementById('current-room');
    // Clear old furniture
    var old = room.querySelectorAll('.furniture');
    for (var i = 0; i < old.length; i++) old[i].remove();

    // Load furniture from state
    var furnitureList = s.houseFurniture[house.id] || house.furniture;
    furnitureList.forEach(function(f) {
        var div = document.createElement('div');
        div.className = 'furniture';
        div.textContent = f[0];
        div.style.left = f[1] + 'px';
        div.style.top = f[2] + 'px';
        room.appendChild(div);
    });

    document.getElementById('interior-view').style.display = 'flex';
    // Show cooking panel only when entering from bakery proximity
    var cookPanel = document.getElementById('cooking-panel');
    if (cookPanel) {
        var nearBakery = Math.hypot(s.charlie.x - Game.CONFIG.LOCATIONS.bakery.x, s.charlie.y - Game.CONFIG.LOCATIONS.bakery.y) < 120;
        cookPanel.style.display = nearBakery ? 'block' : 'none';
    }

    var ic = document.getElementById('interior-charlie');
    if (ic) {
        ic.style.left = s.interiorCharlie.x + 'px';
        ic.style.top = s.interiorCharlie.y + 'px';
    }

    Game.ui.notify("Bienvenue chez " + house.name);
};

Game.buildings.exitHouse = function() {
    var s = Game.state;
    s.currentView = 'world';
    document.getElementById('interior-view').style.display = 'none';
    s.charlie.y += 80;
    s.charlie.visualY += 80;
    s.activeHouse = null;
    Game.player.updateCamera();
};

Game.buildings.buildHouse = function() {
    var s = Game.state;
    s.inventory.materials--;
    s.houseLevel++;
    Game.xp.add(15);
    Game.world.updateHouseSite();
    Game.audio.play('craft');
    Game.particles.spawnWorld('🔨', Game.CONFIG.LOCATIONS.charlieHouse.x, Game.CONFIG.LOCATIONS.charlieHouse.y, { count: 3, spread: 30 });
    Game.ui.update();
    Game.ui.notify("🔨 Construction niveau " + s.houseLevel + " !");
};

})();
