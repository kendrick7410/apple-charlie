// ── buildings.js ── Interactions bâtiments + intérieurs ──
(function(){
"use strict";

Game.buildings = {};

Game.buildings.checkProximity = function() {
    var s = Game.state;
    var cx = s.charlie.x, cy = s.charlie.y;
    var loc = Game.CONFIG.LOCATIONS;

    // Larger proximity radius on mobile for easier interaction
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    var proximityMult = isMobile ? 1.5 : 1;

    // Fountain
    var fountainPanel = document.getElementById('action-fountain');
    if (fountainPanel) fountainPanel.style.display = Math.hypot(cx - loc.fountain.x, cy - loc.fountain.y) < (120 * proximityMult) ? 'flex' : 'none';

    // Bakery
    var bakeryPanel = document.getElementById('action-bakery');
    if (bakeryPanel) bakeryPanel.style.display = Math.hypot(cx - loc.bakery.x, cy - loc.bakery.y) < (100 * proximityMult) ? 'flex' : 'none';

    // Shop
    var shopPanel = document.getElementById('action-shop');
    if (shopPanel) shopPanel.style.display = Math.hypot(cx - loc.shop.x, cy - loc.shop.y) < (100 * proximityMult) ? 'flex' : 'none';

    // Fish Shop
    var fishShopPanel = document.getElementById('action-fishShop');
    if (fishShopPanel) fishShopPanel.style.display = Math.hypot(cx - loc.fishShop.x, cy - loc.fishShop.y) < (100 * proximityMult) ? 'flex' : 'none';

    // Museum
    var museumPanel = document.getElementById('action-museum');
    if (museumPanel) {
        var nearMuseum = Math.hypot(cx - loc.museum.x, cy - loc.museum.y) < (100 * proximityMult);
        museumPanel.style.display = nearMuseum ? 'flex' : 'none';
        if (nearMuseum) Game.ui.updateMuseum();
    }

    // River fishing - wider zone on mobile
    var riverMargin = isMobile ? 100 : 0;
    var isNearRiver = cx > (450 - riverMargin) && cx < (750 + riverMargin);
    var isNearBridge = (cy > 930 && cy < 1050) || (cy > 1780 && cy < 1900);
    var riverPanel = document.getElementById('action-river');
    if (riverPanel) riverPanel.style.display = (isNearRiver && !isNearBridge && s.season !== 'winter') ? 'flex' : 'none';

    // Charlie's house
    if (Math.hypot(cx - loc.charlieHouse.x, cy - loc.charlieHouse.y) < (100 * proximityMult)) {
        if (s.houseLevel < 4) {
            if (s.inventory.materials > 0) Game.buildings.buildHouse();
        } else {
            Game.buildings.enterHouse(Game.HOUSES.find(function(h){ return h.id === 'charlie'; }));
        }
    }

    // NPC houses
    Game.HOUSES.forEach(function(h) {
        if (h.id !== 'charlie' && Math.hypot(cx - h.x, cy - (h.y + 50)) < (60 * proximityMult)) {
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

    // Load furniture from state (draggable)
    var furnitureList = s.houseFurniture[house.id] || house.furniture;
    furnitureList.forEach(function(f, idx) {
        var div = document.createElement('div');
        div.className = 'furniture';
        div.textContent = f[0];
        div.style.left = f[1] + 'px';
        div.style.top = f[2] + 'px';
        div.style.cursor = 'grab';
        div.dataset.fIdx = idx;
        Game.buildings.makeDraggable(div, house.id, idx);
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

Game.buildings.makeDraggable = function(el, houseId, fIdx) {
    var dragging = false;
    var offsetX, offsetY;
    el.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        dragging = true;
        el.style.cursor = 'grabbing';
        var room = document.getElementById('current-room');
        var rect = room.getBoundingClientRect();
        offsetX = e.clientX - rect.left - parseInt(el.style.left);
        offsetY = e.clientY - rect.top - parseInt(el.style.top);
    });
    document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        var room = document.getElementById('current-room');
        var rect = room.getBoundingClientRect();
        var nx = e.clientX - rect.left - offsetX;
        var ny = e.clientY - rect.top - offsetY;
        // Snap to 20px grid
        nx = Math.round(nx / 20) * 20;
        ny = Math.round(ny / 20) * 20;
        nx = Math.max(0, Math.min(540, nx));
        ny = Math.max(0, Math.min(540, ny));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
    });
    document.addEventListener('mouseup', function() {
        if (!dragging) return;
        dragging = false;
        el.style.cursor = 'grab';
        // Save position
        var s = Game.state;
        if (s.houseFurniture[houseId] && s.houseFurniture[houseId][fIdx]) {
            s.houseFurniture[houseId][fIdx][1] = parseInt(el.style.left);
            s.houseFurniture[houseId][fIdx][2] = parseInt(el.style.top);
        }
    });
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
