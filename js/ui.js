// ── ui.js ── Interface + notifications ──
(function(){
"use strict";

Game.ui = {};

Game.ui.init = function() {
    Game.ui.update();
    Game.ui.updateXP();
    Game.ui.updateClock();
    Game.ui.updateToolbar();
    Game.quests.updateQuestTracker();
    Game.farming.renderGarden();
};

Game.ui.update = function() {
    var s = Game.state;
    setText('apple-count', s.inventory.apples);
    setText('wood-count', s.inventory.wood);
    setText('stone-count', s.inventory.stone);
    setText('bread-count', s.inventory.bread);
    setText('fish-count', s.inventory.fish);
    setText('flower-count', s.inventory.flowers);
    setText('butterfly-count', s.inventory.butterflies);
    setText('money-count', s.inventory.money);
    setText('material-count', s.inventory.materials);
    setText('village-revenue', s.villageRevenue);

    // Barre de faim
    var hf = document.getElementById('hunger-bar-fill');
    if (hf) {
        var pct = Math.max(0, Math.min(100, s.hunger));
        hf.style.width = pct + '%';
        hf.style.background = pct < 25
            ? 'linear-gradient(90deg,#e53935,#ff7043)'
            : 'linear-gradient(90deg,#ff7043,#ffca28)';
    }
    setText('hunger-text', Math.round(s.hunger) + '/100');

    // Plant button
    var pBtn = document.getElementById('plant-btn');
    if (pBtn) {
        if (s.inventory.flowers > 0) {
            pBtn.classList.remove('hidden');
            pBtn.textContent = 'Planter (' + s.inventory.flowers + ') 🌷';
        } else {
            pBtn.classList.add('hidden');
        }
    }

    // Cooked items display
    var cookedEl = document.getElementById('cooked-items');
    if (cookedEl) {
        var html = '';
        for (var key in s.cookedItems) {
            if (s.cookedItems[key] > 0) {
                var recipe = Game.COOKING_RECIPES[key];
                if (recipe) html += '<span>' + recipe.emoji + ' ' + s.cookedItems[key] + '</span> ';
            }
        }
        cookedEl.innerHTML = html || '';
    }

    // Seeds display
    var seedsEl = document.getElementById('seeds-display');
    if (seedsEl) {
        var shtml = '';
        for (var sid in s.seeds) {
            if (s.seeds[sid] > 0) {
                shtml += '<span>' + Game.CROPS[sid].emoji + ' ' + s.seeds[sid] + '</span> ';
            }
        }
        seedsEl.innerHTML = shtml || '';
    }

    // Fish shop counters
    var fishShopStock = document.getElementById('fishShop-stock');
    var fishShopRevenue = document.getElementById('fishShop-revenue');
    if (fishShopStock) fishShopStock.textContent = s.fishShop ? s.fishShop.stock : 0;
    if (fishShopRevenue) fishShopRevenue.textContent = s.fishShop ? s.fishShop.revenue : 0;

    // Tools display
    Game.ui.updateToolbar();

    // Shop UI update
    Game.ui.updateShop();

    // Refresh cooking recipes while inside the bakery
    if (Game.state.activeShop && Game.state.activeShop.id === 'bakery') {
        Game.ui.updateCooking();
    }
    // Refresh the owl's buy prices while inside the museum
    if (Game.state.activeShop && Game.state.activeShop.id === 'museum') {
        Game.ui.updateOwlShop();
    }
    // Refresh the souvenir shop while inside it
    if (Game.state.activeShop && Game.state.activeShop.id === 'souvenir') {
        Game.ui.updateSouvenirShop();
    }
    // Refresh David's pizzeria while inside it
    if (Game.state.activeShop && Game.state.activeShop.id === 'pizzeria') {
        Game.ui.updatePizzeria();
    }
};

Game.ui.updateXP = function() {
    var s = Game.state;
    var bar = document.getElementById('xp-bar-fill');
    if (bar) bar.style.width = (Game.xp.progress() * 100) + '%';
    setText('level-display', 'Nv. ' + s.level);
    setText('xp-text', s.xp + '/' + Game.xp.toNext() + ' XP');
};

Game.ui.updateClock = function() {
    setText('clock-display', Game.time.getClockString());
    setText('season-display', Game.time.getSeasonLabel());
    setText('weather-display', Game.weather.getLabel());
    setText('phase-display', Game.TIME_PHASES[Game.time.getPhase()].label);
};

Game.ui.updateToolbar = function() {
    var bar = document.getElementById('toolbar');
    if (!bar) return;
    var tools = Game.tools.getToolbar();
    bar.innerHTML = '';
    var toolMessages = {
        '🪓': "Hache active ! Double le bois récolté (4 au lieu de 2)",
        '🎣': "Canne active ! Pêche 2x plus rapide",
        '🚿': "Arrosoir ! Clique sur une culture pour l'arroser",
        '⛏️': "Pelle ! Utilise le bouton Pelle ON/OFF pour tracer des chemins",
        '🥅': "Filet ! Clique sur un papillon pour le capturer"
    };
    tools.forEach(function(t) {
        var div = document.createElement('div');
        div.className = 'tool-icon';
        div.title = t.label;
        div.textContent = t.emoji;
        div.style.cursor = 'pointer';
        div.onclick = function() {
            var msg = toolMessages[t.emoji] || (t.label + " équipé !");
            Game.ui.notify(msg, 'info');
        };
        bar.appendChild(div);
    });
};

Game.ui.updateShop = function() {
    var panel = document.getElementById('shop-items');
    if (!panel) return;
    var s = Game.state;

    var html = '';
    Game.SHOP_ITEMS.forEach(function(item) {
        if (item.type === 'tool') {
            var tool = Game.TOOLS[item.id];
            var owned = s.tools[item.id];
            html += '<button class="shop-btn' + (owned ? ' owned' : '') + '" onclick="Game.inventory.buyFromShop({type:\'tool\',id:\'' + item.id + '\'})">' +
                tool.emoji + ' ' + tool.label + (owned ? ' ✅' : ' (' + tool.price + '💰)') + '</button>';
        } else if (item.type === 'seed') {
            var crop = Game.CROPS[item.id];
            html += '<button class="shop-btn" onclick="Game.inventory.buyFromShop({type:\'seed\',id:\'' + item.id + '\',price:' + item.price + '})">' +
                crop.emoji + ' Graine ' + crop.label + ' (' + item.price + '💰)</button>';
        } else if (item.type === 'material') {
            html += '<button class="shop-btn" onclick="Game.inventory.buyFromShop({type:\'material\',id:\'materials\',price:' + item.price + '})">' +
                '🧱 Matériaux (' + item.price + '💰)</button>';
        }
    });
    panel.innerHTML = html;
};

Game.ui.updatePizzeria = function() {
    var panel = document.getElementById('pizzeria-items');
    if (!panel) return;
    var s = Game.state;
    var html = '';
    Game.PIZZAS.forEach(function(pz) {
        var tasted = s.pizzasTasted[pz.id];
        html += '<button class="shop-btn" onclick="Game.inventory.buyPizza(\'' + pz.id + '\')">' +
            pz.emoji + ' ' + pz.name + ' (' + pz.price + '💰, +' + pz.hunger + ' faim)' + (tasted ? ' ✅' : '') + '</button>';
    });
    panel.innerHTML = html;
};

Game.ui.updateSouvenirShop = function() {
    var panel = document.getElementById('souvenir-items');
    if (!panel) return;
    var s = Game.state;
    var html = '';
    Game.SNOW_GLOBES.forEach(function(g) {
        var owned = s.snowGlobes.indexOf(g.id) !== -1;
        html += '<button class="shop-btn' + (owned ? ' owned' : '') + '" onclick="Game.inventory.buySnowGlobe(\'' + g.id + '\')">' +
            g.emoji + ' ' + g.name + (owned ? ' ✅' : ' (' + g.price + '💰)') + '</button>';
    });
    panel.innerHTML = html;
};

// Panneau de collections (mer, montagne, boules à neige)
Game.ui.updateCollections = function() {
    var s = Game.state;
    function renderSpecies(containerId, table, coll) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var html = '';
        for (var id in table) {
            var sp = table[id];
            var got = coll[id] || 0;
            var rc = Game.RARITY_COLORS[sp.rarity] || '#8bc34a';
            if (got > 0) {
                html += '<span class="museum-item donated" style="border-color:' + rc + '">' + sp.emoji + '<small>' + sp.name + ' x' + got + '</small></span>';
            } else {
                html += '<span class="museum-item empty">?</span>';
            }
        }
        el.innerHTML = html;
    }
    renderSpecies('collection-sea', Game.SEA_SPECIES, s.seaCollection);
    renderSpecies('collection-mountain', Game.MOUNTAIN_SPECIES, s.mountainCollection);

    var pizzasEl = document.getElementById('collection-pizzas');
    if (pizzasEl) {
        var phtml = '';
        Game.PIZZAS.forEach(function(pz) {
            var tasted = s.pizzasTasted[pz.id];
            phtml += tasted
                ? '<span class="museum-item donated" style="border-color:#e65100">' + pz.emoji + '<small>' + pz.name + '</small></span>'
                : '<span class="museum-item empty">?</span>';
        });
        pizzasEl.innerHTML = phtml;
        setText('collection-pizzas-count', Object.keys(s.pizzasTasted).length + '/' + Game.PIZZAS.length);
    }

    var seaCount = Object.keys(s.seaCollection).length, seaTotal = Object.keys(Game.SEA_SPECIES).length;
    var mtnCount = Object.keys(s.mountainCollection).length, mtnTotal = Object.keys(Game.MOUNTAIN_SPECIES).length;
    setText('collection-sea-count', seaCount + '/' + seaTotal);
    setText('collection-mountain-count', mtnCount + '/' + mtnTotal);

    var globesEl = document.getElementById('collection-globes');
    if (globesEl) {
        var ghtml = '';
        Game.SNOW_GLOBES.forEach(function(g) {
            var owned = s.snowGlobes.indexOf(g.id) !== -1;
            ghtml += owned
                ? '<span class="museum-item donated" style="border-color:#29b6f6">' + g.emoji + '<small>' + g.name + '</small></span>'
                : '<span class="museum-item empty">?</span>';
        });
        globesEl.innerHTML = ghtml;
        setText('collection-globes-count', s.snowGlobes.length + '/' + Game.SNOW_GLOBES.length);
    }
};

// Mort de faim : écran "Vous êtes mort" + perte de 50 clochettes
Game.ui.showDeath = function() {
    var s = Game.state;
    if (s.dead) return;
    s.dead = true;
    s.paused = true;
    var lost = Math.min(50, s.inventory.money);
    s.inventory.money = Math.max(0, s.inventory.money - 50);
    Game.audio.play('error');
    Game.ui.update();
    var lostEl = document.getElementById('death-lost');
    if (lostEl) lostEl.textContent = '-' + lost + ' clochettes 💰';
    var screen = document.getElementById('death-screen');
    if (screen) screen.style.display = 'flex';
};

Game.ui.revive = function() {
    var s = Game.state;
    s.hunger = Game.CONFIG.HUNGER_MAX;          // on repart le ventre plein
    var f = Game.CONFIG.LOCATIONS.fountain;
    s.charlie.x = f.x; s.charlie.y = f.y + 90;  // réapparition à la fontaine
    s.charlie.visualX = f.x; s.charlie.visualY = f.y + 90;
    var screen = document.getElementById('death-screen');
    if (screen) screen.style.display = 'none';
    s.paused = false;
    s.dead = false;
    if (Game.player.updateCamera) Game.player.updateCamera();
    Game.ui.update();
    Game.ui.notify("Te revoilà à la fontaine, le ventre plein ! 🍽️");
};

// Menu "Manger" : liste ce que Charlie possède à manger
Game.ui.updateEatMenu = function() {
    var panel = document.getElementById('eat-items');
    if (!panel) return;
    var s = Game.state;
    var html = '', any = false;
    Game.FOODS.forEach(function(f) {
        var n = Game.inventory.foodCount(f);
        if (n > 0) {
            any = true;
            html += '<button class="shop-btn" onclick="Game.inventory.eat(\'' + f.id + '\')">' +
                f.emoji + ' ' + f.label + ' x' + n + ' (+' + f.hunger + ' faim)</button>';
        }
    });
    panel.innerHTML = any ? html :
        '<div style="font-size:0.72rem;color:#777;">Tu n\'as rien à manger ! Cuisine à la boulangerie 🍞 ou cultive ton jardin 🌱.</div>';
};

Game.ui.toggleEat = function() {
    var p = document.getElementById('panel-eat');
    if (!p) return;
    var show = p.style.display === 'none' || !p.style.display;
    p.style.display = show ? 'block' : 'none';
    if (show) Game.ui.updateEatMenu();
};

// Menu de téléportation (touche N)
Game.ui.toggleTeleport = function() {
    var p = document.getElementById('panel-teleport');
    if (!p) return;
    if (Game.state.currentView !== 'world') { p.style.display = 'none'; return; }
    p.style.display = (p.style.display === 'none' || !p.style.display) ? 'block' : 'none';
};

Game.ui.teleportTo = function(key) {
    var L = Game.CONFIG.LOCATIONS;
    var dests = {
        fountain: { x: L.fountain.x, y: L.fountain.y + 90 },
        mountain: { x: L.mountain.x, y: L.mountain.y + 230 },
        refuge:   { x: L.mountain.x - 200, y: L.mountain.y + 230 },
        beach:    { x: L.beach.x, y: L.beach.y - 80 },
        souvenir: { x: L.souvenirShop.x, y: L.souvenirShop.y + 90 },
        house:    { x: L.charlieHouse.x, y: L.charlieHouse.y + 90 }
    };
    var d = dests[key];
    if (!d) return;
    var s = Game.state;
    s.charlie.x = d.x; s.charlie.y = d.y;
    s.charlie.visualX = d.x; s.charlie.visualY = d.y;
    if (Game.player.updateCamera) Game.player.updateCamera();
    if (Game.buildings.checkProximity) Game.buildings.checkProximity();
    var p = document.getElementById('panel-teleport');
    if (p) p.style.display = 'none';
    Game.ui.notify("Téléportation ! ✨");
    Game.audio.play('levelup');
};

Game.ui.toggleCollections = function() {
    var p = document.getElementById('panel-collections');
    if (!p) return;
    var show = p.style.display === 'none' || !p.style.display;
    p.style.display = show ? 'block' : 'none';
    if (show) Game.ui.updateCollections();
};

Game.ui.updateOwlShop = function() {
    var panel = document.getElementById('owl-shop-items');
    if (!panel) return;
    var s = Game.state;
    var html = '';
    for (var type in Game.OWL_PRICES) {
        var info = Game.OWL_PRICES[type];
        var have = s.inventory[type] || 0;
        var total = have * info.price;
        html += '<button class="shop-btn' + (have <= 0 ? ' owned' : '') + '" onclick="Game.inventory.sellToOwl(\'' + type + '\')">' +
            info.emoji + ' Vendre ' + info.label + ' (' + have + ') → ' + total + '💰</button>';
    }
    panel.innerHTML = html;
};

Game.ui.updateCooking = function() {
    var panel = document.getElementById('cooking-recipes');
    if (!panel) return;
    var s = Game.state;

    // Noms des ingrédients en français (les clés internes sont en anglais), au singulier
    var ING_FR = { apples: 'pomme', fish: 'poisson', flowers: 'fleur', bread: 'pain', wood: 'bois', stone: 'pierre' };

    var html = '';
    for (var key in Game.COOKING_RECIPES) {
        var r = Game.COOKING_RECIPES[key];
        // Build the ingredient list label (accord singulier/pluriel)
        var needTxt = [];
        for (var ing in r.need) {
            var n = r.need[ing];
            var word = ING_FR[ing] || ing;
            if (n > 1 && word !== 'bois') word += 's';   // "bois" invariable
            needTxt.push(n + ' ' + word);
        }
        var locked = s.level < r.level;
        html += '<button class="shop-btn' + (locked ? ' owned' : '') + '" onclick="Game.crafting.cook(\'' + key + '\')" title="' + needTxt.join(', ') + '">' +
            r.emoji + ' ' + r.label + (locked ? ' 🔒 Niv.' + r.level : ' (' + needTxt.join(', ') + ')') + '</button>';
    }
    panel.innerHTML = html;
};

Game.ui.notify = function(msg, type) {
    type = type || 'default';
    var n = document.createElement('div');
    n.className = 'notification notification-' + type;
    n.textContent = msg;
    document.body.appendChild(n);

    // Slide in
    requestAnimationFrame(function() {
        n.style.opacity = '1';
        n.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(function() {
        n.style.opacity = '0';
        n.style.transform = 'translateX(-50%) translateY(-20px)';
    }, 1800);
    setTimeout(function() { n.remove(); }, 2300);
};

Game.ui.updateMuseum = function() {
    var s = Game.state;
    // Fish collection
    var fishEl = document.getElementById('museum-fish');
    if (fishEl) {
        var html = '';
        for (var fid in Game.FISH_SPECIES) {
            var sp = Game.FISH_SPECIES[fid];
            var donated = s.museum.fish[fid];
            var owned = (s.specimens.fish[fid] || 0) > 0;
            var rc = Game.RARITY_COLORS[sp.rarity];
            if (donated) {
                html += '<span class="museum-item donated" style="border-color:' + rc + '">' + sp.emoji + '<small>' + sp.name + '</small></span>';
            } else if (owned) {
                html += '<span class="museum-item available" style="border-color:' + rc + '" onclick="Game.inventory.donateToMuseum(\'fish\',\'' + fid + '\')">' + sp.emoji + '<small>Donner</small></span>';
            } else {
                html += '<span class="museum-item empty">?</span>';
            }
        }
        fishEl.innerHTML = html;
    }
    // Butterfly collection
    var bfEl = document.getElementById('museum-butterflies');
    if (bfEl) {
        var bhtml = '';
        for (var bid in Game.BUTTERFLY_SPECIES) {
            var bsp = Game.BUTTERFLY_SPECIES[bid];
            var bdonated = s.museum.butterflies[bid];
            var bowned = (s.specimens.butterflies[bid] || 0) > 0;
            var brc = Game.RARITY_COLORS[bsp.rarity];
            if (bdonated) {
                bhtml += '<span class="museum-item donated" style="border-color:' + brc + '">' + bsp.emoji + '<small>' + bsp.name + '</small></span>';
            } else if (bowned) {
                bhtml += '<span class="museum-item available" style="border-color:' + brc + '" onclick="Game.inventory.donateToMuseum(\'butterflies\',\'' + bid + '\')">' + bsp.emoji + '<small>Donner</small></span>';
            } else {
                bhtml += '<span class="museum-item empty">?</span>';
            }
        }
        bfEl.innerHTML = bhtml;
    }
    // Count
    var totalFish = Object.keys(Game.FISH_SPECIES).length;
    var totalBf = Object.keys(Game.BUTTERFLY_SPECIES).length;
    var donatedFish = Object.keys(s.museum.fish).length;
    var donatedBf = Object.keys(s.museum.butterflies).length;
    setText('museum-count', (donatedFish + donatedBf) + '/' + (totalFish + totalBf));
};

function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

})();
