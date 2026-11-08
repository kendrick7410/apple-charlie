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

// Cercles à éviter : bâtiments et maisons (rien ne doit pousser dessus)
var _blockPts = null;
function blockPoints() {
    if (_blockPts) return _blockPts;
    var L = Game.CONFIG.LOCATIONS;
    var pts = [];
    ['fountain','bakery','shop','charlieHouse','garden','fishShop','museum','pizzeria','souvenirShop','port']
        .forEach(function(k){ if (L[k]) pts.push({ x: L[k].x, y: L[k].y, r: 150 }); });
    (Game.HOUSES || []).forEach(function(h){ pts.push({ x: h.x, y: h.y, r: 150 }); });
    if (L.farm) pts.push({ x: L.farm.x, y: L.farm.y, r: 480 });   // grande ferme (grange, enclos, champs)
    _blockPts = pts;
    return pts;
}

// Segments de la rivière à éviter (géométrie partagée avec la carte)
var _riverRects = null;
function riverRects() {
    if (!_riverRects) _riverRects = Game.buildRiverSegments();
    return _riverRects;
}

// Zone des montagnes (mêmes bornes que le terrain alpin de world.js)
var MOUNTAIN_ZONE = { x1: 2650, y1: 300, x2: 4400, y2: 1750 };
function inMountainZone(x, y) {
    return x > MOUNTAIN_ZONE.x1 && x < MOUNTAIN_ZONE.x2 && y > MOUNTAIN_ZONE.y1 && y < MOUNTAIN_ZONE.y2;
}

function validSpawnPos(x, y, avoidMountain) {
    if (y > Game.CONFIG.BEACH_TOP - 150) return false;           // pas sur la plage/mer
    if (avoidMountain && inMountainZone(x, y)) return false;      // pas de fleurs en montagne
    // pas sur un bâtiment ou une maison
    var pts = blockPoints();
    for (var i = 0; i < pts.length; i++) {
        if (Math.hypot(x - pts[i].x, y - pts[i].y) < pts[i].r) return false;
    }
    // pas dans la rivière
    var rr = riverRects(), pad = 45;
    for (var j = 0; j < rr.length; j++) {
        var s = rr[j];
        if (x > s.x - pad && x < s.x + s.w + pad && y > s.y - pad && y < s.y + s.h + pad) return false;
    }
    return true;
}

// Zone de spawn sur la terre (toute la carte sauf plage/mer)
function landSpawn() {
    return {
        x: 200 + Math.random() * (Game.CONFIG.WORLD_W - 400),
        y: 200 + Math.random() * (Game.CONFIG.BEACH_TOP - 350)
    };
}

// Tirage d'une position sur la terre (bâtiments, rivière, plage évités) ; null si elle ne convient pas.
// Le registre Game.placement vérifie ensuite que l'objet ne touche rien (autre arbre, chemin, rocher...).
// avoidMountain = true pour aussi exclure la zone des montagnes (arbres, fleurs).
function landPick(avoidMountain) {
    return function() {
        var pos = landSpawn();
        return validSpawnPos(pos.x, pos.y, avoidMountain) ? pos : null;
    };
}

Game.entities.spawnTree = function(season) {
    season = season || Game.state.season;
    var tree = document.createElement('div');
    tree.className = 'entity tree';
    tree.style.fontSize = '3.5rem';
    tree.innerHTML = Game.SEASON_TREE[season];
    tree.dataset.hasApple = (season !== 'winter') ? 'true' : 'false';
    Game.placement.place(tree, landPick(true), 80);   // pas d'arbres dans les montagnes, ni collés à autre chose
};

Game.entities.spawnStone = function() {
    var stone = document.createElement('div');
    stone.className = 'entity stone';
    // Caillou dessiné en CSS (l'emoji 🪨 s'affiche en rectangle noir sur certains ordinateurs)
    stone.innerHTML = '<span class="rock"></span>';
    Game.placement.place(stone, landPick(false), 80);
};

Game.entities.spawnFlower = function(season) {
    season = season || Game.state.season;
    if (season === 'winter') return; // No flowers in winter
    var f = Game.entities.createFlowerEl(0, 0, Game.FLOWER_TYPES[Math.floor(Math.random() * Game.FLOWER_TYPES.length)], false);
    Game.placement.place(f, landPick(true), 80);   // les fleurs évitent aussi la zone des montagnes
};

Game.entities.createFlowerEl = function(x, y, emoji, isPlaced) {
    var f = document.createElement('div');
    f.className = 'entity flower' + (isPlaced ? ' placed-flower' : '');
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    f.style.fontSize = '1.5rem';
    f.innerHTML = emoji;
    document.getElementById('game-world').appendChild(f);
    return f;
};

Game.entities.checkCollect = function() {
    var s = Game.state;
    var cx = s.charlie.x, cy = s.charlie.y;

    // Larger collection radius on mobile for easier gameplay
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    var rb = (Game.player && Game.player.skinBonus) ? Game.player.skinBonus().radius : 0;  // aimant du skin
    var stoneRadius = (isMobile ? 80 : 40) + rb;
    var flowerRadius = (isMobile ? 80 : 40) + rb;
    var treeRadius = (isMobile ? 100 : 50) + rb;

    // Stones
    var stones = document.querySelectorAll('.stone');
    for (var i = 0; i < stones.length; i++) {
        var st = stones[i];
        if (Math.hypot(cx - parseInt(st.style.left), cy - parseInt(st.style.top)) < stoneRadius) {
            s.inventory.stone++;
            Game.xp.add(3);
            Game.particles.spawnWorld('🪨', parseInt(st.style.left), parseInt(st.style.top));
            Game.audio.playChime();
            st.remove();
            Game.ui.update();
            Game.ui.notify("+1 Pierre 🪨");
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
        // Distance mesurée depuis le centre de l'arbre (on peut cueillir de tous les côtés, même en 3D où l'arbre bloque)
        var tcx = parseInt(tr.style.left) + tr.offsetWidth / 2, tcy = parseInt(tr.style.top) + tr.offsetHeight * 0.8;
        if (tr.dataset.hasApple === 'true' && Math.hypot(cx - tcx, cy - tcy) < treeRadius + 45) {
            Game.entities.harvest(tr);
        }
    }
};

Game.entities.harvest = function(tree) {
    var s = Game.state;
    if (tree.dataset.fruit) {   // arbre fruitier de la prairie : des fruits (comptés comme des pommes) et de l'XP
        tree.dataset.hasApple = 'false';
        tree.innerHTML = Game.SEASON_HARVESTED_TREE[s.season];
        s.inventory.apples += 3;
        Game.xp.add(8);
        Game.particles.spawnWorld(tree.dataset.fruit, parseInt(tree.style.left), parseInt(tree.style.top));
        Game.audio.playChime();
        Game.ui.update();
        Game.ui.notify('+3 fruits ' + tree.dataset.fruit + ' (comptés comme des pommes 🍎) +8 XP');
        setTimeout(function() { if (Game.state.season !== 'winter') { tree.dataset.hasApple = 'true'; tree.innerHTML = Game.SEASON_TREE[Game.state.season]; } }, Game.CONFIG.TREE_RESPAWN);
        return;
    }
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
