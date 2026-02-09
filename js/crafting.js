// ── crafting.js ── Système de craft + cuisine ──
(function(){
"use strict";

Game.crafting = {};

// Furniture crafting (interior)
Game.crafting.craftFurniture = function(recipeId) {
    var s = Game.state;
    var recipe = Game.RECIPES[recipeId];
    if (!recipe) return;

    if (s.inventory.wood >= recipe.wood && s.inventory.stone >= recipe.stone) {
        s.inventory.wood -= recipe.wood;
        s.inventory.stone -= recipe.stone;

        var fx = s.interiorCharlie.x;
        var fy = s.interiorCharlie.y - 40;

        if (!s.houseFurniture[s.activeHouse.id]) {
            s.houseFurniture[s.activeHouse.id] = [];
        }
        s.houseFurniture[s.activeHouse.id].push([recipe.emoji, fx, fy]);

        var div = document.createElement('div');
        div.className = 'furniture';
        div.textContent = recipe.emoji;
        div.style.left = fx + 'px';
        div.style.top = fy + 'px';
        document.getElementById('current-room').appendChild(div);

        Game.xp.add(10);
        Game.audio.play('craft');
        Game.particles.spawn('✨', window.innerWidth / 2, window.innerHeight / 2, { count: 3, spread: 40 });
        Game.ui.update();
        Game.ui.notify("Fabriqué ! ✨");
    } else {
        Game.ui.notify("Pas assez de matériaux !");
        Game.audio.play('error');
    }
};

// Cooking
Game.crafting.cook = function(recipeId) {
    var s = Game.state;
    var recipe = Game.COOKING_RECIPES[recipeId];
    if (!recipe) return;

    // Level check
    if (s.level < recipe.level) {
        Game.ui.notify("Niveau " + recipe.level + " requis ! 🔒");
        Game.audio.play('error');
        return;
    }

    // Check ingredients
    for (var item in recipe.need) {
        if ((s.inventory[item] || 0) < recipe.need[item]) {
            Game.ui.notify("Ingrédients manquants !");
            Game.audio.play('error');
            return;
        }
    }

    // Consume ingredients
    for (var item2 in recipe.need) {
        s.inventory[item2] -= recipe.need[item2];
    }

    // Add cooked item
    s.cookedItems[recipeId] = (s.cookedItems[recipeId] || 0) + 1;
    Game.xp.add(recipe.xp);
    Game.audio.play('craft');
    Game.particles.spawn(recipe.emoji, window.innerWidth / 2, window.innerHeight / 2, { count: 3, spread: 30 });
    Game.ui.update();
    Game.ui.notify(recipe.label + " préparé ! " + recipe.emoji);
};

})();
