// ── entities.js ── Arbres, pierres, fleurs (spawn/récolte) ──
(function(){
"use strict";

Game.entities = {};

Game.entities.init = function() {
    var season = Game.state.season;
    for (var i = 0; i < Game.CONFIG.TREE_COUNT; i++) Game.entities.spawnTree(season);
    for (var j = 0; j < Game.CONFIG.FLOWER_COUNT; j++) Game.entities.spawnFlower(season);
    for (var k = 0; k < Game.CONFIG.STONE_COUNT; k++) Game.entities.spawnStone();

    // Restore placed flowers
    Game.state.placedFlowers.forEach(function(f) {
        Game.entities.createFlowerEl(f.x, f.y, f.emoji, true);
    });
};

function validSpawnPos(x, y) {
    // Avoid center village and river
    if (Math.hypot(x - 1000, y - 1000) < 400) return false;
    if (x > 450 && x < 750) return false;
    return true;
}

Game.entities.spawnTree = function(season) {
    season = season || Game.state.season;
    var x, y;
    do {
        x = 200 + Math.random() * 2600;
        y = 200 + Math.random() * 2600;
    } while (!validSpawnPos(x, y));

    var tree = document.createElement('div');
    tree.className = 'entity tree';
    tree.style.left = x + 'px';
    tree.style.top = y + 'px';
    tree.style.fontSize = '3.5rem';
    tree.innerHTML = Game.SEASON_TREE[season];
    tree.dataset.hasApple = (season !== 'winter') ? 'true' : 'false';
    document.getElementById('game-world').appendChild(tree);
};

Game.entities.spawnStone = function() {
    var x, y;
    do {
        x = 200 + Math.random() * 2600;
        y = 200 + Math.random() * 2600;
    } while (!validSpawnPos(x, y));

    var stone = document.createElement('div');
    stone.className = 'entity stone';
    stone.style.left = x + 'px';
    stone.style.top = y + 'px';
    stone.style.fontSize = '1.5rem';
    stone.innerHTML = '🪨';
    document.getElementById('game-world').appendChild(stone);
};

Game.entities.spawnFlower = function(season) {
    season = season || Game.state.season;
    if (season === 'winter') return; // No flowers in winter
    var x, y;
    do {
        x = 100 + Math.random() * 2800;
        y = 100 + Math.random() * 2800;
    } while (x > 450 && x < 750);

    Game.entities.createFlowerEl(x, y, Game.FLOWER_TYPES[Math.floor(Math.random() * Game.FLOWER_TYPES.length)], false);
};

Game.entities.createFlowerEl = function(x, y, emoji, isPlaced) {
    var f = document.createElement('div');
    f.className = 'entity flower' + (isPlaced ? ' placed-flower' : '');
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    f.style.fontSize = '1.5rem';
    f.innerHTML = emoji;
    document.getElementById('game-world').appendChild(f);
};

Game.entities.checkCollect = function() {
    var s = Game.state;
    var cx = s.charlie.x, cy = s.charlie.y;

    // Larger collection radius on mobile for easier gameplay
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    var stoneRadius = isMobile ? 80 : 40;
    var flowerRadius = isMobile ? 80 : 40;
    var treeRadius = isMobile ? 100 : 50;

    // Stones
    var stones = document.querySelectorAll('.stone');
    for (var i = 0; i < stones.length; i++) {
        var st = stones[i];
        if (Math.hypot(cx - parseInt(st.style.left), cy - parseInt(st.style.top)) < stoneRadius) {
            s.inventory.stone++;
            Game.xp.add(3);
            Game.particles.spawnWorld('🧱', parseInt(st.style.left), parseInt(st.style.top));
            Game.audio.playChime();
            st.remove();
            Game.ui.update();
            Game.ui.notify("+1 Pierre 🧱");
            setTimeout(Game.entities.spawnStone, Game.CONFIG.STONE_RESPAWN);
        }
    }

    // Flowers (not placed ones)
    var flowers = document.querySelectorAll('.flower:not(.placed-flower)');
    for (var j = 0; j < flowers.length; j++) {
        var fl = flowers[j];
        if (Math.hypot(cx - parseInt(fl.style.left), cy - parseInt(fl.style.top)) < flowerRadius) {
            s.inventory.flowers++;
            Game.xp.add(2);
            Game.particles.spawnWorld('🌻', parseInt(fl.style.left), parseInt(fl.style.top));
            Game.audio.playChime();
            fl.remove();
            Game.ui.update();
            setTimeout(function(){ Game.entities.spawnFlower(); }, Game.CONFIG.FLOWER_RESPAWN);
        }
    }

    // Trees
    var trees = document.querySelectorAll('.tree');
    for (var k = 0; k < trees.length; k++) {
        var tr = trees[k];
        if (tr.dataset.hasApple === 'true' && Math.hypot(cx - parseInt(tr.style.left), cy - parseInt(tr.style.top)) < treeRadius) {
            Game.entities.harvest(tr);
        }
    }
};

Game.entities.harvest = function(tree) {
    var s = Game.state;
    tree.dataset.hasApple = 'false';
    tree.innerHTML = Game.SEASON_HARVESTED_TREE[s.season];

    var woodAmount = s.tools.axe ? 4 : 2;
    s.inventory.apples++;
    s.inventory.wood += woodAmount;
    Game.xp.add(5);

    Game.particles.spawnWorld('🍎', parseInt(tree.style.left), parseInt(tree.style.top));
    Game.audio.playChime();
    Game.ui.update();
    Game.ui.notify("+1 Pomme 🍎, +" + woodAmount + " Bois 🪵");

    setTimeout(function() {
        if (Game.state.season !== 'winter') {
            tree.dataset.hasApple = 'true';
            tree.innerHTML = Game.SEASON_TREE[Game.state.season];
        }
    }, Game.CONFIG.TREE_RESPAWN);
};

Game.entities.updateTreesForSeason = function(season) {
    var trees = document.querySelectorAll('.tree');
    for (var i = 0; i < trees.length; i++) {
        var t = trees[i];
        if (season === 'winter') {
            t.dataset.hasApple = 'false';
            t.innerHTML = '🌲';
        } else {
            t.innerHTML = Game.SEASON_TREE[season];
            if (t.dataset.hasApple === 'false') {
                // Chance to regrow
                if (Math.random() > 0.3) {
                    t.dataset.hasApple = 'true';
                    t.innerHTML = Game.SEASON_TREE[season];
                }
            }
        }
    }
};

// Plant a flower at Charlie's position (fix for plantFlower bug)
Game.entities.plantFlower = function() {
    var s = Game.state;
    if (s.inventory.flowers <= 0) return;
    s.inventory.flowers--;
    var emoji = Game.FLOWER_TYPES[Math.floor(Math.random() * Game.FLOWER_TYPES.length)];
    var x = s.charlie.x;
    var y = s.charlie.y + 40;
    s.placedFlowers.push({ x: x, y: y, emoji: emoji });
    Game.entities.createFlowerEl(x, y, emoji, true);
    Game.xp.add(3);
    Game.audio.play('plant');
    Game.particles.spawnWorld('🌸', x, y, { count: 3, spread: 20 });
    Game.ui.update();
    Game.ui.notify("Fleur plantée ! 🌷");
};

})();
