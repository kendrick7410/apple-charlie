// ── state.js ── État du jeu + sauvegarde localStorage ──
(function(){
"use strict";

Game.state = {
    currentView: 'title',  // 'title', 'world', 'interior'
    activeHouse: null,
    activeShop: null,
    charlie: { x: 1000, y: 1100, visualX: 1000, visualY: 1100, facing: 'down', walking: false },
    interiorCharlie: { x: 280, y: 500 },
    inventory: { apples: 0, bread: 0, fish: 0, flowers: 0, money: 0, materials: 0, wood: 0, stone: 0, butterflies: 0 },
    cookedItems: {},  // { applePie: 2, sushi: 1, ... }
    seeds: { carrot: 0, pumpkin: 0, wheat: 0, strawberry: 0 },
    houseLevel: 0,
    isBaking: false,
    isFishing: false,
    tools: { axe: false, rod: false, watering: false, shovel: false, net: false, piolet: false, crampons: false },
    shovelMode: false,
    xp: 0,
    level: 1,
    gameHour: 8,
    gameMinute: 0,
    season: 'spring',
    seasonIndex: 0,
    weather: 'clear',    // 'clear', 'rain', 'snow', 'sunny'
    gardenPlots: [],     // [{crop,stage,waterLevel,plantedAt}]
    questProgress: {},   // { 'Lya 🐰': 0, ... }  index of current quest
    questCompleted: {},  // { 'Lya 🐰': [true, false, ...] }
    villagers: [],
    fishShop: { stock: 0, revenue: 0 },
    specimens: { fish: {}, butterflies: {} },
    museum: { fish: {}, butterflies: {} },
    seaCollection: {},       // animaux de la mer trouvés { id: count }
    mountainCollection: {},  // animaux de la montagne trouvés { id: count }
    summits: {},             // sommets gravis (alpinisme) { 'Le Cervin': true }
    cramponsOn: true,        // crampons enfilés (quand on les a)
    swing: null,             // balançoire achetée { x, y } (x null = pas encore placée)
    swingPlacing: false,
    snowGlobes: [],          // boules à neige possédées [id, ...]
    pizzasTasted: {},        // pizzas de David goûtées { id: count }
    pizzasOwned: {},         // pizzas achetées chez David, gardées pour manger { id: count }
    skin: 'aventurier',      // skin équipé (voir Game.SKINS)
    skinsOwned: [],          // skins débloqués [id, ...]
    hunger: 100,             // barre de faim (0-100)
    harvest: {},             // légumes/fruits récoltés au jardin { id: count }
    villageRevenue: 0,
    timeSpeed: 1,
    placedFlowers: [],   // [{x,y,emoji}]
    placedPaths: [],     // [{x,y}]
    houseFurniture: {},  // per-house id
    builtHouses: [],     // maisons de villageois construites [id, ...] (voir Game.HOUSES)
    builtShops: [],      // bâtiments construits [id, ...] (voir Game.SHOPS, champ level)
    totalTimePlayed: 0,
    keysDown: {},
    paused: false,
    dead: false
};

// Deep clone default state for new game
Game._defaultState = JSON.parse(JSON.stringify(Game.state));

Game.newGame = function() {
    var def = JSON.parse(JSON.stringify(Game._defaultState));
    // Preserve non-serializable
    def.keysDown = {};
    def.villagers = [];
    def.activeHouse = null;
    Object.assign(Game.state, def);
    Game.state.currentView = 'world';
    // init quest progress
    for (var name in Game.VILLAGER_DATA) {
        Game.state.questProgress[name] = 0;
        Game.state.questCompleted[name] = [];
    }
    // init garden
    Game.state.gardenPlots = [];
    for (var i = 0; i < Game.CONFIG.GARDEN_COLS * Game.CONFIG.GARDEN_ROWS; i++) {
        Game.state.gardenPlots.push({ crop: null, stage: 0, waterLevel: 0, plantedAt: 0 });
    }
    // init house furniture from config
    Game.state.houseFurniture = {};
    Game.HOUSES.forEach(function(h) {
        Game.state.houseFurniture[h.id] = h.furniture.map(function(f){ return f.slice(); });
    });
    // Nouvelle partie : une seule maison (et un seul villageois) au départ
    Game.state.builtHouses = Game.HOUSES.filter(function(h){ return h.start; }).map(function(h){ return h.id; });
    // Les bâtiments avec un niveau requis (boulangerie, poissonnerie, pizzeria, musée) sont à construire
    Game.state.builtShops = Game.SHOPS.filter(function(sh){ return !sh.level; }).map(function(sh){ return sh.id; });
};

Game.saveGame = function() {
    var s = Game.state;
    var data = {
        charlie: { x: s.charlie.x, y: s.charlie.y },
        inventory: Object.assign({}, s.inventory),
        cookedItems: Object.assign({}, s.cookedItems),
        seeds: Object.assign({}, s.seeds),
        houseLevel: s.houseLevel,
        tools: Object.assign({}, s.tools),
        xp: s.xp,
        level: s.level,
        gameHour: s.gameHour,
        gameMinute: s.gameMinute,
        season: s.season,
        seasonIndex: s.seasonIndex,
        gardenPlots: JSON.parse(JSON.stringify(s.gardenPlots)),
        questProgress: Object.assign({}, s.questProgress),
        questCompleted: JSON.parse(JSON.stringify(s.questCompleted)),
        fishShop: { stock: s.fishShop.stock, revenue: s.fishShop.revenue },
        specimens: JSON.parse(JSON.stringify(s.specimens)),
        museum: JSON.parse(JSON.stringify(s.museum)),
        seaCollection: Object.assign({}, s.seaCollection),
        mountainCollection: Object.assign({}, s.mountainCollection),
        summits: Object.assign({}, s.summits),
        cramponsOn: s.cramponsOn,
        swing: s.swing,
        snowGlobes: s.snowGlobes.slice(),
        pizzasTasted: Object.assign({}, s.pizzasTasted),
        pizzasOwned: Object.assign({}, s.pizzasOwned),
        skin: s.skin,
        skinsOwned: s.skinsOwned.slice(),
        hunger: s.hunger,
        harvest: Object.assign({}, s.harvest),
        villageRevenue: s.villageRevenue,
        timeSpeed: s.timeSpeed,
        placedFlowers: s.placedFlowers.slice(),
        placedPaths: s.placedPaths.slice(),
        houseFurniture: JSON.parse(JSON.stringify(s.houseFurniture)),
        builtHouses: s.builtHouses.slice(),
        builtShops: s.builtShops.slice(),
        totalTimePlayed: s.totalTimePlayed
    };
    try {
        localStorage.setItem('charlie_village_save', JSON.stringify(data));
    } catch(e) {
        console.warn('Save failed:', e);
    }
};

Game.loadGame = function() {
    try {
        var raw = localStorage.getItem('charlie_village_save');
        if (!raw) return false;
        var data = JSON.parse(raw);
        Game.newGame(); // reset first
        var s = Game.state;
        if (data.charlie) { s.charlie.x = data.charlie.x; s.charlie.y = data.charlie.y; s.charlie.visualX = data.charlie.x; s.charlie.visualY = data.charlie.y; }
        if (data.inventory) Object.assign(s.inventory, data.inventory);
        if (data.cookedItems) Object.assign(s.cookedItems, data.cookedItems);
        if (data.seeds) Object.assign(s.seeds, data.seeds);
        if (data.houseLevel !== undefined) s.houseLevel = data.houseLevel;
        if (data.tools) Object.assign(s.tools, data.tools);
        if (data.xp !== undefined) s.xp = data.xp;
        if (data.level !== undefined) s.level = data.level;
        if (data.gameHour !== undefined) s.gameHour = data.gameHour;
        if (data.gameMinute !== undefined) s.gameMinute = data.gameMinute;
        if (data.season) s.season = data.season;
        if (data.seasonIndex !== undefined) s.seasonIndex = data.seasonIndex;
        if (data.gardenPlots) s.gardenPlots = data.gardenPlots;
        if (data.questProgress) Object.assign(s.questProgress, data.questProgress);
        if (data.questCompleted) s.questCompleted = data.questCompleted;
        if (data.fishShop) { s.fishShop.stock = data.fishShop.stock || 0; s.fishShop.revenue = data.fishShop.revenue || 0; }
        if (data.specimens) s.specimens = data.specimens;
        if (data.museum) s.museum = data.museum;
        if (data.seaCollection) s.seaCollection = data.seaCollection;
        if (data.mountainCollection) s.mountainCollection = data.mountainCollection;
        if (data.summits) s.summits = data.summits;
        if (data.cramponsOn !== undefined) s.cramponsOn = data.cramponsOn;
        if (data.swing) { s.swing = data.swing; s.swingPlacing = data.swing.x === null; }
        if (data.snowGlobes) s.snowGlobes = data.snowGlobes;
        if (data.pizzasTasted) s.pizzasTasted = data.pizzasTasted;
        if (data.pizzasOwned) s.pizzasOwned = data.pizzasOwned;
        if (data.skin) s.skin = data.skin;
        if (data.skinsOwned) s.skinsOwned = data.skinsOwned;
        if (data.hunger !== undefined) s.hunger = data.hunger;
        if (data.harvest) s.harvest = data.harvest;
        if (data.villageRevenue !== undefined) s.villageRevenue = data.villageRevenue;
        if (data.timeSpeed !== undefined) s.timeSpeed = data.timeSpeed;
        if (data.placedFlowers) s.placedFlowers = data.placedFlowers;
        if (data.placedPaths) s.placedPaths = data.placedPaths;
        if (data.houseFurniture) s.houseFurniture = data.houseFurniture;
        // Ancienne sauvegarde (avant les terrains à bâtir) : on garde tout le village déjà là
        s.builtHouses = data.builtHouses || Game.HOUSES.map(function(h){ return h.id; });
        // Maisons présentes dès le début (refuge du Cervin) : aussi dans les anciennes parties
        Game.HOUSES.forEach(function(h) { if (h.start && s.builtHouses.indexOf(h.id) === -1) s.builtHouses.push(h.id); });
        s.builtShops = data.builtShops || Game.SHOPS.map(function(sh){ return sh.id; });
        Game.HOUSES.forEach(function(h) {
            if (!s.houseFurniture[h.id]) s.houseFurniture[h.id] = h.furniture.map(function(f){ return f.slice(); });
        });
        if (data.totalTimePlayed) s.totalTimePlayed = data.totalTimePlayed;
        s.currentView = 'world';
        return true;
    } catch(e) {
        console.warn('Load failed:', e);
        return false;
    }
};

Game.hasSave = function() {
    return !!localStorage.getItem('charlie_village_save');
};

Game.deleteSave = function() {
    localStorage.removeItem('charlie_village_save');
};

// Auto-save timer
Game._saveTimer = null;
Game.startAutoSave = function() {
    if (Game._saveTimer) clearInterval(Game._saveTimer);
    Game._saveTimer = setInterval(function(){
        if (Game.state.currentView !== 'title') Game.saveGame();
    }, Game.CONFIG.SAVE_INTERVAL);
};

window.addEventListener('beforeunload', function() {
    if (Game.state.currentView !== 'title') Game.saveGame();
});

})();
