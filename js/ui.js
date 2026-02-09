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
