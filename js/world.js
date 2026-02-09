// ── world.js ── Génération du monde (rivière, chemins, bâtiments) ──
(function(){
"use strict";

Game.world = {};

Game.world.init = function() {
    var world = document.getElementById('game-world');

    // River
    Game.world.createRiver(Game.CONFIG.LOCATIONS.riverBaseX, 0, Game.CONFIG.WORLD_H);

    // Bridges (wider, better positioned to span river)
    Game.world.createBridge(Game.CONFIG.LOCATIONS.riverBaseX - 40, 940, 260, 90);
    Game.world.createBridge(Game.CONFIG.LOCATIONS.riverBaseX - 40, 1790, 260, 90);

    // Paths
    Game.world.createPath(700, 700, 600, 600);
    Game.world.createPath(400, 970, 1800, 60);
    Game.world.createPath(970, 400, 60, 2000);
    // Path to garden
    Game.world.createPath(1400, 1260, 250, 40);
    Game.world.createPath(1550, 1300, 40, 100);

    // Central fountain
    Game.world.createBuilding(Game.CONFIG.LOCATIONS.fountain.x, Game.CONFIG.LOCATIONS.fountain.y, "", "", "fountain-anchor", "fountain");

    // Bakery
    Game.world.createBuilding(Game.CONFIG.LOCATIONS.bakery.x, Game.CONFIG.LOCATIONS.bakery.y, "🍞", "Boulangerie", "bakery-anchor");

    // Shop
    Game.world.createBuilding(Game.CONFIG.LOCATIONS.shop.x, Game.CONFIG.LOCATIONS.shop.y, "🏪", "Magasin", "shop-anchor");

    // Fish Shop (Poissonnerie)
    Game.world.createBuilding(Game.CONFIG.LOCATIONS.fishShop.x, Game.CONFIG.LOCATIONS.fishShop.y, "🐟", "Poissonnerie", "fishShop-anchor");

    // NPC houses
    Game.HOUSES.forEach(function(h) {
        if (h.id === 'charlie') return;
        var div = document.createElement('div');
        div.className = 'entity house-exterior';
        div.style.left = h.x + 'px';
        div.style.top = h.y + 'px';
        div.dataset.houseId = h.id;
        div.innerHTML = '<div>' + h.emoji + '</div><div class="building-label">Chez ' + h.name + '</div><div class="house-door"></div>';
        world.appendChild(div);
    });

    // Charlie's house
    var houseEmoji = Game.HOUSE_STAGES[Game.state.houseLevel];
    var site = document.createElement('div');
    site.id = 'house-site';
    site.className = 'entity house-exterior';
    site.style.left = Game.CONFIG.LOCATIONS.charlieHouse.x + 'px';
    site.style.top = Game.CONFIG.LOCATIONS.charlieHouse.y + 'px';
    site.style.fontSize = '5rem';
    site.innerHTML = houseEmoji + '<div class="building-label">Maison de Charlie</div><div class="house-door"></div>';
    world.appendChild(site);

    // Museum
    Game.world.createBuilding(Game.CONFIG.LOCATIONS.museum.x, Game.CONFIG.LOCATIONS.museum.y, "🏛️", "Musée", "museum-anchor");

    // Mini-forest
    Game.world.createForest();

    // Hills (relief)
    Game.world.createHills();

    // Garden area
    Game.world.createGardenArea();

    // Render player-placed paths from save
    Game.tools.renderAllPaths();

    // Apply season colors
    document.documentElement.style.setProperty('--grass', Game.SEASON_GRASS[Game.state.season]);
};

Game.world.createRiver = function(baseX, startY, totalHeight) {
    var world = document.getElementById('game-world');
    for (var y = 0; y < totalHeight; y += 80) {
        var seg = document.createElement('div');
        seg.className = 'river-segment';
        seg.style.left = (baseX + Math.sin(y / 250) * 80) + 'px';
        seg.style.top = y + 'px';
        seg.style.width = '150px';
        seg.style.height = '100px';
        world.appendChild(seg);
    }
};

Game.world.createBridge = function(x, y, w, h) {
    var b = document.createElement('div');
    b.className = 'bridge';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    b.style.width = w + 'px';
    b.style.height = h + 'px';
    // Plank lines (opaque, no transparent gaps)
    b.style.backgroundImage = "repeating-linear-gradient(90deg, #a67c52, #a67c52 18px, #8b6544 18px, #8b6544 20px)";
    document.getElementById('game-world').appendChild(b);
};

Game.world.createPath = function(x, y, w, h) {
    var p = document.createElement('div');
    p.className = 'path';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.width = w + 'px';
    p.style.height = h + 'px';
    document.getElementById('game-world').appendChild(p);
};

Game.world.createBuilding = function(x, y, emoji, label, id, extraClass) {
    var b = document.createElement('div');
    b.className = 'entity ' + (extraClass || '');
    if (id) b.id = id;
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    b.style.fontSize = '4.5rem';
    b.innerHTML = '<div>' + emoji + '</div><div class="building-label">' + label + '</div>';
    document.getElementById('game-world').appendChild(b);
};

Game.world.createGardenArea = function() {
    var loc = Game.CONFIG.LOCATIONS.garden;
    var container = document.createElement('div');
    container.id = 'garden-area';
    container.className = 'entity';
    container.style.left = loc.x + 'px';
    container.style.top = loc.y + 'px';

    var label = document.createElement('div');
    label.className = 'building-label';
    label.textContent = '🌱 Jardin';
    container.appendChild(label);

    var grid = document.createElement('div');
    grid.id = 'garden-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,36px);gap:3px;margin-top:5px;';
    for (var i = 0; i < 25; i++) {
        var cell = document.createElement('div');
        cell.className = 'garden-cell';
        cell.dataset.index = i;
        cell.style.cssText = 'width:36px;height:36px;background:rgba(139,90,43,0.6);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;cursor:pointer;border:2px solid rgba(139,90,43,0.3);';
        cell.textContent = '';
        cell.onclick = (function(idx){ return function(){ Game.farming.onPlotClick(idx); }; })(i);
        grid.appendChild(cell);
    }
    container.appendChild(grid);
    document.getElementById('game-world').appendChild(container);
};

Game.world.createForest = function() {
    var world = document.getElementById('game-world');
    var loc = Game.CONFIG.LOCATIONS.forest;
    var season = Game.state.season;

    // Forest ground
    var ground = document.createElement('div');
    ground.className = 'forest-ground';
    ground.style.cssText = 'position:absolute;border-radius:50%;pointer-events:none;z-index:0;';
    ground.style.left = (loc.x - 200) + 'px';
    ground.style.top = (loc.y - 200) + 'px';
    ground.style.width = '400px';
    ground.style.height = '400px';
    world.appendChild(ground);

    // Label
    var label = document.createElement('div');
    label.className = 'entity';
    label.style.left = loc.x + 'px';
    label.style.top = (loc.y - 180) + 'px';
    label.innerHTML = '<div class="building-label">🌳 Mini-forêt</div>';
    world.appendChild(label);

    // Dense tree cluster
    for (var i = 0; i < 18; i++) {
        var angle = Math.random() * Math.PI * 2;
        var dist = Math.random() * 180;
        var tx = loc.x + Math.cos(angle) * dist;
        var ty = loc.y + Math.sin(angle) * dist;
        var tree = document.createElement('div');
        tree.className = 'entity tree forest-tree';
        tree.style.left = tx + 'px';
        tree.style.top = ty + 'px';
        tree.style.fontSize = (3 + Math.random() * 2) + 'rem';
        tree.innerHTML = Game.SEASON_TREE[season];
        tree.dataset.hasApple = (season !== 'winter') ? 'true' : 'false';
        world.appendChild(tree);
    }
};

Game.world.createHills = function() {
    var world = document.getElementById('game-world');
    var hills = [
        { x: 1800, y: 700, size: 320 },
        { x: 350,  y: 1900, size: 260 },
        { x: 2300, y: 1500, size: 220 },
        { x: 2100, y: 300,  size: 200 }
    ];
    hills.forEach(function(h) {
        var div = document.createElement('div');
        div.className = 'hill';
        div.style.left = (h.x - h.size / 2) + 'px';
        div.style.top = (h.y - h.size / 2) + 'px';
        div.style.width = h.size + 'px';
        div.style.height = h.size + 'px';
        world.appendChild(div);
    });
};

Game.world.updateHouseSite = function() {
    var s = Game.state;
    var hLabel = s.houseLevel < 4 ? 'Maison de Charlie' : 'Chez Charlie';
    var hEmoji = Game.HOUSE_STAGES[s.houseLevel];
    var site = document.getElementById('house-site');
    if (site) {
        site.innerHTML = hEmoji + '<div class="building-label">' + hLabel + '</div><div class="house-door"></div>';
    }
};

})();
