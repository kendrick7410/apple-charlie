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

    // Shops + Musée : on s'approche → bouton "Entrer". Les actions sont à l'intérieur.
    // Le musée (nightOnly) ne s'ouvre que la nuit ; le hibou y reste enfermé.
    var nearShop = null;
    Game.SHOPS.forEach(function(shop) {
        var l = loc[shop.loc];
        if (Math.hypot(cx - l.x, cy - l.y) < (100 * proximityMult)) nearShop = shop;
    });
    var enterPanel = document.getElementById('action-enter');
    var enterBtn = document.getElementById('enter-shop-btn');
    if (enterPanel && enterBtn) {
        if (nearShop && s.currentView === 'world') {
            enterPanel.style.display = 'flex';
            if (nearShop.nightOnly && !Game.time.isNight()) {
                enterBtn.textContent = '🌙 ' + nearShop.sign + ' ' + nearShop.name + ' — ouvre la nuit';
                enterBtn.onclick = function() { Game.ui.notify("Le musée du hibou ouvre seulement la nuit ! 🌙🦉"); };
            } else {
                enterBtn.textContent = '🚪 Entrer — ' + nearShop.sign + ' ' + nearShop.name;
                enterBtn.onclick = (function(id){ return function() { Game.buildings.enterShop(id); }; })(nearShop.id);
            }
        } else {
            enterPanel.style.display = 'none';
        }
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
    s.activeShop = null;
    s.interiorCharlie = { x: 280, y: 450 };

    var room = document.getElementById('current-room');
    // Drop any shop theme/sign/npc left over from a previous shop visit
    room.classList.remove('theme-bakery', 'theme-shop', 'theme-fishShop', 'theme-museum');
    var leftoverSign = document.getElementById('shop-sign');
    if (leftoverSign) leftoverSign.style.display = 'none';
    var leftoverPurpose = document.getElementById('shop-purpose');
    if (leftoverPurpose) leftoverPurpose.style.display = 'none';
    var leftoverNpc = document.getElementById('shop-npc');
    if (leftoverNpc) { leftoverNpc.style.display = 'none'; leftoverNpc.onclick = null; }
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

    // Étagère de boules à neige (uniquement chez Charlie)
    var oldGlobes = room.querySelectorAll('.snow-globe-display');
    for (var g = 0; g < oldGlobes.length; g++) oldGlobes[g].remove();
    if (house.id === 'charlie' && s.snowGlobes.length) {
        s.snowGlobes.forEach(function(gid, i) {
            var data = null;
            for (var k = 0; k < Game.SNOW_GLOBES.length; k++) { if (Game.SNOW_GLOBES[k].id === gid) data = Game.SNOW_GLOBES[k]; }
            if (!data) return;
            var el = document.createElement('div');
            el.className = 'snow-globe-display';
            el.title = data.name;
            el.textContent = data.emoji;
            el.style.left = (30 + (i % 8) * 64) + 'px';
            el.style.top = (24 + Math.floor(i / 8) * 70) + 'px';
            room.appendChild(el);
        });
    }

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

Game.buildings.enterShop = function(shopId) {
    var s = Game.state;
    if (s.currentView === 'interior') return;
    var shop = Game.SHOPS.find(function(sh){ return sh.id === shopId; });
    if (!shop) return;
    // Le musée ne s'ouvre que la nuit
    if (shop.nightOnly && !Game.time.isNight()) {
        Game.ui.notify("Le musée du hibou ouvre seulement la nuit ! 🌙🦉");
        return;
    }

    s.currentView = 'interior';
    s.activeShop = shop;
    s.activeHouse = null;
    s.interiorCharlie = { x: 280, y: 440 };

    var room = document.getElementById('current-room');

    // Apply shop theme (floor / wall colors)
    room.classList.remove('theme-bakery', 'theme-shop', 'theme-fishShop', 'theme-museum');
    room.classList.add('theme-' + shop.theme);

    // Shop sign banner
    var sign = document.getElementById('shop-sign');
    if (!sign) {
        sign = document.createElement('div');
        sign.id = 'shop-sign';
        room.appendChild(sign);
    }
    sign.textContent = shop.sign + ' ' + shop.name;
    sign.style.display = 'block';

    // Purpose banner — explains clearly what you do in this shop
    var purpose = document.getElementById('shop-purpose');
    if (!purpose) {
        purpose = document.createElement('div');
        purpose.id = 'shop-purpose';
        room.appendChild(purpose);
    }
    purpose.textContent = shop.purpose || '';
    purpose.style.display = shop.purpose ? 'block' : 'none';

    // Clear any furniture / decor then place this shop's decor (non-draggable)
    var old = room.querySelectorAll('.furniture');
    for (var i = 0; i < old.length; i++) old[i].remove();
    shop.decor.forEach(function(f) {
        var div = document.createElement('div');
        div.className = 'furniture shop-decor';
        div.textContent = f[0];
        div.style.left = f[1] + 'px';
        div.style.top = f[2] + 'px';
        room.appendChild(div);
    });

    // Shopkeeper NPC behind the counter (clickable for the museum owl's quests)
    var npc = document.getElementById('shop-npc');
    if (!npc) {
        npc = document.createElement('div');
        npc.id = 'shop-npc';
        room.appendChild(npc);
    }
    if (shop.npc) {
        npc.textContent = shop.npc;
        npc.style.display = 'block';
        npc.onclick = (shop.id === 'museum')
            ? function(e){ e.stopPropagation(); Game.buildings.talkToOwl(); }
            : null;
        npc.style.cursor = (shop.id === 'museum') ? 'pointer' : 'default';
    } else {
        npc.style.display = 'none';
        npc.onclick = null;
    }

    // Hide the furniture-crafting bar (houses only)
    var craftBar = document.getElementById('interior-craft-bar');
    if (craftBar) craftBar.style.display = 'none';

    // Show only this shop's action panel, lifted above the interior overlay
    Game.SHOPS.forEach(function(sh) {
        var p = document.getElementById(sh.panel);
        if (p) { p.style.display = 'none'; p.style.zIndex = ''; }
    });
    var panel = document.getElementById(shop.panel);
    if (panel) {
        panel.style.display = 'flex';
        panel.style.zIndex = 6000;
    }

    // Refresh shop-specific content
    if (shop.id === 'shop') Game.ui.updateShop();
    if (shop.id === 'bakery') {
        var cookPanel = document.getElementById('cooking-panel');
        if (cookPanel) cookPanel.style.display = 'block';
        if (Game.ui.updateCooking) Game.ui.updateCooking();
    }
    if (shop.id === 'museum') {
        Game.ui.updateMuseum();
        if (Game.ui.updateOwlShop) Game.ui.updateOwlShop();
    }
    if (shop.id === 'souvenir' && Game.ui.updateSouvenirShop) Game.ui.updateSouvenirShop();
    Game.ui.update();

    document.getElementById('action-enter').style.display = 'none';
    document.getElementById('interior-view').style.display = 'flex';
    var ic = document.getElementById('interior-charlie');
    if (ic) {
        ic.style.left = s.interiorCharlie.x + 'px';
        ic.style.top = s.interiorCharlie.y + 'px';
    }

    Game.ui.notify("Bienvenue : " + shop.sign + " " + shop.name);
};

// Le hibou du musée : termine ses quêtes ou raconte un dialogue (il ne sort jamais)
Game.buildings.talkToOwl = function() {
    var name = 'Pedro 🦉';
    if (Game.quests.canComplete(name)) {
        Game.quests.complete(name);
    } else {
        Game.villagers.showDialogue(name, null);
    }
};

Game.buildings.exitHouse = function() {
    var s = Game.state;
    s.currentView = 'world';
    document.getElementById('interior-view').style.display = 'none';

    // Clean up shop interior if we were in one
    if (s.activeShop) {
        var room = document.getElementById('current-room');
        room.classList.remove('theme-bakery', 'theme-shop', 'theme-fishShop', 'theme-museum');
        var sign = document.getElementById('shop-sign');
        if (sign) sign.style.display = 'none';
        var purpose = document.getElementById('shop-purpose');
        if (purpose) purpose.style.display = 'none';
        var npc = document.getElementById('shop-npc');
        if (npc) { npc.style.display = 'none'; npc.onclick = null; }
        var decor = room.querySelectorAll('.shop-decor');
        for (var i = 0; i < decor.length; i++) decor[i].remove();
        var panel = document.getElementById(s.activeShop.panel);
        if (panel) { panel.style.display = 'none'; panel.style.zIndex = ''; }
        var cookPanel = document.getElementById('cooking-panel');
        if (cookPanel) cookPanel.style.display = 'none';
    }

    // Restore the furniture-crafting bar for houses
    var craftBar = document.getElementById('interior-craft-bar');
    if (craftBar) craftBar.style.display = '';

    s.charlie.y += 80;
    s.charlie.visualY += 80;
    s.activeHouse = null;
    s.activeShop = null;
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
