// ── config.js ── Constantes, recettes, données ──
(function(){
"use strict";

window.Game = window.Game || {};

Game.CONFIG = {
    WORLD_W: 3000,
    WORLD_H: 3000,
    TILE: 60,
    LERP_SPEED: 0.18,
    PLAYER_SPEED: 4,

    // Time
    REAL_MS_PER_GAME_HOUR: 60000,   // 1 min réelle = 1h jeu
    SEASON_DURATION_MS: 7 * 60000,  // 7 min par saison

    // Spawn counts
    TREE_COUNT: 25,
    STONE_COUNT: 18,
    FLOWER_COUNT: 45,
    CREATURE_COUNT: 12,

    // Respawn delays (ms)
    TREE_RESPAWN: 8000,
    STONE_RESPAWN: 20000,
    FLOWER_RESPAWN: 15000,

    // Particle pool
    PARTICLE_POOL_SIZE: 100,

    // Fishing
    FISH_TIME: 2500,
    FISH_TIME_ROD: 1200,

    // Baking
    BAKE_TIME: 3000,

    // Auto-save interval
    SAVE_INTERVAL: 30000,

    // Garden
    GARDEN_COLS: 5,
    GARDEN_ROWS: 5,
    CROP_GROW_TIME: 60000,  // 1 min base

    // XP
    XP_PER_LEVEL: 100,
    MAX_LEVEL: 15,

    // Locations
    LOCATIONS: {
        fountain:     { x: 1000, y: 1000 },
        bakery:       { x: 800,  y: 800  },
        shop:         { x: 1200, y: 800  },
        charlieHouse: { x: 1400, y: 1200 },
        garden:       { x: 1550, y: 1350 },
        riverBaseX:   550
    }
};

Game.HOUSE_STAGES = ["🏗️", "🧱", "🏠", "🏘️", "🏡"];

Game.FLOWER_TYPES = ["🌸", "🌻", "🌷", "🌹", "💐", "🪻"];

Game.SEASONS = ["spring", "summer", "autumn", "winter"];
Game.SEASON_LABELS = { spring: "Printemps 🌱", summer: "Été ☀️", autumn: "Automne 🍂", winter: "Hiver ❄️" };

Game.SEASON_GRASS = {
    spring: "#8cd47e",
    summer: "#7ec870",
    autumn: "#c4a95a",
    winter:  "#e8e8e8"
};

Game.SEASON_TREE = {
    spring: "🌳",
    summer: "🌳",
    autumn: "🍂",
    winter:  "🌲"
};

Game.SEASON_HARVESTED_TREE = {
    spring: "🌲",
    summer: "🌲",
    autumn: "🌲",
    winter:  "🌲"
};

Game.TIME_PHASES = {
    dawn:     { start: 5,  end: 7,  overlay: "rgba(255,180,100,0.15)", label: "Aube 🌅"        },
    day:      { start: 7,  end: 18, overlay: "rgba(0,0,0,0)",          label: "Jour ☀️"         },
    dusk:     { start: 18, end: 20, overlay: "rgba(200,100,50,0.2)",   label: "Crépuscule 🌇"  },
    night:    { start: 20, end: 5,  overlay: "rgba(20,20,80,0.45)",    label: "Nuit 🌙"         }
};

Game.HOUSES = [
    { id: 'lya',  name: 'Lya 🐰',  x: 850,  y: 1200, emoji: '🏘️', furniture: [['🛏️',50,50],['🎨',450,100],['🧶',250,250]] },
    { id: 'melo', name: 'Melo 🐱', x: 1100, y: 1400, emoji: '🏠', furniture: [['🛋️',400,50],['📺',450,50],['🍜',100,300]] },
    { id: 'jo',   name: 'Jo 🐶',   x: 1500, y: 900,  emoji: '🏘️', furniture: [['🎸',50,400],['🍕',300,300],['🏆',50,50]] },
    { id: 'charlie', name: 'Charlie 🤠', x: 1400, y: 1200, emoji: '🏗️', furniture: [] }
];

Game.VILLAGER_DATA = {
    'Lya 🐰':  { emoji: '🐰', home: { x: 850,  y: 1200 }, greetings: ["Salut Charlie !", "Tu as des fleurs ?", "J'adore peindre !"],
                  quests: [
                      { desc: "Rapporte-moi 5 fleurs 🌻", need: { flowers: 5 }, reward: { money: 30, xp: 40 }, done: "Merci ! C'est magnifique !" },
                      { desc: "J'ai besoin de 3 pommes 🍎", need: { apples: 3 }, reward: { money: 20, xp: 30 }, done: "Délicieux !" },
                      { desc: "Peux-tu m'apporter 2 pains ? 🍞", need: { bread: 2 }, reward: { money: 50, xp: 60 }, done: "Miam, merci Charlie !" }
                  ]},
    'Melo 🐱': { emoji: '🐱', home: { x: 1100, y: 1400 }, greetings: ["Miaou !", "Tu as du poisson ?", "Il fait beau !"],
                  quests: [
                      { desc: "Attrape-moi 3 poissons 🐟", need: { fish: 3 }, reward: { money: 40, xp: 50 }, done: "Miam, du poisson !" },
                      { desc: "Il me faut 10 bois 🪵", need: { wood: 10 }, reward: { money: 35, xp: 40 }, done: "Parfait pour mon arbre à chat !" },
                      { desc: "Ramène 5 pierres 🧱", need: { stone: 5 }, reward: { money: 45, xp: 55 }, done: "Merci, c'est lourd !" }
                  ]},
    'Jo 🐶':   { emoji: '🐶', home: { x: 1500, y: 900  }, greetings: ["Woof !", "T'as du bois ?", "C'est grand dehors !"],
                  quests: [
                      { desc: "J'ai besoin de 8 bois 🪵", need: { wood: 8 }, reward: { money: 25, xp: 35 }, done: "Génial, je vais construire !" },
                      { desc: "Trouve-moi 4 pierres 🧱", need: { stone: 4 }, reward: { money: 30, xp: 40 }, done: "Solide comme un roc !" },
                      { desc: "Rapporte 2 poissons et 3 pommes", need: { fish: 2, apples: 3 }, reward: { money: 60, xp: 70 }, done: "Un festin ! Merci !" }
                  ]}
};

Game.RECIPES = {
    chair:  { emoji: '🪑', label: 'Chaise',  wood: 2, stone: 0 },
    table:  { emoji: '🪵', label: 'Table',   wood: 4, stone: 0 },
    bookshelf: { emoji: '📚', label: 'Biblio',  wood: 5, stone: 2 },
    plant:  { emoji: '🪴', label: 'Plante',  wood: 0, stone: 3 }
};

Game.COOKING_RECIPES = {
    applePie:   { emoji: '🥧', label: 'Tarte aux pommes', need: { apples: 3 },            sell: 25, xp: 20, level: 3 },
    sushi:      { emoji: '🍣', label: 'Sushi',            need: { fish: 2 },               sell: 30, xp: 25, level: 3 },
    soup:       { emoji: '🍲', label: 'Soupe',            need: { apples: 1, fish: 1 },    sell: 20, xp: 15, level: 1 },
    bouquet:    { emoji: '💐', label: 'Bouquet',           need: { flowers: 5 },            sell: 40, xp: 30, level: 5 },
    gourmet:    { emoji: '🍱', label: 'Plateau gourmet',  need: { fish: 3, apples: 2, bread: 1 }, sell: 80, xp: 60, level: 7 },
    cake:       { emoji: '🎂', label: 'Gâteau',           need: { apples: 2, bread: 2 },   sell: 50, xp: 40, level: 5 }
};

Game.TOOLS = {
    axe:      { emoji: '🪓', label: 'Hache',          price: 50,  desc: 'Plus de bois par arbre' },
    rod:      { emoji: '🎣', label: 'Canne à pêche',  price: 40,  desc: 'Pêche plus rapide' },
    watering: { emoji: '🚿', label: 'Arrosoir',       price: 30,  desc: 'Arrose le jardin' }
};

Game.CROPS = {
    carrot:     { emoji: '🥕', label: 'Carotte',    growTime: 1.0, sell: 8,  xp: 10, season: ['spring','summer','autumn'] },
    pumpkin:    { emoji: '🎃', label: 'Citrouille', growTime: 2.0, sell: 15, xp: 20, season: ['autumn'] },
    wheat:      { emoji: '🌾', label: 'Blé',        growTime: 1.5, sell: 10, xp: 12, season: ['spring','summer'] },
    strawberry: { emoji: '🍓', label: 'Fraise',     growTime: 1.2, sell: 12, xp: 15, season: ['spring','summer'] }
};

Game.SHOP_ITEMS = [
    { type: 'tool', id: 'axe' },
    { type: 'tool', id: 'rod' },
    { type: 'tool', id: 'watering' },
    { type: 'seed', id: 'carrot',     price: 5  },
    { type: 'seed', id: 'pumpkin',    price: 10 },
    { type: 'seed', id: 'wheat',      price: 5  },
    { type: 'seed', id: 'strawberry', price: 8  },
    { type: 'material', id: 'materials', price: 20 }
];

Game.SOUNDS = {
    collect:  { freq: 880,  dur: 0.1, type: 'sine'     },
    sell:     { freq: 1200, dur: 0.15, type: 'triangle' },
    levelup:  { freq: 660,  dur: 0.3, type: 'square'   },
    step:     { freq: 200,  dur: 0.05, type: 'triangle' },
    craft:    { freq: 440,  dur: 0.12, type: 'sawtooth' },
    error:    { freq: 150,  dur: 0.2, type: 'sawtooth'  },
    fish:     { freq: 600,  dur: 0.2, type: 'sine'      },
    plant:    { freq: 520,  dur: 0.1, type: 'sine'      },
    rain:     { freq: 300,  dur: 2.0, type: 'noise'     },
    bird:     { freq: 1400, dur: 0.3, type: 'sine'      },
    cricket:  { freq: 4000, dur: 0.1, type: 'sine'      }
};

})();
