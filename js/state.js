// ── state.js ── État du jeu + sauvegarde localStorage ──
(function(){
"use strict";

Game.state = {
    currentView: 'title',  // 'title', 'world', 'interior'
    activeHouse: null,
    charlie: { x: 1000, y: 1100, visualX: 1000, visualY: 1100, facing: 'down', walking: false },
    interiorCharlie: { x: 280, y: 500 },
    inventory: { apples: 0, bread: 0, fish: 0, flowers: 0, money: 0, materials: 0, wood: 0, stone: 0 },
    cookedItems: {},  // { applePie: 2, sushi: 1, ... }
    seeds: { carrot: 0, pumpkin: 0, wheat: 0, strawberry: 0 },
    houseLevel: 0,
    isBaking: false,
    isFishing: false,
    tools: { axe: false, rod: false, watering: false },
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
    placedFlowers: [],   // [{x,y,emoji}]
    houseFurniture: {},  // per-house id
    totalTimePlayed: 0,
    keysDown: {},
    paused: false
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
        placedFlowers: s.placedFlowers.slice(),
        houseFurniture: JSON.parse(JSON.stringify(s.houseFurniture)),
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
        if (data.placedFlowers) s.placedFlowers = data.placedFlowers;
        if (data.houseFurniture) s.houseFurniture = data.houseFurniture;
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
