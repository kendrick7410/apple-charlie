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

// Vendre tout son bois à la fontaine du village
Game.inventory.sellWood = function() {
    var s = Game.state;
    if (s.inventory.wood <= 0) {
        Game.ui.notify("Tu n'as pas de bois à vendre ! 🪵");
        Game.audio.play('error');
        return;
    }
    var n = s.inventory.wood;
    var gain = n * 3;
    s.inventory.wood = 0;
    s.inventory.money += gain;
    Game.xp.add(Math.max(1, Math.floor(gain / 10)));
    Game.audio.playCoin();
    Game.particles.spawn('💰', window.innerWidth / 2, window.innerHeight / 2, { count: 4, spread: 50, vy: -70 });
    Game.ui.update();
    Game.ui.notify("Bois vendu à la fontaine : " + n + " 🪵 pour +" + gain + "💰");
};

// Acheter une boule à neige (boutique souvenir) → déco maison à collectionner
Game.inventory.buySnowGlobe = function(id) {
    var s = Game.state;
    var g = null;
    for (var i = 0; i < Game.SNOW_GLOBES.length; i++) { if (Game.SNOW_GLOBES[i].id === id) g = Game.SNOW_GLOBES[i]; }
    if (!g) return;
    if (s.snowGlobes.indexOf(id) !== -1) {
        Game.ui.notify("Tu as déjà cette boule à neige ! " + g.emoji);
        return;
    }
    if (s.inventory.money < g.price) {
        Game.ui.notify("Il te faut " + g.price + "💰");
        Game.audio.play('error');
        return;
    }
    s.inventory.money -= g.price;
    s.snowGlobes.push(id);
    Game.xp.add(15);
    Game.audio.playCoin();
    Game.particles.spawn('❄️', window.innerWidth / 2, window.innerHeight / 2, { count: 6, spread: 60 });
    Game.ui.update();
    if (Game.ui.updateSouvenirShop) Game.ui.updateSouvenirShop();
    Game.ui.notify(g.name + " achetée ! " + g.emoji + " (visible dans ta maison ❄️)");
};

// Quantité d'un aliment selon où il est stocké
Game.inventory.foodCount = function(f) {
    var s = Game.state;
    if (f.store === 'cooked')  return s.cookedItems[f.id] || 0;
    if (f.store === 'harvest') return s.harvest[f.id] || 0;
    return s.inventory[f.id] || 0;
};

// Manger un aliment pour remplir la barre de faim
Game.inventory.eat = function(id) {
    var s = Game.state;
    var f = null;
    for (var i = 0; i < Game.FOODS.length; i++) { if (Game.FOODS[i].id === id) f = Game.FOODS[i]; }
    if (!f) return;
    if (Game.inventory.foodCount(f) <= 0) {
        Game.ui.notify("Tu n'as pas de " + f.label.toLowerCase() + " ! " + f.emoji);
        Game.audio.play('error');
        return;
    }
    if (s.hunger >= Game.CONFIG.HUNGER_MAX) {
        Game.ui.notify("Tu es déjà rassasié ! 😋");
        return;
    }
    if (f.store === 'cooked')  s.cookedItems[id]--;
    else if (f.store === 'harvest') s.harvest[id]--;
    else s.inventory[id]--;
    s.hunger = Math.min(Game.CONFIG.HUNGER_MAX, s.hunger + f.hunger);
    Game.xp.add(2);
    Game.audio.playChime();
    Game.particles.spawn(f.emoji, window.innerWidth / 2, window.innerHeight / 2, { count: 4, spread: 40, vy: -60 });
    Game.ui.update();
    if (Game.ui.updateEatMenu) Game.ui.updateEatMenu();
    Game.ui.notify("Miam ! " + f.label + " " + f.emoji + " +" + f.hunger + " faim");
};

// Acheter une pizza chez David (donne de l'XP, et on garde en mémoire celles goûtées)
Game.inventory.buyPizza = function(id) {
    var s = Game.state;
    var pz = null;
    for (var i = 0; i < Game.PIZZAS.length; i++) { if (Game.PIZZAS[i].id === id) pz = Game.PIZZAS[i]; }
    if (!pz) return;
    if (s.inventory.money < pz.price) {
        Game.ui.notify("Il te faut " + pz.price + "💰");
        Game.audio.play('error');
        return;
    }
    s.inventory.money -= pz.price;
    var isNew = !s.pizzasTasted[pz.id];
    s.pizzasTasted[pz.id] = (s.pizzasTasted[pz.id] || 0) + 1;
    Game.xp.add(pz.xp);
    Game.audio.playCoin();
    Game.particles.spawn('🍕', window.innerWidth / 2, window.innerHeight / 2, { count: 5, spread: 60, vy: -70 });
    Game.ui.update();
    if (Game.ui.updatePizzeria) Game.ui.updatePizzeria();
    if (Game.ui.updateCollections) Game.ui.updateCollections();
    Game.ui.notify((isNew ? "NOUVEAU ! " : "") + "Miam, " + pz.name + " ! " + pz.emoji + " +" + pz.xp + "XP");
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

// Le hibou achète une ressource : vend TOUT le stock de ce type contre des clochettes
Game.inventory.sellToOwl = function(type) {
    var s = Game.state;
    var info = Game.OWL_PRICES[type];
    if (!info) return;
    var n = s.inventory[type] || 0;
    if (n <= 0) {
        Game.ui.notify("Tu n'as pas de " + info.label.toLowerCase() + " à vendre ! " + info.emoji);
        Game.audio.play('error');
        return;
    }
    var gain = n * info.price;
    s.inventory[type] = 0;
    s.inventory.money += gain;
    Game.xp.add(Math.max(1, Math.floor(gain / 10)));
    Game.audio.playCoin();
    Game.particles.spawn('💰', window.innerWidth / 2, window.innerHeight / 2, { count: 5, spread: 60, vy: -80 });
    Game.ui.update();
    if (Game.ui.updateOwlShop) Game.ui.updateOwlShop();
    Game.ui.notify("Le hibou t'achète " + n + " " + info.label.toLowerCase() + " pour +" + gain + "💰 🦉");
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
