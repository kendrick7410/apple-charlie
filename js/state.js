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
    gameHour: 9,
    gameMinute: 0,
    season: 'spring',
    seasonIndex: 0,
    seasonElapsed: 0,    // temps déjà passé dans la saison (ms de jeu), sauvegardé
    dayNumber: 0,        // numéro du jour de jeu
    friendship: {},      // amitié : points par habitant (100 = 1 cœur)
    friendDay: {},       // dernier jour où on a discuté / offert un cadeau
    friendKnown: {},     // goûts découverts en offrant des cadeaux
    friendReward: {},    // portrait déjà offert (5 cœurs)
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
    homeKit: {},         // maisons qui ont reçu leur coin cuisine + coin télé
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
    Game.state.homeKit = {};
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
        seasonElapsed: s.seasonElapsed || 0,
        dayNumber: s.dayNumber || 0,
        friendship: s.friendship || {}, friendDay: s.friendDay || {}, friendKnown: s.friendKnown || {}, friendReward: s.friendReward || {},
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
        homeKit: Object.assign({}, s.homeKit || {}),
        builtHouses: s.builtHouses.slice(),
        builtShops: s.builtShops.slice(),
        villageReset1: true,
        totalTimePlayed: s.totalTimePlayed
    };
    try {
        localStorage.setItem(Game.saveKey(), JSON.stringify(data));
        Game.worlds.touch(Game.worldId, s.level);
    } catch(e) {
        console.warn('Save failed:', e);
    }
};

Game.loadGame = function() {
    try {
        var raw = localStorage.getItem(Game.saveKey());
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
        s.seasonElapsed = typeof data.seasonElapsed === 'number' ? data.seasonElapsed : 0;
        s.dayNumber = data.dayNumber || 0;
        s.friendship = data.friendship || {}; s.friendDay = data.friendDay || {}; s.friendKnown = data.friendKnown || {}; s.friendReward = data.friendReward || {};
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
        s.homeKit = data.homeKit || {};
        // Ancienne sauvegarde (avant les terrains à bâtir) : on garde tout le village déjà là
        // Ancienne sauvegarde sans terrains à bâtir : on ne donne plus tout le village d'un coup,
        // seulement les maisons du début (les autres se construisent comme dans une nouvelle partie)
        s.builtHouses = data.builtHouses || Game.HOUSES.filter(function(h){ return h.start; }).map(function(h){ return h.id; });
        // Maisons présentes dès le début (refuge du Cervin) : aussi dans les anciennes parties
        Game.HOUSES.forEach(function(h) { if (h.start && s.builtHouses.indexOf(h.id) === -1) s.builtHouses.push(h.id); });
        s.builtShops = data.builtShops || Game.SHOPS.filter(function(sh){ return !sh.level; }).map(function(sh){ return sh.id; });
        // Correction unique (demandée par Charlie) : un monde qui a TOUTES les maisons et TOUS les bâtiments
        // vient d'une ancienne sauvegarde ; il repart avec le village du début, à reconstruire.
        if (!data.villageReset1) {
            var allH = Game.HOUSES.every(function(h){ return h.id === 'charlie' || s.builtHouses.indexOf(h.id) > -1; });
            var allS = Game.SHOPS.every(function(sh){ return s.builtShops.indexOf(sh.id) > -1; });
            if (allH) s.builtHouses = Game.HOUSES.filter(function(h){ return h.start; }).map(function(h){ return h.id; });
            if (allS) s.builtShops = Game.SHOPS.filter(function(sh){ return !sh.level; }).map(function(sh){ return sh.id; });
        }
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
    return !!localStorage.getItem(Game.saveKey());
};

Game.deleteSave = function() {
    localStorage.removeItem(Game.saveKey());
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

// ── Mondes : jusqu'à 10 parties séparées, chacune avec son nom (20 caractères max) ──
// Liste des mondes dans localStorage « village_worlds » ; la partie d'un monde dans « charlie_village_save_<id> ».
Game.MAX_WORLDS = 10;
Game.WORLD_NAME_MAX = 20;
Game.worldId = null;
Game.saveKey = function() { return 'charlie_village_save' + (Game.worldId ? '_' + Game.worldId : ''); };
function readWorlds() {
    try { var w = JSON.parse(localStorage.getItem('village_worlds') || '[]'); return Array.isArray(w) ? w : []; } catch (e) { return []; }
}
function writeWorlds(w) { try { localStorage.setItem('village_worlds', JSON.stringify(w)); } catch (e) {} }
Game.worlds = {
    list: function() {
        var w = readWorlds();
        // Ancienne partie (avant les mondes) : elle devient le premier monde
        if (!w.length) {
            try {
                var old = localStorage.getItem('charlie_village_save');
                if (old) {
                    var lvl = 1; try { lvl = JSON.parse(old).level || 1; } catch (e) {}
                    w = [{ id: 'w' + Date.now().toString(36), name: 'Mon monde', created: Date.now(), updated: Date.now(), level: lvl }];
                    localStorage.setItem('charlie_village_save_' + w[0].id, old);
                    localStorage.removeItem('charlie_village_save');
                    writeWorlds(w);
                }
            } catch (e) {}
        }
        return w.sort(function(a, b) { return (b.updated || 0) - (a.updated || 0); });
    },
    cleanName: function(name) {
        name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, Game.WORLD_NAME_MAX);
        return name || 'Mon monde';
    },
    create: function(name) {
        var w = Game.worlds.list();
        if (w.length >= Game.MAX_WORLDS) return null;
        var world = { id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1000), name: Game.worlds.cleanName(name), created: Date.now(), updated: Date.now(), level: 1 };
        w.push(world); writeWorlds(w);
        return world;
    },
    rename: function(id, name) {
        var w = readWorlds();
        w.forEach(function(x) { if (x.id === id) x.name = Game.worlds.cleanName(name); });
        writeWorlds(w);
    },
    remove: function(id) {
        writeWorlds(readWorlds().filter(function(x) { return x.id !== id; }));
        try { localStorage.removeItem('charlie_village_save_' + id); } catch (e) {}
    },
    touch: function(id, level) {
        if (!id) return;
        var w = readWorlds();
        w.forEach(function(x) { if (x.id === id) { x.updated = Date.now(); x.level = level || x.level; } });
        writeWorlds(w);
    },
    get: function(id) { return readWorlds().find(function(x) { return x.id === id; }); }
};

// ── Mise à jour automatique ──
// Toutes les minutes, le jeu regarde si une nouvelle version a été publiée (version.txt).
// Si oui : sur l'accueil il se recharge ; en jeu il sauvegarde, se recharge et revient dans le même monde.
(function() {
    var meta = document.querySelector('meta[name="game-version"]');
    var current = meta && meta.content;
    if (!current) return;   // en local (pas publié) : pas de vérification
    if (/[?&]admin\b/.test(location.search)) return;   // page admin : jamais de rechargement (on perdrait les placements en cours)
    function reloadInto(worldId) {
        try { if (worldId) sessionStorage.setItem('village_resume', worldId); } catch (e) {}
        location.reload();
    }
    function check() {
        fetch('version.txt?t=' + Date.now(), { cache: 'no-store' }).then(function(r) { return r.ok ? r.text() : ''; }).then(function(v) {
            v = (v || '').trim();
            if (!v || v === current) return;
            // Sécurité : on ne recharge qu'une fois pour une même version (jamais en boucle)
            try { if (sessionStorage.getItem('village_reloaded_for') === v) return; sessionStorage.setItem('village_reloaded_for', v); } catch (e) {}
            var s = Game.state;
            if (!s || s.currentView === 'title' || !Game.worldId) { reloadInto(null); return; }
            if (Game.ui && Game.ui.notify) Game.ui.notify('✨ Nouvelle mise à jour ! Le jeu se met à jour dans 5 secondes…', 'levelup');
            setTimeout(function() { if (Game.saveGame) Game.saveGame(); reloadInto(Game.worldId); }, 5000);
            current = v;
        }).catch(function() {});
    }
    setInterval(check, 60000);
    document.addEventListener('visibilitychange', function() { if (!document.hidden) check(); });
})();
// Après une mise à jour automatique : on revient directement dans le monde où on jouait
window.addEventListener('load', function() {
    var id = null;
    try { id = sessionStorage.getItem('village_resume'); sessionStorage.removeItem('village_resume'); } catch (e) {}
    if (id && Game.worlds.get(id) && Game.titlescreen && Game.titlescreen.playWorld) {
        setTimeout(function() {
            Game.titlescreen.playWorld(id, false);
            setTimeout(function() { Game.ui.notify('✨ Le jeu est à jour !', 'info'); }, 1500);
        }, 300);
    }
});

})();
