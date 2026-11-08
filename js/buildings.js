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

    // Boutiques, Musée ET maisons : on s'approche → bouton "Entrer" en bas à droite.
    // Le musée (nightOnly) ne s'ouvre que la nuit ; le hibou y reste enfermé.
    var nearShop = null;
    Game.SHOPS.forEach(function(shop) {
        var l = loc[shop.loc];
        if (Math.hypot(cx - l.x, cy - l.y) < (100 * proximityMult)) nearShop = shop;
    });

    // Maisons des villageois + maison de Charlie : même bouton "Entrer" que les boutiques
    var nearHouse = null;
    if (!nearShop) {
        if (Math.hypot(cx - loc.charlieHouse.x, cy - loc.charlieHouse.y) < (100 * proximityMult)) {
            nearHouse = Game.HOUSES.find(function(h){ return h.id === 'charlie'; });
        } else {
            Game.HOUSES.forEach(function(h) {
                if (h.id !== 'charlie' && Math.hypot(cx - h.x, cy - (h.y + 50)) < (80 * proximityMult)) nearHouse = h;
            });
        }
    }

    var enterPanel = document.getElementById('action-enter');
    var enterBtn = document.getElementById('enter-shop-btn');
    if (enterPanel && enterBtn) {
        if (nearShop && s.currentView === 'world' && !Game.buildings.isShopBuilt(nearShop.id)) {
            // Chantier : niveau requis puis matériaux
            enterPanel.style.display = 'flex';
            if (s.level < nearShop.level) {
                enterBtn.textContent = '🔒 Chantier ' + nearShop.name + ' — niveau ' + nearShop.level + ' requis';
                enterBtn.onclick = (function(sh){ return function() {
                    Game.ui.notify("Atteins le niveau " + sh.level + " pour construire : " + sh.name + " " + sh.sign);
                }; })(nearShop);
            } else {
                enterBtn.textContent = '🔨 Construire : ' + nearShop.name + ' (' + s.inventory.materials + '/' + nearShop.cost + ' 🧱)';
                enterBtn.onclick = (function(sh){ return function() { Game.buildings.buildShop(sh); }; })(nearShop);
            }
        } else if (nearShop && s.currentView === 'world') {
            enterPanel.style.display = 'flex';
            if (nearShop.nightOnly && !Game.time.isNight()) {
                enterBtn.textContent = '🌙 ' + nearShop.sign + ' ' + nearShop.name + ' — ouvre la nuit';
                enterBtn.onclick = function() { Game.ui.notify("Le musée du hibou ouvre seulement la nuit ! 🌙🦉"); };
            } else {
                enterBtn.textContent = '🚪 Entrer — ' + nearShop.sign + ' ' + nearShop.name;
                enterBtn.onclick = (function(id){ return function() { Game.buildings.enterShop(id); }; })(nearShop.id);
            }
        } else if (nearHouse && s.currentView === 'world') {
            enterPanel.style.display = 'flex';
            var isCharlie = nearHouse.id === 'charlie';
            if (!isCharlie && !Game.buildings.isHouseBuilt(nearHouse.id)) {
                // Terrain à bâtir : niveau requis puis matériaux
                var who = nearHouse.name.split(' ')[0];
                var what = nearHouse.plotEmoji ? 'Réparer le refuge de ' : 'Construire la maison de ';
                if (s.level < nearHouse.level) {
                    enterBtn.textContent = '🔒 ' + (nearHouse.plotLabel || 'Terrain à bâtir') + ' — niveau ' + nearHouse.level + ' requis';
                    enterBtn.onclick = (function(h){ return function() {
                        Game.ui.notify("Atteins le niveau " + h.level + " pour construire la maison de " + h.name.split(' ')[0] + " ⭐");
                    }; })(nearHouse);
                } else {
                    enterBtn.textContent = '🔨 ' + what + who + ' (' + s.inventory.materials + '/' + nearHouse.cost + ' 🧱)';
                    enterBtn.onclick = (function(h){ return function() { Game.buildings.buildVillagerHouse(h); }; })(nearHouse);
                }
            } else if (isCharlie && s.houseLevel < 4) {
                // Maison en construction : on la bâtit avec des matériaux
                if (s.inventory.materials > 0) {
                    enterBtn.textContent = '🔨 Construire ma maison';
                    enterBtn.onclick = function() { Game.buildings.buildHouse(); };
                } else {
                    enterBtn.textContent = '🔨 Ma maison — il faut des matériaux 🧱';
                    enterBtn.onclick = function() { Game.ui.notify("Il te faut des matériaux pour construire ta maison ! 🧱"); };
                }
            } else {
                var houseLabel = isCharlie ? '🏡 Ma maison' : ('🏠 Chez ' + nearHouse.name.split(' ')[0]);
                enterBtn.textContent = '🚪 Entrer — ' + houseLabel;
                enterBtn.onclick = (function(house){ return function() { Game.buildings.enterHouse(house); }; })(nearHouse);
            }
        } else {
            enterPanel.style.display = 'none';
        }
    }

    // Pêche : au bord de n'importe quelle eau (rivière, lacs, mer)
    var isNearRiver = Game.buildings.nearWater(cx, cy, isMobile ? 110 : 70);
    var riverPanel = document.getElementById('action-river');
    if (riverPanel) riverPanel.style.display = (isNearRiver && s.season !== 'winter') ? 'flex' : 'none';
};

Game.buildings.enterHouse = function(house) {
    var s = Game.state;
    if (s.currentView === 'interior') return;
    s.currentView = 'interior';
    s.activeHouse = house;
    s.activeShop = null;
    s.interiorCharlie = { x: 280, y: 450 };

    var enterPanel = document.getElementById('action-enter');
    if (enterPanel) enterPanel.style.display = 'none';

    var room = document.getElementById('current-room');
    // Drop any shop theme/sign/npc left over from a previous shop visit
    room.classList.remove('theme-bakery', 'theme-shop', 'theme-fishShop', 'theme-museum');
    var leftoverSign = document.getElementById('shop-sign');
    if (leftoverSign) leftoverSign.style.display = 'none';
    var leftoverPurpose = document.getElementById('shop-purpose');
    if (leftoverPurpose) leftoverPurpose.style.display = 'none';
    var leftoverNpc = document.getElementById('shop-npc');
    if (leftoverNpc) { leftoverNpc.style.display = 'none'; leftoverNpc.onclick = null; }
    // On fabrique des meubles seulement chez soi ; chez les villageois on utilise les leurs
    var craftButtons = document.getElementById('craft-buttons');
    if (craftButtons) craftButtons.style.display = house.id === 'charlie' ? '' : 'none';

    // Meubles de la maison : utilisables, déplaçables (voir furniture.js)
    if (!s.houseFurniture[house.id]) s.houseFurniture[house.id] = house.furniture.map(function(f){ return f.slice(); });
    Game.furniture.ensureHome(house);   // coin cuisine + coin télé (+ lit du villageois), une seule fois
    Game.furniture.render();

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

    // Ancien lit fixe du villageois : remplacé par un vrai meuble déplaçable (furniture.ensureHome)
    var oldBeds = room.querySelectorAll('.house-bed');
    for (var b = 0; b < oldBeds.length; b++) oldBeds[b].remove();
    if (house.id !== 'charlie' && Game.time.isNight() && Game.VILLAGER_DATA[house.name]) {
        Game.ui.notify(house.name.split(' ')[0] + " dort profondément 😴");
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
    document.body.classList.add('in-shop');   // téléphone : panneau d'achat en bas d'écran
    Game.furniture.fitRoom(true);

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

    // Plus personne qui dort ici : on enlève le lit / le dormeur d'une maison visitée avant
    room.querySelectorAll('.house-bed, .house-sleeper').forEach(function(el) { el.remove(); });
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
        if (shop.id === 'museum') {
            npc.onclick = function(e){ e.stopPropagation(); Game.buildings.talkToOwl(); };
            npc.style.cursor = 'pointer';
        } else if (shop.npcLine) {
            npc.onclick = (function(line){ return function(e){ e.stopPropagation(); Game.ui.notify(line); }; })(shop.npcLine);
            npc.style.cursor = 'pointer';
        } else {
            npc.onclick = null;
            npc.style.cursor = 'default';
        }
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
    if (shop.id === 'pizzeria' && Game.ui.updatePizzeria) Game.ui.updatePizzeria();
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
    Game.furniture.reset();
    document.body.classList.remove('in-shop');

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

Game.buildings.buildHouse = function() {
    var s = Game.state;
    var MAX = Game.HOUSE_STAGES.length - 1;   // dernier niveau = maison terminée
    if (s.houseLevel >= MAX) {                 // déjà finie : on n'ajoute rien
        Game.ui.notify("🏡 Ta maison est déjà construite !");
        return;
    }
    if (s.inventory.materials <= 0) {
        Game.ui.notify("Il te faut des matériaux 🧱");
        return;
    }
    s.inventory.materials--;
    s.houseLevel++;
    Game.xp.add(15);
    Game.world.updateHouseSite();
    Game.audio.play('craft');
    Game.particles.spawnWorld('🔨', Game.CONFIG.LOCATIONS.charlieHouse.x, Game.CONFIG.LOCATIONS.charlieHouse.y, { count: 3, spread: 30 });
    Game.ui.update();
    if (s.houseLevel >= MAX) {
        Game.ui.notify("🎉 Bravo ! Ta maison est enfin terminée ! 🏡");
    } else {
        Game.ui.notify("🔨 Construction niveau " + s.houseLevel + "/" + MAX + " !");
    }
    // Rafraîchit tout de suite le bouton (Construire → Entrer) sans attendre un déplacement
    Game.buildings.checkProximity();
};

// ── Terrains à bâtir : maisons des villageois débloquées par niveau + matériaux ──
Game.buildings.isHouseBuilt = function(id) {
    return Game.state.builtHouses.indexOf(id) !== -1;
};

// Maison d'un villageois (ou undefined s'il n'en a pas, comme Pedro au musée)
Game.buildings.houseOf = function(villagerName) {
    return Game.HOUSES.find(function(h){ return h.name === villagerName; });
};

// Un villageois habite au village si sa maison est construite (ou s'il n'a pas de maison)
Game.buildings.isVillagerHere = function(villagerName) {
    var h = Game.buildings.houseOf(villagerName);
    if (h) return Game.buildings.isHouseBuilt(h.id);
    // Habitant d'un bâtiment (Pedro au musée) : là seulement si le bâtiment est construit
    var shop = Game.SHOPS.find(function(sh){ return sh.resident === villagerName; });
    return !shop || Game.buildings.isShopBuilt(shop.id);
};

Game.buildings.isShopBuilt = function(id) {
    return Game.state.builtShops.indexOf(id) !== -1;
};

Game.buildings.buildShop = function(shop) {
    var s = Game.state;
    if (Game.buildings.isShopBuilt(shop.id)) return;
    if (s.level < shop.level) {
        Game.ui.notify("Atteins le niveau " + shop.level + " pour construire : " + shop.name + " ⭐");
        return;
    }
    if (s.inventory.materials < shop.cost) {
        Game.ui.notify("Il te faut " + shop.cost + " matériaux 🧱 (tu en as " + s.inventory.materials + "). Achète-en au Magasin 🏪 !");
        Game.audio.play('error');
        return;
    }
    s.inventory.materials -= shop.cost;
    s.builtShops.push(shop.id);
    Game.placeTag('loc:' + shop.loc, function() { Game.world.renderShopSite(shop); });
    if (Game.plaza) Game.plaza.placePoles();   // un mât de guirlande de plus devant la nouvelle boutique
    var l = Game.CONFIG.LOCATIONS[shop.loc];
    Game.xp.add(60);
    Game.audio.play('craft');
    Game.particles.spawnWorld('🔨', l.x, l.y, { count: 6, spread: 50 });
    Game.particles.confetti();
    Game.ui.notify("🎉 " + shop.sign + " " + shop.name + " : construction terminée ! Tu peux y entrer.", 'levelup');
    Game.ui.update();
    Game.quests.updateQuestTracker();
    Game.saveGame();
    Game.buildings.checkProximity();
};

Game.buildings.buildVillagerHouse = function(house) {
    var s = Game.state;
    var who = house.name.split(' ')[0];
    if (Game.buildings.isHouseBuilt(house.id)) return;
    if (s.level < house.level) {
        Game.ui.notify("Atteins le niveau " + house.level + " pour construire chez " + who + " ⭐");
        return;
    }
    if (s.inventory.materials < house.cost) {
        Game.ui.notify("Il te faut " + house.cost + " matériaux 🧱 (tu en as " + s.inventory.materials + "). Achète-en au Magasin 🏪 !");
        Game.audio.play('error');
        return;
    }
    s.inventory.materials -= house.cost;
    s.builtHouses.push(house.id);
    Game.placeTag('house:' + house.id, function() { Game.world.renderVillagerHouse(house); });
    if (Game.plaza) Game.plaza.placePoles();   // la guirlande relie aussi la nouvelle maison
    Game.villagers.spawn(house.name);
    Game.xp.add(30);
    Game.audio.play('craft');
    Game.particles.spawnWorld('🔨', house.x, house.y, { count: 5, spread: 40 });
    Game.particles.confetti();
    Game.ui.notify("🏠 La maison est construite ! " + house.name + " emménage au village !", 'levelup');
    Game.ui.update();
    Game.quests.updateQuestTracker();
    Game.saveGame();
    Game.buildings.checkProximity();
};

// Au passage de niveau : prévient quand un nouveau terrain devient constructible
Game.buildings.announceNewPlots = function(newLevel) {
    Game.HOUSES.forEach(function(h) {
        if (h.level === newLevel && !Game.buildings.isHouseBuilt(h.id)) {
            Game.ui.notify("🪧 Nouveau terrain ! Tu peux construire la maison de " + h.name + " (" + h.cost + " 🧱)", 'info');
        }
    });
    Game.SHOPS.forEach(function(sh) {
        if (sh.level === newLevel && !Game.buildings.isShopBuilt(sh.id)) {
            Game.ui.notify("🏗️ Nouveau chantier ! Tu peux construire : " + sh.name + " " + sh.sign + " (" + sh.cost + " 🧱)", 'info');
        }
    });
};

// Près de l'eau ? (rivière, lacs, bord de mer)
var _waterRects = null;
Game.buildings.nearWater = function(x, y, margin) {
    if (!_waterRects) {
        _waterRects = Game.buildRiverSegments().slice();
        document.querySelectorAll('#game-world .lake-water').forEach(function(el) {
            _waterRects.push({ x: parseFloat(el.style.left), y: parseFloat(el.style.top), w: el.offsetWidth, h: el.offsetHeight });
        });
    }
    if (Game.world.shorelineY && y > Game.world.shorelineY(x) - margin) return true;
    for (var i = 0; i < _waterRects.length; i++) {
        var r = _waterRects[i];
        var dx = (x - (r.x + r.w / 2)) / (r.w / 2 + margin), dy = (y - (r.y + r.h / 2)) / (r.h / 2 + margin);
        if (dx * dx + dy * dy < 1) return true;
    }
    return false;
};

})();
