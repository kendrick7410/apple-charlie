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
        // Roll fish species
        var spId = Game.inventory.rollFishSpecies();
        if (spId) {
            s.specimens.fish[spId] = (s.specimens.fish[spId] || 0) + 1;
            var sp = Game.FISH_SPECIES[spId];
            var rarityLabel = { common: '', uncommon: '✨', rare: '💎', legendary: '👑' };
            Game.ui.notify(sp.name + " attrapé ! " + sp.emoji + " " + (rarityLabel[sp.rarity] || ''));
        } else {
            Game.ui.notify("Poisson attrapé ! 🐟");
        }
        s.isFishing = false;
        Game.xp.add(8);
        if (btn) btn.textContent = "Pêcher 🎣";
        Game.audio.play('fish');
        Game.particles.spawn('🐟', window.innerWidth - 100, window.innerHeight - 100);
        Game.ui.update();
    }, fishTime);
};

Game.inventory.depositFish = function() {
    var s = Game.state;
    if (s.inventory.fish <= 0) {
        Game.ui.notify("Tu n'as pas de poisson à déposer !");
        return;
    }
    var amount = s.inventory.fish;
    s.fishShop.stock += amount;
    s.inventory.fish = 0;
    Game.audio.play('collect');
    Game.particles.spawn('🐟', window.innerWidth - 100, window.innerHeight - 150, { count: 3, spread: 40 });
    Game.ui.update();
    Game.ui.notify("Déposé " + amount + " poisson" + (amount > 1 ? "s" : "") + " ! 🐟");
};

Game.inventory.collectFishRevenue = function() {
    var s = Game.state;
    if (s.fishShop.revenue <= 0) {
        Game.ui.notify("Pas encore de revenus à collecter !");
        return;
    }
    var amount = s.fishShop.revenue;
    s.inventory.money += amount;
    s.fishShop.revenue = 0;
    Game.audio.playCoin();
    Game.particles.spawn('💰', window.innerWidth - 100, window.innerHeight - 150, { count: 5, spread: 60, vy: -80 });
    Game.xp.add(Math.floor(amount / 10));
    Game.ui.update();
    Game.ui.notify("Collecté " + amount + "💰 de la poissonnerie !");
};

Game.inventory.rollFishSpecies = function() {
    var totalW = 0;
    var entries = [];
    for (var id in Game.FISH_SPECIES) {
        var sp = Game.FISH_SPECIES[id];
        entries.push({ id: id, weight: sp.weight });
        totalW += sp.weight;
    }
    var r = Math.random() * totalW;
    for (var i = 0; i < entries.length; i++) {
        r -= entries[i].weight;
        if (r <= 0) return entries[i].id;
    }
    return entries[entries.length - 1].id;
};

Game.inventory.donateToMuseum = function(type, speciesId) {
    var s = Game.state;
    if (s.museum[type][speciesId]) {
        Game.ui.notify("Déjà au musée !");
        return;
    }
    if (!s.specimens[type][speciesId] || s.specimens[type][speciesId] <= 0) {
        Game.ui.notify("Tu n'as pas ce spécimen !");
        return;
    }
    s.specimens[type][speciesId]--;
    s.museum[type][speciesId] = true;
    if (type === 'fish') s.inventory.fish = Math.max(0, s.inventory.fish - 1);
    if (type === 'butterflies') s.inventory.butterflies = Math.max(0, s.inventory.butterflies - 1);
    var table = type === 'fish' ? Game.FISH_SPECIES : Game.BUTTERFLY_SPECIES;
    var sp = table[speciesId];
    var reward = sp.value * 2;
    s.inventory.money += reward;
    Game.xp.add(sp.value);
    Game.audio.playCoin();
    Game.particles.spawn('⭐', window.innerWidth / 2, window.innerHeight / 2, { count: 5, spread: 40 });
    Game.ui.update();
    Game.ui.updateMuseum();
    Game.ui.notify(sp.name + " donné au musée ! +" + reward + "💰");
};

Game.inventory.collectVillageRevenue = function() {
    var s = Game.state;
    if (s.villageRevenue <= 0) {
        Game.ui.notify("Pas de revenus du village !");
        return;
    }
    var amount = s.villageRevenue;
    s.inventory.money += amount;
    s.villageRevenue = 0;
    Game.audio.playCoin();
    Game.particles.spawn('💰', window.innerWidth / 2, window.innerHeight / 2, { count: 4, spread: 50, vy: -80 });
    Game.ui.update();
    Game.ui.notify("Revenus du village : +" + amount + "💰");
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
