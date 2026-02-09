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
    setText('money-count', s.inventory.money);
    setText('material-count', s.inventory.materials);

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
    var html = '';
    tools.forEach(function(t) {
        html += '<div class="tool-icon" title="' + t.label + '">' + t.emoji + '</div>';
    });
    bar.innerHTML = html;
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

function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

})();
