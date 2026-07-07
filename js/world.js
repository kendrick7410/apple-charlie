// ── world.js ── Génération du monde (rivière, chemins, bâtiments) ──
(function(){
"use strict";

Game.world = {};

Game.world.init = function() {
    var world = document.getElementById('game-world');

    // River (bras ouest + division vers le milieu de la carte jusqu'à la mer)
    Game.world.createRiver();

    // Paths (réseau centralisé, cf. Game.PATHS)
    Game.PATHS.forEach(function(p) {
        Game.world.createPath(p.x, p.y, p.w, p.h);
    });

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
        // Extract name without emoji
        var nameOnly = h.name.split(' ')[0];
        div.innerHTML = '<div>' + h.emoji + '</div><div class="building-label">Chez ' + nameOnly + '</div>';
        world.appendChild(div);
    });

    // Charlie's house
    var houseEmoji = Game.HOUSE_STAGES[Math.min(Game.state.houseLevel, Game.HOUSE_STAGES.length - 1)];
    var site = document.createElement('div');
    site.id = 'house-site';
    site.className = 'entity house-exterior';
    site.style.left = Game.CONFIG.LOCATIONS.charlieHouse.x + 'px';
    site.style.top = Game.CONFIG.LOCATIONS.charlieHouse.y + 'px';
    site.style.fontSize = '5rem';
    site.innerHTML = houseEmoji + '<div class="building-label">Maison de Charlie</div>';
    world.appendChild(site);

    // Museum
    Game.world.createBuilding(Game.CONFIG.LOCATIONS.museum.x, Game.CONFIG.LOCATIONS.museum.y, "🏛️", "Musée", "museum-anchor");

    // Pizzeria David (le rhinocéros)
    Game.world.createBuilding(Game.CONFIG.LOCATIONS.pizzeria.x, Game.CONFIG.LOCATIONS.pizzeria.y, "🍕", "Pizzeria David", "pizzeria-anchor");

    // Mini-forest
    Game.world.createForest();

    // Terrain alpin distinct autour des montagnes (neige, roche, sapins)
    Game.world.createMountainTerrain();

    // Mountain (Le Cervin)
    Game.world.createMountain();

    // 3 sommets supplémentaires à côté du Cervin
    Game.world.createExtraPeaks();

    // Mer + grande plage (bas de la carte)
    Game.world.createSeaAndBeach();

    // Port (bateaux de marchandise)
    Game.world.createPort();

    // Boutique souvenir (au bord de la plage)
    Game.world.createBuilding(Game.CONFIG.LOCATIONS.souvenirShop.x, Game.CONFIG.LOCATIONS.souvenirShop.y, "🎁", "Boutique Souvenir", "souvenir-anchor");

    // Lake (Lac du Cervin)
    Game.world.createLake();

    // Hills (relief)
    Game.world.createHills();

    // Garden area
    Game.world.createGardenArea();

    // Render player-placed paths from save
    Game.tools.renderAllPaths();

    // Apply season colors
    document.documentElement.style.setProperty('--grass', Game.SEASON_GRASS[Game.state.season]);
};

Game.world.createRiver = function() {
    var world = document.getElementById('game-world');
    Game.buildRiverSegments().forEach(function(s) {
        var seg = document.createElement('div');
        seg.className = 'river-segment';
        seg.style.left = s.x + 'px';
        seg.style.top = s.y + 'px';
        seg.style.width = s.w + 'px';
        seg.style.height = s.h + 'px';
        world.appendChild(seg);
    });
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

    // Forest ground (enlarged)
    var ground = document.createElement('div');
    ground.className = 'forest-ground';
    ground.style.cssText = 'position:absolute;border-radius:50%;pointer-events:none;z-index:0;';
    ground.style.left = (loc.x - 350) + 'px';
    ground.style.top = (loc.y - 350) + 'px';
    ground.style.width = '700px';
    ground.style.height = '700px';
    world.appendChild(ground);

    // Label
    var label = document.createElement('div');
    label.className = 'entity';
    label.style.left = loc.x + 'px';
    label.style.top = (loc.y - 330) + 'px';
    label.innerHTML = '<div class="building-label">🌳 Grande Forêt</div>';
    world.appendChild(label);

    // Dense tree cluster (more trees in larger area)
    for (var i = 0; i < 35; i++) {
        var angle = Math.random() * Math.PI * 2;
        var dist = Math.random() * 320;
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

// ── Paysage alpin : recouvre la zone des montagnes d'un sol neige/roche + sapins & rochers ──
Game.world.createMountainTerrain = function() {
    var world = document.getElementById('game-world');
    var region = { x1: 2650, y1: 300, x2: 4400, y2: 1750 };
    var w = region.x2 - region.x1, h = region.y2 - region.y1;

    // Sol d'altitude : neige en haut → roche grise → prairie alpine en bas
    var ground = document.createElement('div');
    ground.style.cssText = 'position:absolute;left:' + region.x1 + 'px;top:' + region.y1 + 'px;width:' + w + 'px;height:' + h +
        'px;z-index:0;pointer-events:none;border-radius:44% 48% 46% 50% / 40% 42% 46% 44%;' +
        'background:' +
            'radial-gradient(circle at 30% 16%, rgba(255,255,255,0.6), rgba(255,255,255,0) 32%),' +
            'radial-gradient(circle at 72% 82%, rgba(120,140,90,0.32), rgba(120,140,90,0) 46%),' +
            'linear-gradient(180deg,#e9eef2 0%,#cdd4d8 20%,#b7b1a6 44%,#aeb391 70%,#a2b487 100%);' +
        'box-shadow:inset 0 0 70px rgba(90,90,110,0.16);';
    world.appendChild(ground);

    // Zones à ne pas encombrer (lac, sommets, refuge)
    var avoid = [
        { x: 3200, y: 600,  r: 270 }, { x: 3500, y: 800,  r: 180 },
        { x: 3980, y: 1080, r: 150 }, { x: 3020, y: 1080, r: 150 },
        { x: 3500, y: 1420, r: 150 }, { x: 3300, y: 950,  r: 140 }
    ];
    function free(x, y) {
        for (var i = 0; i < avoid.length; i++) {
            if (Math.hypot(x - avoid[i].x, y - avoid[i].y) < avoid[i].r) return false;
        }
        return true;
    }
    function scatter(emoji, count, minR, maxR, opacity, z) {
        for (var i = 0; i < count; i++) {
            var x, y, ok = false;
            for (var t = 0; t < 12 && !ok; t++) {
                x = region.x1 + 30 + Math.random() * (w - 60);
                y = region.y1 + 30 + Math.random() * (h - 60);
                ok = free(x, y);
            }
            if (!ok) continue;
            var d = document.createElement('div');
            d.className = 'entity';
            d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;font-size:' +
                (minR + Math.random() * (maxR - minR)).toFixed(2) + 'rem;z-index:' + (z || 4) +
                ';pointer-events:none;' + (opacity ? 'opacity:' + opacity + ';' : '') +
                'filter:drop-shadow(0 3px 3px rgba(0,0,0,0.22));';
            d.textContent = emoji;
            world.appendChild(d);
        }
    }
    scatter('🗻', 4,  3.6, 5.2, 0.9, 2);   // sommets enneigés au loin
    scatter('🌲', 30, 2.2, 4.2);           // grands sapins
    scatter('🌲', 14, 1.5, 2.3);           // petits sapins
    scatter('🪨', 18, 1.4, 3.0);           // rochers
    scatter('❄️', 12, 1.0, 2.0, 0.85);     // plaques de neige
};

Game.world.createMountain = function() {
    var world = document.getElementById('game-world');
    var loc = Game.CONFIG.LOCATIONS.mountain;

    // Mountain base
    var base = document.createElement('div');
    base.className = 'mountain-base';
    base.style.cssText = 'position:absolute;z-index:0;pointer-events:none;';
    base.style.left = (loc.x - 400) + 'px';
    base.style.top = (loc.y - 250) + 'px';
    base.style.width = '800px';
    base.style.height = '500px';
    base.style.background = 'radial-gradient(ellipse at 50% 100%, rgba(120,100,80,0.3) 0%, rgba(150,130,110,0.2) 40%, transparent 70%)';
    world.appendChild(base);

    // Mountain emoji (peak)
    var peak = document.createElement('div');
    peak.className = 'entity';
    peak.style.fontSize = '8rem';
    peak.style.left = loc.x + 'px';
    peak.style.top = (loc.y - 100) + 'px';
    peak.style.filter = 'drop-shadow(0 8px 12px rgba(0,0,0,0.3))';
    peak.innerHTML = '🏔️';
    world.appendChild(peak);

    // Label
    var label = document.createElement('div');
    label.className = 'entity';
    label.style.left = loc.x + 'px';
    label.style.top = (loc.y + 80) + 'px';
    label.innerHTML = '<div class="building-label" style="font-size:12px;font-weight:bold;">⛰️ Le Cervin</div>';
    world.appendChild(label);

    // Animated snow patches around peak
    for (var i = 0; i < 8; i++) {
        var snow = document.createElement('div');
        snow.className = 'entity mountain-snow';
        snow.style.fontSize = (1.5 + Math.random() * 2) + 'rem';
        var angle = (i / 8) * Math.PI * 2;
        var dist = 80 + Math.random() * 60;
        snow.style.left = (loc.x + Math.cos(angle) * dist) + 'px';
        snow.style.top = (loc.y - 100 + Math.sin(angle) * dist) + 'px';
        snow.innerHTML = '❄️';
        snow.style.opacity = '0.7';
        snow.style.animationDelay = (i * 0.3) + 's';
        snow.style.animationDuration = (3 + Math.random() * 2) + 's';
        world.appendChild(snow);
    }

    // Mountain goat (bouquetin)
    var goat = document.createElement('div');
    goat.className = 'entity mountain-goat';
    goat.style.fontSize = '3rem';
    goat.style.left = (loc.x + 150) + 'px';
    goat.style.top = (loc.y + 30) + 'px';
    goat.innerHTML = '🐐';
    goat.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))';
    world.appendChild(goat);

    // Mountain Refuge
    var refuge = document.createElement('div');
    refuge.className = 'entity';
    refuge.style.fontSize = '4rem';
    refuge.style.left = (loc.x - 200) + 'px';
    refuge.style.top = (loc.y + 150) + 'px';
    refuge.style.cursor = 'pointer';
    refuge.innerHTML = '<div style="font-size:4rem;">🏚️</div><div class="building-label">🔥 Refuge du Cervin</div>';
    world.appendChild(refuge);
};

Game.world.createLake = function() {
    var world = document.getElementById('game-world');
    var loc = Game.CONFIG.LOCATIONS.lake;

    // Lake water body
    var lake = document.createElement('div');
    lake.className = 'lake-water';
    lake.style.cssText = 'position:absolute;border-radius:50%;z-index:2;pointer-events:none;';
    lake.style.left = (loc.x - 250) + 'px';
    lake.style.top = (loc.y - 150) + 'px';
    lake.style.width = '500px';
    lake.style.height = '300px';
    lake.style.background = 'radial-gradient(ellipse at center, rgba(90,160,220,0.8) 0%, rgba(70,130,200,0.7) 50%, rgba(50,100,170,0.5) 80%, transparent 100%)';
    lake.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.2)';
    world.appendChild(lake);

    // Lake shimmer effect
    var shimmer = document.createElement('div');
    shimmer.className = 'lake-shimmer';
    shimmer.style.cssText = 'position:absolute;border-radius:50%;z-index:3;pointer-events:none;';
    shimmer.style.left = (loc.x - 200) + 'px';
    shimmer.style.top = (loc.y - 120) + 'px';
    shimmer.style.width = '400px';
    shimmer.style.height = '240px';
    shimmer.style.background = 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)';
    world.appendChild(shimmer);

    // Label
    var label = document.createElement('div');
    label.className = 'entity';
    label.style.left = loc.x + 'px';
    label.style.top = (loc.y - 180) + 'px';
    label.innerHTML = '<div class="building-label" style="font-size:11px;font-weight:bold;">💧 Lac du Cervin</div>';
    world.appendChild(label);

    // Decorative elements (reeds/plants)
    for (var i = 0; i < 6; i++) {
        var reed = document.createElement('div');
        reed.className = 'entity';
        reed.style.fontSize = (1.5 + Math.random() * 0.5) + 'rem';
        var angle = (i / 6) * Math.PI * 2;
        var dist = 220 + Math.random() * 40;
        reed.style.left = (loc.x + Math.cos(angle) * dist) + 'px';
        reed.style.top = (loc.y + Math.sin(angle) * dist * 0.6) + 'px';
        reed.innerHTML = '🌾';
        reed.style.opacity = '0.7';
        world.appendChild(reed);
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

// Massif de montagnes autour du Cervin : sommets proches mais qui ne se touchent pas
Game.world.createExtraPeaks = function() {
    var world = document.getElementById('game-world');
    var L = Game.CONFIG.LOCATIONS;
    var peaks = [
        // les 3 sommets "nommés" (servent aussi de zone d'apparition des animaux)
        { loc: L.mountain2, name: 'Le Glacier',   size: '6.5rem' },
        { loc: L.mountain3, name: 'La Dent',      size: '6rem' },
        { loc: L.mountain4, name: 'Le Pic Blanc', size: '7rem' },
        // 5 sommets supplémentaires, espacés (>= 300px) pour ne pas se chevaucher
        { loc: { x: 2700, y: 760 },  name: "L'Aiguille",     size: '5.5rem' },
        { loc: { x: 4320, y: 800 },  name: 'Le Mont Roc',    size: '6.5rem' },
        { loc: { x: 2720, y: 1380 }, name: 'La Roche Grise', size: '5.5rem' },
        { loc: { x: 4300, y: 1380 }, name: 'Le Sommet Noir', size: '6rem' },
        { loc: { x: 3500, y: 360 },  name: 'Le Grand Pic',   size: '7.5rem' }
    ];
    peaks.forEach(function(pk) {
        var loc = pk.loc;
        var base = document.createElement('div');
        base.style.cssText = 'position:absolute;z-index:0;pointer-events:none;';
        base.style.left = (loc.x - 230) + 'px';
        base.style.top = (loc.y - 150) + 'px';
        base.style.width = '460px';
        base.style.height = '320px';
        base.style.background = 'radial-gradient(ellipse at 50% 100%, rgba(120,100,80,0.3) 0%, rgba(150,130,110,0.18) 45%, transparent 72%)';
        world.appendChild(base);

        var peak = document.createElement('div');
        peak.className = 'entity';
        peak.style.fontSize = pk.size;
        peak.style.left = loc.x + 'px';
        peak.style.top = (loc.y - 80) + 'px';
        peak.style.filter = 'drop-shadow(0 8px 12px rgba(0,0,0,0.3))';
        peak.innerHTML = '🏔️';
        world.appendChild(peak);

        var label = document.createElement('div');
        label.className = 'entity';
        label.style.left = loc.x + 'px';
        label.style.top = (loc.y + 70) + 'px';
        label.innerHTML = '<div class="building-label" style="font-size:11px;font-weight:bold;">⛰️ ' + pk.name + '</div>';
        world.appendChild(label);

        for (var i = 0; i < 5; i++) {
            var snow = document.createElement('div');
            snow.className = 'entity mountain-snow';
            snow.style.fontSize = (1.2 + Math.random() * 1.5) + 'rem';
            var angle = (i / 5) * Math.PI * 2;
            var dist = 60 + Math.random() * 50;
            snow.style.left = (loc.x + Math.cos(angle) * dist) + 'px';
            snow.style.top = (loc.y - 70 + Math.sin(angle) * dist) + 'px';
            snow.innerHTML = '❄️';
            snow.style.opacity = '0.7';
            world.appendChild(snow);
        }
    });
};

// Ligne de rivage (y du bord de l'eau à la position x) — partagée rendu + collision joueur
Game.world.shorelineY = function(x) {
    var seaTop = Game.CONFIG.SEA_TOP, a = 115, ph = 2.1;
    return seaTop + Math.sin(x / 560 + ph) * a + Math.sin(x / 230 + ph * 1.7) * (a * 0.5) + Math.sin(x / 90 + ph * 2.3) * (a * 0.25);
};

// Mer + grande plage, dessinées en SVG → côtes parfaitement courbes (aucun bord droit)
Game.world.createSeaAndBeach = function() {
    var world = document.getElementById('game-world');
    var W = Game.CONFIG.WORLD_W;
    var H = Game.CONFIG.WORLD_H;
    var beachTop = Game.CONFIG.BEACH_TOP;
    var seaTop = Game.CONFIG.SEA_TOP;
    var SVGNS = 'http://www.w3.org/2000/svg';

    function coast(x, a, ph) {
        return Math.sin(x / 560 + ph) * a + Math.sin(x / 230 + ph * 1.7) * (a * 0.5) + Math.sin(x / 90 + ph * 2.3) * (a * 0.25);
    }
    var grassLine = function(x) { return beachTop + coast(x, 155, 0.4); };
    var seaLine = Game.world.shorelineY;

    // Polygone : suit la courbe du haut (gauche→droite) puis descend jusqu'en bas
    function fillPath(yFn) {
        var d = 'M 0 ' + yFn(0).toFixed(1);
        for (var x = 0; x <= W; x += 36) d += ' L ' + x + ' ' + yFn(x).toFixed(1);
        return d + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z';
    }
    function linePath(yFn) {
        var d = 'M 0 ' + yFn(0).toFixed(1);
        for (var x = 0; x <= W; x += 36) d += ' L ' + x + ' ' + yFn(x).toFixed(1);
        return d;
    }

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.style.cssText = 'position:absolute;left:0;top:0;z-index:0;pointer-events:none;overflow:visible;';
    svg.innerHTML =
        '<defs>' +
          '<linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#f3e2b3"/><stop offset="100%" stop-color="#e7c879"/></linearGradient>' +
          '<linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#63cdee"/><stop offset="40%" stop-color="#2f9fd0"/>' +
            '<stop offset="100%" stop-color="#12608c"/></linearGradient>' +
        '</defs>' +
        '<path d="' + fillPath(grassLine) + '" fill="url(#sandGrad)"/>' +
        '<path d="' + fillPath(seaLine) + '" fill="url(#seaGrad)"/>' +
        '<path class="sea-foam-svg" d="' + linePath(seaLine) + '" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="16" stroke-linecap="round"/>';
    world.appendChild(svg);

    // Touffes d'herbe de plage le long de la côte herbe/sable
    for (var gx = 80; gx < W; gx += 170 + Math.random() * 170) {
        var gel = document.createElement('div');
        gel.className = 'entity';
        gel.style.cssText = 'left:' + gx + 'px;top:' + (grassLine(gx) + 6) +
            'px;font-size:' + (1.3 + Math.random()) + 'rem;z-index:3;opacity:0.85;';
        gel.innerHTML = Math.random() > 0.5 ? '🌾' : '🌿';
        world.appendChild(gel);
    }

    // Bassins de marée (petites flaques sur le sable, entre la côte et l'eau)
    for (var t = 0; t < 8; t++) {
        var px = 200 + Math.random() * (W - 400);
        var pTop = grassLine(px) + 70, pBot = seaLine(px) - 60;
        if (pBot <= pTop) continue;
        var py = pTop + Math.random() * (pBot - pTop);
        var pool = document.createElement('div');
        pool.style.cssText = 'position:absolute;z-index:1;pointer-events:none;border-radius:50%;left:' + px + 'px;top:' + py +
            'px;width:' + (90 + Math.random() * 80) + 'px;height:' + (45 + Math.random() * 30) +
            'px;background:radial-gradient(ellipse at center,rgba(120,200,230,0.7) 0%,rgba(120,200,230,0.3) 60%,transparent 85%);';
        world.appendChild(pool);
    }

    // Label
    var label = document.createElement('div');
    label.className = 'entity';
    label.style.left = Game.CONFIG.LOCATIONS.beach.x + 'px';
    label.style.top = (beachTop + 30) + 'px';
    label.innerHTML = '<div class="building-label" style="font-size:13px;font-weight:bold;">🏖️ Grande Plage</div>';
    world.appendChild(label);

    // Décor dispersé : placé entre la côte (herbe/sable) et l'eau, PAR position x,
    // donc il suit la courbe du rivage et continue jusqu'au bord de l'eau
    // (fromFrac/toFrac : 0 = bord herbe, 1 = bord de l'eau)
    function scatter(emoji, count, minSize, maxSize, fromFrac, toFrac) {
        for (var i = 0; i < count; i++) {
            var x = 90 + Math.random() * (W - 180);
            var top = grassLine(x) + 25;     // juste sous la limite herbe/sable
            var bottom = seaLine(x) - 30;    // juste avant l'eau
            if (bottom <= top) continue;
            var y = top + (fromFrac + Math.random() * (toFrac - fromFrac)) * (bottom - top);
            var el = document.createElement('div');
            el.className = 'entity';
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.fontSize = (minSize + Math.random() * (maxSize - minSize)) + 'rem';
            el.style.zIndex = '3';
            el.innerHTML = emoji;
            world.appendChild(el);
        }
    }
    scatter('🌴', 16, 3.5, 5.2, 0,    0.4);   // palmiers (côté herbe)
    scatter('⛱️', 9,  3,   3.6, 0.1,  0.9);   // parasols (toute la plage)
    scatter('🪨', 14, 1.6, 2.8, 0.05, 0.97);  // rochers (jusqu'au bord de l'eau)
    scatter('🪵', 8,  1.8, 2.6, 0.15, 0.95);  // bois flotté
    scatter('🏖️', 5,  2.6, 3.2, 0.2,  0.92);  // châteaux de sable
    scatter('🏐', 5,  1.8, 2.4, 0.15, 0.92);  // ballons
    scatter('🩴', 8,  1.4, 2,   0.45, 0.95);  // tongs près de l'eau
    scatter('🪁', 4,  2.4, 3.2, 0,    0.25);  // cerfs-volants (côté herbe)
};

// Port avec ponton qui part de la plage et avance DANS l'eau
Game.world.createPort = function() {
    var world = document.getElementById('game-world');
    var loc = Game.CONFIG.LOCATIONS.port;
    var shore = Game.world.shorelineY(loc.x);   // bord de l'eau à cet endroit
    var dockTop = loc.y;
    var dockBottom = shore + 220;               // le ponton dépasse bien dans la mer

    // Ponton en bois
    var dock = document.createElement('div');
    dock.style.cssText = 'position:absolute;z-index:4;pointer-events:none;border-radius:8px;';
    dock.style.left = (loc.x - 45) + 'px';
    dock.style.top = dockTop + 'px';
    dock.style.width = '90px';
    dock.style.height = (dockBottom - dockTop) + 'px';
    dock.style.backgroundImage = 'repeating-linear-gradient(0deg, #a67c52, #a67c52 18px, #8b6544 18px, #8b6544 22px)';
    dock.style.boxShadow = '0 4px 10px rgba(0,0,0,0.25)';
    world.appendChild(dock);

    // Pilotis au bout du ponton (dans l'eau)
    [ -45, 45 ].forEach(function(dx) {
        var post = document.createElement('div');
        post.className = 'entity';
        post.style.left = (loc.x + dx) + 'px';
        post.style.top = (dockBottom - 26) + 'px';
        post.style.fontSize = '1.6rem';
        post.style.zIndex = '5';
        post.innerHTML = '🪵';
        world.appendChild(post);
    });

    // Panneau du port (sur la plage)
    var label = document.createElement('div');
    label.className = 'entity';
    label.style.left = loc.x + 'px';
    label.style.top = (loc.y - 40) + 'px';
    label.style.fontSize = '3rem';
    label.style.zIndex = '5';
    label.innerHTML = '<div>⚓</div><div class="building-label">Port de Charlie</div>';
    world.appendChild(label);
};

Game.world.updateHouseSite = function() {
    var s = Game.state;
    var maxLvl = Game.HOUSE_STAGES.length - 1;
    var lvl = Math.min(s.houseLevel, maxLvl);
    var hLabel = lvl < maxLvl ? 'Maison de Charlie' : 'Chez Charlie';
    var hEmoji = Game.HOUSE_STAGES[lvl];
    var site = document.getElementById('house-site');
    if (site) {
        site.innerHTML = hEmoji + '<div class="building-label">' + hLabel + '</div>';
    }
};

})();
