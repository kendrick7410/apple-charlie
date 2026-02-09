// ── inventory.js ── Inventaire + économie ──
(function(){
"use strict";

Game.inventory = {};

Game.inventory.sellAll = function() {
    var s = Game.state;
    var total = 0;

    // Base items
    total += s.inventory.apples * 5;
    total += s.inventory.bread * 15;
    total += s.inventory.fish * 10;
    total += s.inventory.flowers * 2;

    // Cooked items
    for (var key in s.cookedItems) {
        if (s.cookedItems[key] > 0 && Game.COOKING_RECIPES[key]) {
            total += s.cookedItems[key] * Game.COOKING_RECIPES[key].sell;
            s.cookedItems[key] = 0;
        }
    }

    // Farmed crops
    // (sold via their own values in cookedItems)

    if (total > 0) {
        s.inventory.money += total;
        s.inventory.apples = 0;
        s.inventory.bread = 0;
        s.inventory.fish = 0;
        s.inventory.flowers = 0;
        Game.xp.add(Math.floor(total / 5));
        Game.audio.playCoin();
        Game.particles.spawn('💰', window.innerWidth / 2, window.innerHeight / 2, { count: 5, spread: 60, vy: -80 });
        Game.ui.update();
        Game.ui.notify("Vendu ! +" + total + "💰");
    } else {
        Game.ui.notify("Rien à vendre !");
    }
};

Game.inventory.buyFromShop = function(item) {
    var s = Game.state;

    if (item.type === 'tool') {
        var tool = Game.TOOLS[item.id];
        if (s.tools[item.id]) {
            Game.ui.notify("Tu as déjà " + tool.label + " !");
            return;
        }
        if (s.inventory.money < tool.price) {
            Game.ui.notify("Il te faut " + tool.price + "💰");
            Game.audio.play('error');
            return;
        }
        s.inventory.money -= tool.price;
        s.tools[item.id] = true;
        Game.audio.playCoin();
        Game.xp.add(10);
        Game.ui.update();
        Game.ui.notify(tool.label + " acheté ! " + tool.emoji);
    } else if (item.type === 'seed') {
        var crop = Game.CROPS[item.id];
        if (s.inventory.money < item.price) {
            Game.ui.notify("Il te faut " + item.price + "💰");
            Game.audio.play('error');
            return;
        }
        s.inventory.money -= item.price;
        s.seeds[item.id] = (s.seeds[item.id] || 0) + 1;
        Game.audio.playCoin();
        Game.ui.update();
        Game.ui.notify("Graine de " + crop.label + " ! " + crop.emoji);
    } else if (item.type === 'material') {
        if (s.inventory.money < item.price) {
            Game.ui.notify("Il te faut " + item.price + "💰");
            Game.audio.play('error');
            return;
        }
        s.inventory.money -= item.price;
        s.inventory.materials++;
        Game.audio.playCoin();
        Game.ui.update();
        Game.ui.notify("Matériaux reçus ! 🧱");
    }
};

Game.inventory.startFishing = function() {
    var s = Game.state;
    if (s.isFishing) return;
    if (s.season === 'winter') {
        Game.ui.notify("Pas de pêche en hiver ! ❄️");
        return;
    }
    s.isFishing = true;

    var btn = document.getElementById('fish-btn');
    if (btn) btn.textContent = "Attente... 🌊";

    var fishTime = s.tools.rod ? Game.CONFIG.FISH_TIME_ROD : Game.CONFIG.FISH_TIME;
    // Rain bonus
    if (Game.weather.isRaining()) fishTime *= 0.7;

    setTimeout(function() {
        s.inventory.fish++;
        s.isFishing = false;
        Game.xp.add(8);
        if (btn) btn.textContent = "Pêcher 🎣";
        Game.audio.play('fish');
        Game.particles.spawn('🐟', window.innerWidth - 100, window.innerHeight - 100);
        Game.ui.update();
        Game.ui.notify("Poisson attrapé ! 🐟");
    }, fishTime);
};

Game.inventory.bakeBread = function() {
    var s = Game.state;
    if (s.isBaking) return;
    s.isBaking = true;
    var btn = document.getElementById('bake-btn');
    if (btn) btn.textContent = "Cuisson... 🔥";

    setTimeout(function() {
        s.inventory.bread++;
        s.isBaking = false;
        Game.xp.add(5);
        if (btn) btn.textContent = "Cuire du Pain 🍞";
        Game.audio.play('craft');
        Game.ui.update();
        Game.ui.notify("Pain frais ! 🍞");
    }, Game.CONFIG.BAKE_TIME);
};

})();
