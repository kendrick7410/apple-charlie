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
        fishShop:     { x: 650,  y: 1100 },
        museum:       { x: 1300, y: 1500 },
        forest:       { x: 1900, y: 450  },
        riverBaseX:   550
    },

    // Fish shop
    FISH_SHOP_SELL_INTERVAL: 30000,
    FISH_SHOP_SELL_PRICE: 15,

    // Wasps
    WASP_LIFESPAN: 20000,

    // Village revenue (ms between payouts = 1 game day)
    VILLAGE_REVENUE_INTERVAL: 60000 * 24
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
    { id: 'celestine', name: 'Célestine 🦊', x: 700, y: 1500, emoji: '🏡', furniture: [['🔮',50,50],['📖',400,100],['🕯️',250,300]] },
    { id: 'charlie', name: 'Charlie 🤠', x: 1400, y: 1200, emoji: '🏗️', furniture: [] }
];

Game.VILLAGER_DATA = {
    'Lya 🐰':  { emoji: '🐰', home: { x: 850,  y: 1200 }, greetings: ["Salut Charlie !", "Tu as des fleurs ?", "J'adore peindre !"],
                  dialogues: [
                      "Tu savais que les fleurs poussent mieux au printemps ? 🌸",
                      "J'ai commencé une peinture du village, elle est presque finie !",
                      "Melo m'a demandé un portrait... il bouge trop ! 😅",
                      "Les couchers de soleil ici sont magnifiques, tu trouves pas ?",
                      "Un jour j'ouvrirai une galerie d'art dans le village ! 🎨",
                      "Jo dit que mes peintures sentent la fleur. C'est un compliment non ?",
                      "J'adore mélanger les couleurs de l'automne sur ma palette. 🍁",
                      "Tu crois qu'un jour on pourrait avoir un musée ici ?",
                      "La lumière du matin est parfaite pour peindre les montagnes au loin.",
                      "Célestine m'a donné des pigments magiques... les couleurs bougent toutes seules ! ✨",
                      "Quand il pleut, je peins la pluie. Quand il neige, je peins la neige. 🎨",
                      "J'ai rêvé que mes tableaux prenaient vie. C'était beau et un peu effrayant !",
                      "Le printemps me donne envie de tout peindre en rose et en vert.",
                      "Jo m'a construit un chevalet en bois. Il est super solide ! 🪵",
                      "Melo dort parfois sur mes toiles fraîches... il a des taches de peinture partout ! 🐱"
                  ],
                  quests: [
                      { desc: "Rapporte-moi 5 fleurs 🌻", need: { flowers: 5 }, reward: { money: 30, xp: 40 }, done: "Merci ! C'est magnifique !" },
                      { desc: "J'ai besoin de 3 pommes 🍎", need: { apples: 3 }, reward: { money: 20, xp: 30 }, done: "Délicieux !" },
                      { desc: "Peux-tu m'apporter 2 pains ? 🍞", need: { bread: 2 }, reward: { money: 50, xp: 60 }, done: "Miam, merci Charlie !" },
                      // ── Vague 2 : débloquée après 3 quêtes + niveau 2 ──
                      { desc: "Crée-moi un bouquet de 8 fleurs 🌸", need: { flowers: 8 }, reward: { money: 55, xp: 50 }, done: "Magnifique bouquet !", unlock: { totalQuests: 3, level: 2 } },
                      { desc: "Apporte 5 pommes et 3 pains 🍎🍞", need: { apples: 5, bread: 3 }, reward: { money: 80, xp: 70 }, done: "Un vrai festin artistique !", unlock: { totalQuests: 3, level: 2 } },
                      // ── Vague 3 : débloquée après 6 quêtes + niveau 4 ──
                      { desc: "Peins avec 12 fleurs et 4 pommes 🎨", need: { flowers: 12, apples: 4 }, reward: { money: 100, xp: 85 }, done: "Mon chef-d'œuvre est terminé !", unlock: { totalQuests: 6, level: 4 } },
                      { desc: "Prépare un banquet : 6 pains et 8 pommes 🍎🍞", need: { bread: 6, apples: 8 }, reward: { money: 120, xp: 95 }, done: "Le plus beau banquet du village !", unlock: { totalQuests: 6, level: 4 } },
                      // ── Vague 4 : débloquée après 10 quêtes + niveau 6 ──
                      { desc: "Exposition : 20 fleurs et 10 pommes 🎨🌸", need: { flowers: 20, apples: 10 }, reward: { money: 150, xp: 110 }, done: "L'exposition est un succès !", unlock: { totalQuests: 10, level: 6 } },
                      { desc: "Fresque géante : 8 pains, 6 pommes, 15 fleurs 🖼️", need: { bread: 8, apples: 6, flowers: 15 }, reward: { money: 180, xp: 130 }, done: "Ma plus belle œuvre !", unlock: { totalQuests: 10, level: 6 } }
                  ]},
    'Melo 🐱': { emoji: '🐱', home: { x: 1100, y: 1400 }, greetings: ["Miaou !", "Tu as du poisson ?", "Il fait beau !"],
                  dialogues: [
                      "Tu sais ce qui est mieux que le poisson ? PLUS de poisson ! 🐟",
                      "J'ai fait une sieste de 3 heures... c'était trop court.",
                      "Célestine dit que les chats voient les esprits. Moi je vois que du poisson.",
                      "Mon arbre à chat sera le plus grand du monde, tu verras !",
                      "La nuit, j'observe les étoiles depuis mon toit. C'est paisible. ✨",
                      "Jo veut qu'on joue à la balle. C'est un truc de chien ça, non ?",
                      "Le bruit de la rivière me donne sommeil... zzz... 💤",
                      "Tu savais que les chats dorment 16 heures par jour ? Je suis en retard !",
                      "L'hiver c'est bien. On peut dormir encore plus longtemps. ❄️",
                      "J'ai essayé de pêcher cette nuit. Le poisson brille sous la lune ! 🌙",
                      "Lya dit que je suis photogénique. Normal, je suis un chat. 😼",
                      "Mon rêve ? Une montagne de poisson et un hamac au soleil.",
                      "Quand il fait chaud, je fais la sieste sous le grand arbre près de la fontaine.",
                      "J'ai appris à Célestine comment ronronner. Elle n'y arrive pas du tout. 😂",
                      "Le poisson grillé c'est bien, mais le poisson cru c'est de l'art. 🐟"
                  ],
                  quests: [
                      { desc: "Attrape-moi 3 poissons 🐟", need: { fish: 3 }, reward: { money: 40, xp: 50 }, done: "Miam, du poisson !" },
                      { desc: "Il me faut 10 bois 🪵", need: { wood: 10 }, reward: { money: 35, xp: 40 }, done: "Parfait pour mon arbre à chat !" },
                      { desc: "Ramène 5 pierres 🧱", need: { stone: 5 }, reward: { money: 45, xp: 55 }, done: "Merci, c'est lourd !" },
                      // ── Vague 2 ──
                      { desc: "Pêche 6 poissons pour ma réserve 🐟", need: { fish: 6 }, reward: { money: 60, xp: 55 }, done: "Ma réserve est pleine !", unlock: { totalQuests: 3, level: 2 } },
                      { desc: "Ramène 8 bois et 4 pierres 🪵🧱", need: { wood: 8, stone: 4 }, reward: { money: 70, xp: 65 }, done: "Mon arbre à chat sera immense !", unlock: { totalQuests: 3, level: 2 } },
                      // ── Vague 3 ──
                      { desc: "Rapporte 10 poissons et 8 pierres 🐟🧱", need: { fish: 10, stone: 8 }, reward: { money: 95, xp: 80 }, done: "Un palace pour chat !", unlock: { totalQuests: 6, level: 4 } },
                      { desc: "Trouve 15 bois et 10 pierres 🪵🧱", need: { wood: 15, stone: 10 }, reward: { money: 115, xp: 90 }, done: "Miaou ! C'est parfait !", unlock: { totalQuests: 6, level: 4 } },
                      // ── Vague 4 ──
                      { desc: "Buffet de luxe : 15 poissons et 10 pommes 🐟🍎", need: { fish: 15, apples: 10 }, reward: { money: 145, xp: 105 }, done: "Le buffet royal du chat !", unlock: { totalQuests: 10, level: 6 } },
                      { desc: "Tour à chat : 25 bois et 15 pierres 🪵🧱", need: { wood: 25, stone: 15 }, reward: { money: 170, xp: 125 }, done: "Miaou ! La plus haute tour !", unlock: { totalQuests: 10, level: 6 } }
                  ]},
    'Jo 🐶':   { emoji: '🐶', home: { x: 1500, y: 900  }, greetings: ["Woof !", "T'as du bois ?", "C'est grand dehors !"],
                  dialogues: [
                      "Un jour je construirai un pont géant pour traverser la rivière ! 🌉",
                      "J'ai enterré un os quelque part... mais où ? 🦴",
                      "Lya m'a peint ! Je suis beau dessus, hein ?",
                      "Tu crois qu'on pourrait construire un phare dans le village ?",
                      "La forêt est pleine de bons arbres pour construire. Allons-y !",
                      "Célestine m'a lu mon avenir. Il y a beaucoup de bâtons dedans. 🪵",
                      "J'ai couru tout autour du village ce matin. Trois fois ! 🏃",
                      "Tu sens cette odeur ? C'est le bois fraîchement coupé. J'adore !",
                      "Mon rêve c'est de construire une tour assez haute pour voir la mer. 🗼",
                      "Melo dit que je cours trop. Moi je dis qu'il dort trop ! 😄",
                      "J'ai trouvé un os ancien près de la rivière. Il porte chance, non ? 🦴",
                      "L'aventure c'est ma passion ! Explorons la forêt ensemble un jour !",
                      "En hiver, la neige rend les constructions plus compliquées mais plus belles. ❄️",
                      "Lya m'a appris à dessiner des plans. Mes maisons seront encore mieux !",
                      "Le sport c'est la vie ! Course, natation, construction... tout compte ! 💪"
                  ],
                  quests: [
                      { desc: "J'ai besoin de 8 bois 🪵", need: { wood: 8 }, reward: { money: 25, xp: 35 }, done: "Génial, je vais construire !" },
                      { desc: "Trouve-moi 4 pierres 🧱", need: { stone: 4 }, reward: { money: 30, xp: 40 }, done: "Solide comme un roc !" },
                      { desc: "Rapporte 2 poissons et 3 pommes", need: { fish: 2, apples: 3 }, reward: { money: 60, xp: 70 }, done: "Un festin ! Merci !" },
                      // ── Vague 2 ──
                      { desc: "Il me faut 15 bois pour un grand projet 🪵", need: { wood: 15 }, reward: { money: 65, xp: 60 }, done: "Je vais construire un palais !", unlock: { totalQuests: 3, level: 2 } },
                      { desc: "Rapporte 5 poissons et 6 pierres 🐟🧱", need: { fish: 5, stone: 6 }, reward: { money: 85, xp: 75 }, done: "Merci Charlie, t'es le meilleur !", unlock: { totalQuests: 3, level: 2 } },
                      // ── Vague 3 ──
                      { desc: "Construis avec 20 bois et 12 pierres 🪵🧱", need: { wood: 20, stone: 12 }, reward: { money: 110, xp: 90 }, done: "Mon palais prend forme !", unlock: { totalQuests: 6, level: 4 } },
                      { desc: "Festin royal : 8 poissons et 6 pommes 🐟🍎", need: { fish: 8, apples: 6 }, reward: { money: 105, xp: 85 }, done: "Woof ! Le meilleur repas !", unlock: { totalQuests: 6, level: 4 } },
                      // ── Vague 4 ──
                      { desc: "Château : 30 bois et 20 pierres 🏰", need: { wood: 30, stone: 20 }, reward: { money: 160, xp: 120 }, done: "Mon château est magnifique !", unlock: { totalQuests: 10, level: 6 } },
                      { desc: "Grande fête : 12 poissons, 8 pommes, 5 pains 🎉", need: { fish: 12, apples: 8, bread: 5 }, reward: { money: 175, xp: 130 }, done: "Woof ! Quelle fête incroyable !", unlock: { totalQuests: 10, level: 6 } }
                  ]},
    'Célestine 🦊': { emoji: '🦊', home: { x: 700, y: 1500 }, greetings: ["Bonjour voyageur !", "Les étoiles parlent...", "Tu sens cette magie ?"],
                  dialogues: [
                      "La rivière murmure des secrets à qui sait écouter... 🌊",
                      "J'ai vu une étoile filante hier. J'ai fait un vœu pour le village. ✨",
                      "Mes potions demandent des ingrédients rares. La nature est généreuse.",
                      "Melo pense que je suis mystérieuse. C'est parce qu'il ne lit pas ! 📖",
                      "Chaque saison a sa propre magie. L'automne est ma préférée. 🍂",
                      "Le village grandit grâce à toi, Charlie. Les esprits sont contents. 🦊",
                      "Les étoiles m'ont dit que quelque chose de beau arrivera bientôt... 🌟",
                      "Ma dernière potion a transformé une pierre en cristal. Enfin presque.",
                      "Les esprits de la forêt dansent quand personne ne regarde. Je les ai vus ! 👻",
                      "Au printemps, la magie est partout. On la sent dans le vent. 🌸",
                      "Jo m'a demandé un sort pour courir plus vite. La magie ne marche pas comme ça ! 😅",
                      "La pleine lune est idéale pour préparer mes potions les plus puissantes. 🌕",
                      "Chaque fleur du village contient une petite étincelle de magie.",
                      "La sagesse vient avec le temps. Et avec beaucoup de thé. ☕",
                      "Lya peint la magie sans le savoir. Ses tableaux brillent la nuit. 🎨"
                  ],
                  quests: [
                      // ── Vague 1 : disponible dès le début ──
                      { desc: "Apporte-moi 4 fleurs magiques 🌸", need: { flowers: 4 }, reward: { money: 35, xp: 45 }, done: "Je sens leur énergie !" },
                      { desc: "Il me faut 5 pierres mystiques 🧱", need: { stone: 5 }, reward: { money: 40, xp: 45 }, done: "Parfait pour mes potions !" },
                      { desc: "Rapporte 3 poissons lunaires 🐟", need: { fish: 3 }, reward: { money: 45, xp: 50 }, done: "Les esprits te remercient !" },
                      // ── Vague 2 ──
                      { desc: "Collecte 10 fleurs pour un rituel 🌻", need: { flowers: 10 }, reward: { money: 65, xp: 60 }, done: "Le rituel est complet !", unlock: { totalQuests: 3, level: 2 } },
                      { desc: "Apporte 6 pommes et 4 pains enchantés 🍎🍞", need: { apples: 6, bread: 4 }, reward: { money: 75, xp: 65 }, done: "La magie opère !", unlock: { totalQuests: 3, level: 2 } },
                      // ── Vague 3 ──
                      { desc: "Rassemble 15 fleurs et 8 poissons 🌸🐟", need: { flowers: 15, fish: 8 }, reward: { money: 120, xp: 95 }, done: "Le grand sortilège est prêt !", unlock: { totalQuests: 6, level: 4 } },
                      { desc: "Réunis 10 pierres, 10 bois et 5 pommes ✨", need: { stone: 10, wood: 10, apples: 5 }, reward: { money: 130, xp: 100 }, done: "Tu es un vrai mage, Charlie !", unlock: { totalQuests: 6, level: 4 } },
                      // ── Vague 4 ──
                      { desc: "Invocation : 20 fleurs, 12 poissons, 10 pierres 🔮", need: { flowers: 20, fish: 12, stone: 10 }, reward: { money: 165, xp: 120 }, done: "Les esprits s'éveillent !", unlock: { totalQuests: 10, level: 6 } },
                      { desc: "Artefact ancien : 15 bois, 15 pierres, 8 pains ✨", need: { wood: 15, stone: 15, bread: 8 }, reward: { money: 185, xp: 135 }, done: "L'artefact brille ! Merci Charlie !", unlock: { totalQuests: 10, level: 6 } }
                  ]},
    'Ordralfabétix 🐡': { emoji: '🐡', home: { x: 650, y: 1100 }, greetings: ["Mes poissons sont les plus frais !", "Goûte-moi ça !", "Le poisson du jour ! 🐟"],
                  dialogues: [
                      "Mes poissons sont pêchés du jour ! Pas comme ceux d'à côté ! 🐟",
                      "Tu veux du poisson ? J'ai tout ce qu'il faut !",
                      "Les villageois adorent mon poisson. Normal, il est FRAIS !",
                      "Melo est mon meilleur client. Ce chat a du goût ! 🐱",
                      "Dépose tes poissons ici, je m'occupe de tout vendre !",
                      "Le secret d'un bon poisson ? La fraîcheur, par Toutatis ! ⚡",
                      "Jo m'a commandé du poisson grillé. Mais moi je vends du CRU !",
                      "Lya a peint ma boutique. Depuis, les clients affluent ! 🎨",
                      "Célestine dit que mes poissons ont une aura magique. Je dis juste qu'ils sont frais.",
                      "15 clochettes le poisson, c'est donné ! Ailleurs c'est 10 à la fontaine...",
                      "Un jour j'ouvrirai une deuxième boutique de l'autre côté de la rivière !",
                      "La pluie c'est bon pour la pêche, mais mauvais pour l'étalage... 🌧️",
                      "En hiver les poissons se cachent, mais ma boutique reste ouverte !",
                      "Mon rêve ? Que tout le village sente bon le poisson frais ! 🐟",
                      "Apporte-moi du poisson et je te ferai gagner des clochettes !"
                  ],
                  quests: [
                      { desc: "Apporte 5 poissons pour mon étal 🐟", need: { fish: 5 }, reward: { money: 50, xp: 40 }, done: "Super ! L'étal est plein !" },
                      { desc: "Il me faut 3 pains pour mes sandwiches 🍞", need: { bread: 3 }, reward: { money: 40, xp: 35 }, done: "Sandwich poisson-pain, un délice !" },
                      { desc: "Ramène 8 poissons, grosse commande ! 🐟", need: { fish: 8 }, reward: { money: 70, xp: 55 }, done: "Commande livrée, merci !" },
                      // ── Vague 2 ──
                      { desc: "12 poissons pour le banquet du village 🐟", need: { fish: 12 }, reward: { money: 100, xp: 75 }, done: "Le banquet sera mémorable !", unlock: { totalQuests: 3, level: 2 } },
                      { desc: "Apporte 5 pommes et 6 poissons 🍎🐟", need: { apples: 5, fish: 6 }, reward: { money: 90, xp: 70 }, done: "Poisson aux pommes, original !", unlock: { totalQuests: 3, level: 2 } },
                      // ── Vague 3 ──
                      { desc: "Grande pêche : 18 poissons 🐟🐟", need: { fish: 18 }, reward: { money: 140, xp: 100 }, done: "Ma boutique déborde !", unlock: { totalQuests: 6, level: 4 } },
                      { desc: "Festin marin : 10 poissons et 5 pains 🐟🍞", need: { fish: 10, bread: 5 }, reward: { money: 130, xp: 95 }, done: "Un festin digne de Toutatis !", unlock: { totalQuests: 6, level: 4 } },
                      // ── Vague 4 ──
                      { desc: "Réserve royale : 25 poissons 🐟👑", need: { fish: 25 }, reward: { money: 180, xp: 130 }, done: "La plus grande réserve du village !", unlock: { totalQuests: 10, level: 6 } },
                      { desc: "Buffet océan : 15 poissons, 8 pains, 5 pommes 🌊", need: { fish: 15, bread: 8, apples: 5 }, reward: { money: 200, xp: 140 }, done: "Par Toutatis, quel buffet !", unlock: { totalQuests: 10, level: 6 } }
                  ]}
};

Game.RECIPES = {
    chair:  { emoji: '🪑', label: 'Chaise',  wood: 2, stone: 0 },
    table:  { emoji: '🪵', label: 'Table',   wood: 4, stone: 0 },
    bookshelf: { emoji: '📚', label: 'Biblio',  wood: 5, stone: 2 },
    plant:  { emoji: '🪴', label: 'Plante',  wood: 0, stone: 3 },
    bed:    { emoji: '🛏️', label: 'Lit',     wood: 6, stone: 0 },
    lamp:   { emoji: '💡', label: 'Lampe',   wood: 1, stone: 2 },
    rug:    { emoji: '🟫', label: 'Tapis',   wood: 3, stone: 0 },
    mirror: { emoji: '🪞', label: 'Miroir',  wood: 2, stone: 3 }
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
    watering: { emoji: '🚿', label: 'Arrosoir',       price: 30,  desc: 'Arrose le jardin' },
    shovel:   { emoji: '⛏️', label: 'Pelle',           price: 35,  desc: 'Creuse et trace des chemins' },
    net:      { emoji: '🥅', label: 'Filet',           price: 45,  desc: 'Capture les papillons' }
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
    { type: 'material', id: 'materials', price: 20 },
    { type: 'tool', id: 'shovel' },
    { type: 'tool', id: 'net' }
];

// ── Species data (fish & butterflies) ──
Game.FISH_SPECIES = {
    carp:     { name: 'Carpe',           emoji: '🐟', rarity: 'common',    value: 10, weight: 45 },
    trout:    { name: 'Truite',          emoji: '🐟', rarity: 'common',    value: 12, weight: 35 },
    clown:    { name: 'Poisson-clown',   emoji: '🐠', rarity: 'uncommon',  value: 20, weight: 25 },
    puffer:   { name: 'Poisson-globe',   emoji: '🐡', rarity: 'uncommon',  value: 25, weight: 20 },
    sword:    { name: 'Espadon',         emoji: '🐟', rarity: 'rare',      value: 45, weight: 10 },
    shark:    { name: 'Requin-nain',     emoji: '🦈', rarity: 'legendary', value: 80, weight: 3 }
};

Game.BUTTERFLY_SPECIES = {
    common:   { name: 'Papillon commun', emoji: '🦋', rarity: 'common',    value: 5,  weight: 40, season: ['spring','summer','autumn'] },
    azure:    { name: 'Azuré',           emoji: '🦋', rarity: 'common',    value: 8,  weight: 30, season: ['spring','summer'], color: '#4fc3f7' },
    monarch:  { name: 'Monarque',        emoji: '🦋', rarity: 'uncommon',  value: 18, weight: 20, season: ['summer','autumn'], color: '#ff8c00' },
    morpho:   { name: 'Morpho bleu',     emoji: '🦋', rarity: 'rare',      value: 35, weight: 12, season: ['spring','summer'], color: '#2196f3' },
    emperor:  { name: 'Empereur',        emoji: '🦋', rarity: 'rare',      value: 50, weight: 8,  season: ['spring'], color: '#7c4dff' },
    ghost:    { name: 'Fantôme',         emoji: '🦋', rarity: 'legendary', value: 100,weight: 3,  season: ['autumn'], color: '#e0e0e0' },
    lunar:    { name: 'Papillon lunaire',emoji: '🦋', rarity: 'legendary', value: 120,weight: 2,  season: ['spring','summer'], color: '#ce93d8', night: true }
};

Game.RARITY_COLORS = {
    common: '#8bc34a', uncommon: '#29b6f6', rare: '#ab47bc', legendary: '#ffd600'
};

Game.VILLAGER_JOBS = {
    'Lya 🐰':           { job: 'Artiste',       income: 5 },
    'Melo 🐱':          { job: 'Pêcheur',       income: 8 },
    'Jo 🐶':            { job: 'Constructeur',   income: 7 },
    'Célestine 🦊':     { job: 'Alchimiste',    income: 10 },
    'Ordralfabétix 🐡': { job: 'Poissonnier',   income: 12 }
};

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
