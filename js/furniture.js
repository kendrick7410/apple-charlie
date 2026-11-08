// ── furniture.js ── Meubles vivants dans les maisons : on les voit servir ──
// Chaque meuble est stocké dans Game.state.houseFurniture[houseId] sous la forme
// [emoji, x, y, dernierUsage, allume] (les 2 derniers sont optionnels).
// Cliquer un meuble : Charlie marche jusqu'à lui et l'utilise. Le glisser : le déplacer.
(function(){
"use strict";

Game.furniture = {};

var USE_RADIUS = 110;          // distance pour pouvoir utiliser un meuble
var DAY_MS = 12 * 60 * 1000;   // 1 jour de jeu = 12 minutes réelles (2h de jeu par minute)
var DRAG_THRESHOLD = 6;        // en dessous, c'est un clic ; au-dessus, on déplace
var BREAD_APPLES = 2;          // un pain cuit à la cuisinière coûte 2 pommes
var SLEEP_FROM = 17;           // comme dans Minecraft : on peut dormir dès le soir (17h → 6h)

var BOOK_FACTS = [
    "Les loutres se tiennent la main en dormant pour ne pas dériver. 🦦",
    "Le Cervin mesure 4478 mètres de haut ! 🏔️",
    "Une pieuvre a trois cœurs et du sang bleu. 🐙",
    "Les abeilles dansent pour dire aux autres où sont les fleurs. 🐝",
    "Les escargots peuvent dormir pendant trois ans. 🐌",
    "Le miel ne se périme jamais, même après des milliers d'années. 🍯",
    "Les chats passent environ 70 % de leur vie à dormir. 🐱",
    "Un éclair est cinq fois plus chaud que la surface du Soleil. ⚡",
    "Les flamants roses sont roses à cause de ce qu'ils mangent. 🦩",
    "Les dauphins se donnent des noms en sifflant. 🐬",
    "Un colibri bat des ailes jusqu'à 80 fois par seconde. 🐦",
    "La Lune s'éloigne de la Terre de 4 cm chaque année. 🌙",
    "Les vaches ont des meilleures amies et stressent quand on les sépare. 🐄",
    "Les étoiles de mer n'ont pas de cerveau. ⭐",
    "Un nuage peut peser plus de 500 tonnes. ☁️",
    "Les koalas dorment jusqu'à 22 heures par jour. 🐨",
    "Les fourmis ne dorment jamais vraiment, elles font de mini-siestes. 🐜",
    "Un bébé girafe mesure déjà presque 2 mètres à la naissance. 🦒",
    "Il y a plus d'arbres sur Terre que d'étoiles dans notre galaxie. 🌳",
    "Les pingouins offrent un caillou à celle qu'ils aiment. 🐧"
];

var TV_SHOWS = [
    ['🐸', "Les aventures de Grenouille"], ['🚀', "Voyage dans l'espace"], ['⚽', "Le grand match"],
    ['🌋', "Les volcans du monde"], ['🐧', "La vie des pingouins"], ['🏴‍☠️', "Les pirates"],
    ['🦖', "Le temps des dinosaures"], ['🌈', "La météo arc-en-ciel"]
];

// Notes du piano : Do Ré Mi Fa Sol La Si Do
var NOTES = [['Do', 261.6], ['Ré', 293.7], ['Mi', 329.6], ['Fa', 349.2], ['Sol', 392.0], ['La', 440.0], ['Si', 493.9], ['Do', 523.3]];
var SONG = [0, 0, 0, 1, 2, 1, 0, 2, 1, 1, 0];   // Au clair de la lune

// Le type de meuble (clé de Game.RECIPES) à partir de son emoji
Game.furniture.typeOf = function(emoji) {
    for (var id in Game.RECIPES) { if (Game.RECIPES[id].emoji === emoji) return id; }
    return null;
};

// Petite explication de chaque meuble (bulle au survol + message à la fabrication)
var HELP = {
    table:     "Mange à table : +50 % de faim, et le double avec une chaise 🪑 collée !",
    chair:     "Assieds-toi ! Collée à une table 🪵, tes repas comptent double.",
    bookshelf: "Lis un livre 📖 (+25 XP par jour). La nuit, il faut de la lumière 💡.",
    plant:     "Cueille 2 fleurs 🌻 chaque jour.",
    bed:       "Dors la nuit (dès 17h) pour passer directement au matin ☀️.",
    lamp:      "Sans lampe allumée, la maison est sombre (et très noire la nuit).",
    mirror:    "Change de tenue 🎭.",
    stove:     "Cuis du pain 🍞 et des plats.",
    tv:        "Allume la télé et regarde une émission (+10 XP par jour).",
    piano:     "Joue de la musique 🎵 (+10 XP par jour).",
    bath:      "Prends un bain 🛁 (+15 XP par jour).",
    armchair:  "Installe-toi dans le fauteuil 🛋️ : avec la télé allumée, c'est encore mieux !",
    fridge:    "Prends un goûter dans le frigo 🧊 (+30 de faim).",
    counter:   "L'évier du coin cuisine : fais la vaisselle 🧽 (+5 XP par jour)."
};

Game.furniture.help = function(type) { return HELP[type]; };

function room() { return document.getElementById('current-room'); }
function charlieEl() { return document.getElementById('interior-charlie'); }
// Échelle d'affichage de la pièce (réduite sur téléphone)
function scale() { var r = room(); return r.offsetWidth ? r.getBoundingClientRect().width / r.offsetWidth : 1; }
// Un meuble de villageois lui appartient : on peut l'utiliser et le déplacer, pas le ranger
function isMine() { var h = Game.state.activeHouse; return !!h && h.id === 'charlie'; }
function list() {
    var s = Game.state;
    return s.activeHouse ? (s.houseFurniture[s.activeHouse.id] || []) : [];
}
function now() { return Game.state.totalTimePlayed || 0; }
function readyAgain(f) { return !f[3] || now() - f[3] >= DAY_MS; }
function minutesLeft(f) { return Math.max(1, Math.ceil((DAY_MS - (now() - f[3])) / 60000)); }
function dist(f) {
    var ic = Game.state.interiorCharlie;
    return Math.hypot(ic.x - f[1], ic.y - f[2]);
}
function elOf(f) {
    var els = room().querySelectorAll('.furniture');
    for (var i = 0; i < els.length; i++) if (els[i]._f === f) return els[i];
    return null;
}
// ── Taille au sol de chaque meuble (demi-largeur, demi-profondeur en px, comme le modèle 3D) ──
// Sert à empêcher les meubles d'entrer dans les murs, et à poser les nouveaux sans chevauchement.
var FOOT = {
    bed: [43, 63], table: [43, 43], chair: [17, 17], bookshelf: [40, 14], lamp: [14, 14], plant: [17, 17],
    mirror: [26, 8], stove: [31, 22], tv: [37, 14], piano: [49, 20], bath: [54, 30],
    armchair: [36, 30], fridge: [27, 24], counter: [48, 22]
};
function roomSize() { var r = room(); return { w: (r && r.clientWidth) || 570, h: (r && r.clientHeight) || 570 }; }
Game.furniture.footprint = function(f) {
    var d = FOOT[Game.furniture.typeOf(f[0])] || [22, 22];
    return (f[5] || 0) % 2 ? { hw: d[1], hd: d[0] } : { hw: d[0], hd: d[1] };
};
// Position (coin haut-gauche d'un emoji de 48 px) ramenée à l'intérieur des murs
Game.furniture.clampPos = function(f, x, y) {
    var R = roomSize(), fp = Game.furniture.footprint(f);
    var cx = Math.max(fp.hw, Math.min(R.w - fp.hw, x + 24));
    var cy = Math.max(fp.hd, Math.min(R.h - fp.hd, y + 24));
    return { x: Math.round(cx - 24), y: Math.round(cy - 24) };
};
function clampF(f) { var p = Game.furniture.clampPos(f, f[1], f[2]); f[1] = p.x; f[2] = p.y; }
// Deux meubles se touchent-ils ? (le tapis de sortie compte comme un meuble)
function overlaps(a, ax, ay, b) {
    var fa = Game.furniture.footprint(a), fb = Game.furniture.footprint(b);
    return Math.abs(ax - b[1]) < fa.hw + fb.hw + 6 && Math.abs(ay - b[2]) < fa.hd + fb.hd + 6;
}
function onExitMat(f, x, y) {
    var fp = Game.furniture.footprint(f), cx = x + 24, cy = y + 24, R = roomSize();
    return cy + fp.hd > R.h - 110 && cx + fp.hw > 230 && cx - fp.hw < 400;
}
// Pose un meuble au plus près de (x, y) sans toucher les autres, ni les murs, ni le tapis de sortie
function placeFree(arr, f) {
    clampF(f);
    var x0 = f[1], y0 = f[2], R = roomSize(), best = null, bd = Infinity;
    for (var y = -40; y <= R.h; y += 20) for (var x = -40; x <= R.w; x += 20) {
        var p = Game.furniture.clampPos(f, x, y);
        var d = Math.hypot(p.x - x0, p.y - y0);
        if (d >= bd || onExitMat(f, p.x, p.y)) continue;
        if (arr.some(function(o) { return o !== f && overlaps(f, p.x, p.y, o); })) continue;
        bd = d; best = p;
    }
    if (best) { f[1] = best.x; f[2] = best.y; }
}
Game.furniture.placeFree = placeFree;

// Chaque maison a un petit coin cuisine (frigo, évier, cuisinière) et un coin télé (télé + fauteuil).
// Ajoutés une seule fois par maison (Game.state.homeKit), y compris dans les anciennes sauvegardes.
var HOME_KIT = [
    ['fridge', 16, 16, 0], ['counter', 96, 4, 0], ['stove', 178, 8, 0],
    ['tv', 410, 0, 0], ['armchair', 410, 170, 2]
];
Game.furniture.ensureHome = function(house) {
    var s = Game.state;
    s.homeKit = s.homeKit || {};
    var arr = s.houseFurniture[house.id] || (s.houseFurniture[house.id] = []);
    if (!s.homeKit[house.id]) {
        s.homeKit[house.id] = true;
        var kit = HOME_KIT.slice();
        if (house.id !== 'charlie') kit.push(['bed', 40, 260, 0]);   // le lit du villageois devient un vrai meuble
        // 1) Le coin cuisine et le coin télé prennent leur place prévue
        var added = [];
        kit.forEach(function(k) {
            var same = arr.find(function(o) { return Game.furniture.typeOf(o[0]) === k[0]; });
            if (same) {
                // Meuble déjà là chez un villageois (ex. son lit) : on le range à sa place dans la nouvelle maison
                if (house.id !== 'charlie') { same[1] = k[1]; same[2] = k[2]; same[5] = k[3]; added.push(same); }
                return;
            }
            var f = [Game.RECIPES[k[0]].emoji, k[1], k[2], 0, 0, k[3]];
            placeFree(added, f);
            added.push(f);
        });
        // 2) Les autres objets qui gênent sont poussés à la place libre la plus proche
        var others = arr.filter(function(o) { return added.indexOf(o) === -1; });
        added.forEach(function(f) { if (arr.indexOf(f) === -1) arr.push(f); });
        others.forEach(function(o) {
            clampF(o);
            if (onExitMat(o, o[1], o[2]) || arr.some(function(x) { return x !== o && overlaps(o, o[1], o[2], x); })) placeFree(arr, o);
        });
    }
    arr.forEach(clampF);   // anciens meubles qui dépassaient dans un mur
};

function canSleepNow() { var h = Game.state.gameHour; return h >= SLEEP_FROM || h < 6; }

// ── Ce que fait Charlie en ce moment (lire, dormir, bain, piano) : il ne bouge pas ──
var busy = null;
Game.furniture.isBusy = function() { return !!busy; };

// Pose de Charlie (assis, couché, dans le bain...) et objet au-dessus de lui (📖, 🎵, 💤)
function setPose(pose) {
    var ic = charlieEl();
    if (!ic) return;
    ic.classList.remove('pose-sit', 'pose-sleep', 'pose-bath');
    if (pose) ic.classList.add('pose-' + pose);
}
function setFx(emoji, cls) {
    var fx = document.getElementById('charlie-fx');
    if (!fx) {
        fx = document.createElement('div');
        fx.id = 'charlie-fx';
        room().appendChild(fx);
    }
    fx.textContent = emoji || '';
    fx.className = cls || '';
    fx.style.display = emoji ? 'block' : 'none';
    placeFx();
}
function placeFx() {
    var fx = document.getElementById('charlie-fx');
    if (!fx) return;
    var ic = Game.state.interiorCharlie;
    fx.style.left = (ic.x + 26) + 'px';
    fx.style.top = (ic.y - 34) + 'px';
}
// Place Charlie sur / à côté d'un meuble
function moveCharlieTo(x, y) {
    var s = Game.state;
    s.interiorCharlie.x = x;
    s.interiorCharlie.y = y;
    s.interiorTarget = null;
    var ic = charlieEl();
    if (ic) { ic.style.left = x + 'px'; ic.style.top = y + 'px'; }
    placeFx();
}

// Réduit la pièce pour qu'elle tienne dans l'écran (téléphone), barre du bas comprise
var _fitKey = '';
Game.furniture.fitRoom = function(force) {
    var r = room();
    if (!r) return;
    var inShop = document.body.classList.contains('in-shop');
    var key = window.innerWidth + 'x' + window.innerHeight + (inShop ? 's' : 'h');
    if (key === _fitKey && !force) return;
    _fitKey = key;
    var W = window.innerWidth, H = window.innerHeight;
    var phone = W <= 768;
    var full = r.offsetWidth || 630;
    // Téléphone : la pièce se colle en haut ; en boutique, le panneau d'achat prend le bas de l'écran
    var availH = phone ? (inShop ? H * 0.36 : H - 180) : H - 170;
    var k = Math.min(1, (W - 16) / full, availH / full);
    r.style.transform = k < 1 ? 'scale(' + k.toFixed(3) + ')' : '';
    r.style.transformOrigin = phone ? 'center top' : 'center 40%';
    var view = document.getElementById('interior-view');
    if (view) view.classList.toggle('fit-top', phone);
};
window.addEventListener('resize', function() { _fitKey = ''; Game.furniture.fitRoom(); });

// Toucher / cliquer le sol d'une pièce : Charlie marche jusque-là (indispensable sur téléphone)
document.addEventListener('pointerdown', function(e) {
    var r = room();
    if (!r || Game.state.currentView !== 'interior' || busy) return;
    if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45) return;   // pouce gauche = joystick
    if (e.target !== r && e.target.id !== 'room-light' && !e.target.classList.contains('exit-mat')) return;
    var rect = r.getBoundingClientRect(), k = scale();
    Game.state.interiorTarget = {
        x: Math.max(20, Math.min(522, (e.clientX - rect.left) / k - 24)),
        y: Math.max(20, Math.min(540, (e.clientY - rect.top) / k - 24))
    };
    pending = null;
    Game.furniture.closeMenu();
});

// Pour la vue 3D (render3d.js) : marcher vers un point de la pièce, retrouver l'élément d'un meuble
Game.furniture.floorClick = function(x, y) {
    if (busy) return;
    Game.state.interiorTarget = { x: Math.max(20, Math.min(522, x)), y: Math.max(20, Math.min(540, y)) };
    pending = null;
    Game.furniture.closeMenu();
};
Game.furniture.elFor = function(f) { return elOf(f); };
Game.furniture.list = function() { return list(); };

// Affiche tous les meubles de la maison active (remplace les anciens)
Game.furniture.render = function() {
    var r = room();
    if (!r) return;
    Game.furniture.closeMenu();
    Game.furniture.fitRoom();
    var old = r.querySelectorAll('.furniture');
    for (var i = 0; i < old.length; i++) old[i].remove();
    list().forEach(function(f) {
        var type = Game.furniture.typeOf(f[0]);
        var div = document.createElement('div');
        div.className = 'furniture';
        div.textContent = f[0];
        clampF(f);
        div.style.left = f[1] + 'px';
        div.style.top = f[2] + 'px';
        div.title = type ? Game.RECIPES[type].label + ' : ' + HELP[type] : 'Décoration';
        if ((type === 'lamp' || type === 'tv') && f[4]) div.classList.add(type + '-on');
        div._f = f;
        attachPointer(div, f);
        r.appendChild(div);
        if (type === 'tv' && f[4]) showTvScreen(div, true);
        // La nuit, le villageois dort dans son lit (où qu'on l'ait déplacé)
        if (type === 'bed' && !isMine() && !r.querySelector('.house-sleeper') && Game.time.isNight()) {
            var v = Game.VILLAGER_DATA[Game.state.activeHouse.name];
            if (v) {
                var sl = document.createElement('span');
                sl.className = 'house-sleeper';
                sl.innerHTML = '<span class="sleeper-emoji">' + v.emoji + '</span><span class="zzz">💤</span>';
                div.appendChild(sl);
            }
        }
    });
    Game.furniture.updateLight();
};

// Glisser pour déplacer, cliquer pour utiliser (souris ET doigt)
function attachPointer(el, f) {
    var start = null, dragging = false, offX = 0, offY = 0;
    el.addEventListener('pointerdown', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (busy) return;
        var rect = room().getBoundingClientRect(), k = scale();
        start = { x: e.clientX, y: e.clientY };
        offX = (e.clientX - rect.left) / k - f[1];
        offY = (e.clientY - rect.top) / k - f[2];
        dragging = false;
        if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    el.addEventListener('pointermove', function(e) {
        if (!start) return;
        if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return;
        if (!dragging) { dragging = true; el.classList.add('dragging'); Game.furniture.closeMenu(); }
        var r = room(), rect = r.getBoundingClientRect(), k = scale();
        var nx = Math.round(((e.clientX - rect.left) / k - offX) / 20) * 20;
        var ny = Math.round(((e.clientY - rect.top) / k - offY) / 20) * 20;
        var cp = Game.furniture.clampPos(f, nx, ny);   // jamais dans les murs
        nx = cp.x; ny = cp.y;
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
        f[1] = nx; f[2] = ny;   // sauvegardé avec la maison
        var t = Game.furniture.typeOf(f[0]);
        if ((t === 'lamp' || t === 'tv') && f[4]) Game.furniture.updateLight();   // la lumière suit
    });
    el.addEventListener('pointerup', function() {
        if (!start) return;
        start = null;
        if (dragging) {
            dragging = false;
            el.classList.remove('dragging');
            Game.audio.play('craft');
        } else {
            Game.furniture.interact(f, el);
        }
    });
    el.addEventListener('pointercancel', function() { start = null; dragging = false; el.classList.remove('dragging'); });
}

// ── Cliquer un meuble : ranger (mode rangement), l'utiliser, ou marcher jusqu'à lui ──
var pending = null;   // meuble à utiliser dès que Charlie arrive
var storeMode = false;

Game.furniture.interact = function(f, el) {
    if (busy) return;
    var type = Game.furniture.typeOf(f[0]);
    if (storeMode && isMine()) { Game.furniture.store(f); return; }
    if (rotateMode) { Game.furniture.rotate(f); return; }
    if (!type) {
        Game.ui.notify(f[0] + " C'est une décoration : fais-la glisser pour la déplacer !");
        return;
    }
    if (dist(f) <= USE_RADIUS) {
        Game.furniture.use(f, el);
    } else {
        // Charlie marche jusqu'au meuble, puis l'utilise
        Game.state.interiorTarget = { x: Math.max(20, Math.min(522, f[1])), y: Math.max(20, Math.min(540, f[2] + 55)) };
        pending = f;
    }
};

Game.furniture.use = function(f, el) {
    var type = Game.furniture.typeOf(f[0]);
    if (!type || busy) return;
    Game.furniture.closeMenu();
    var fn = USES[type];
    if (fn) fn(f, el || elOf(f));
    Game.ui.update();
};

// Mode rangement (bouton 📦 de la barre) : cliquer un meuble le range et rend ses matériaux
Game.furniture.toggleStoreMode = function(force) {
    storeMode = force === undefined ? !storeMode : !!force;
    if (storeMode && rotateMode) Game.furniture.toggleRotateMode(false);
    document.body.classList.toggle('store-mode', storeMode);
    var btn = document.getElementById('store-mode-btn');
    if (btn) btn.textContent = storeMode ? '✅ Fini de ranger' : '📦 Ranger un meuble';
    if (storeMode) Game.ui.notify("📦 Clique sur un meuble pour le ranger (tu récupères le bois et la pierre)");
};

// Tourner un meuble d'un quart de tour (f[5] = nombre de quarts de tour, sauvegardé avec la maison)
var rotateMode = false;
Game.furniture.rotate = function(f) {
    f[5] = ((f[5] || 0) + 1) % 4;
    clampF(f);   // en tournant, un meuble long ne doit pas rentrer dans le mur
    var el = elOf(f);
    if (el) { el.style.left = f[1] + 'px'; el.style.top = f[2] + 'px'; }
    Game.audio.play('craft');
};
Game.furniture.toggleRotateMode = function(force) {
    rotateMode = force === undefined ? !rotateMode : !!force;
    if (rotateMode && storeMode) Game.furniture.toggleStoreMode(false);
    document.body.classList.toggle('rotate-mode', rotateMode);
    var btn = document.getElementById('rotate-mode-btn');
    if (btn) btn.textContent = rotateMode ? '✅ Fini de tourner' : '🔄 Tourner un meuble';
    if (rotateMode) Game.ui.notify("🔄 Clique sur un meuble pour le faire tourner (astuce : clic droit marche aussi)");
};

// Ranger un meuble : on récupère tout le bois et la pierre
Game.furniture.store = function(f) {
    var s = Game.state;
    var type = Game.furniture.typeOf(f[0]);
    var arr = list();
    var i = arr.indexOf(f);
    if (i === -1 || !type || !isMine()) return;
    arr.splice(i, 1);
    var rcp = Game.RECIPES[type];
    s.inventory.wood += rcp.wood;
    s.inventory.stone += rcp.stone;
    Game.furniture.render();
    Game.ui.update();
    Game.ui.notify(f[0] + " rangé : +" + rcp.wood + " bois 🪵, +" + rcp.stone + " pierre 🪨");
};

// Quand on quitte la maison : tout s'arrête proprement
Game.furniture.reset = function() {
    busy = null;
    pending = null;
    Game.furniture.closeMenu();
    closePanel('book-view');
    closePanel('piano-view');
    var fade = document.getElementById('sleep-fade');
    if (fade) fade.remove();
    setPose(null);
    setFx('');
    Game.furniture.toggleStoreMode(false);
    Game.furniture.toggleRotateMode(false);
    var light = document.getElementById('room-light');
    if (light) light.style.display = 'none';
};

function nearestOfType(type, from, maxDist) {
    var best = null, bd = maxDist;
    list().forEach(function(o) {
        if (o === from || Game.furniture.typeOf(o[0]) !== type) return;
        var d = Math.hypot(o[1] - from[1], o[2] - from[2]);
        if (d <= bd) { bd = d; best = o; }
    });
    return best;
}

// Sources de lumière allumées : lampes (grand cercle) et télé (petit cercle bleuté)
function lights() {
    var out = [];
    list().forEach(function(o) {
        var t = Game.furniture.typeOf(o[0]);
        if (t === 'lamp' && o[4]) out.push({ x: o[1] + 24, y: o[2] + 24, r: 250, warm: true });
        if (t === 'tv' && o[4]) out.push({ x: o[1] + 24, y: o[2] + 24, r: 140, warm: false });
    });
    return out;
}
function hasLight() { return lights().length > 0; }

function sparkle(f, emoji, count) {
    var r = room().getBoundingClientRect(), k = scale();
    Game.particles.spawn(emoji, r.left + (f[1] + 24) * k, r.top + (f[2] + 10) * k, { count: count || 4, spread: 30, vy: -60 });
}

// ── Petit menu (table, cuisinière) ──
Game.furniture.closeMenu = function() {
    var m = document.getElementById('furniture-menu');
    if (m) m.remove();
};

function openMenu(f, el, html) {
    Game.furniture.closeMenu();
    var type = Game.furniture.typeOf(f[0]);
    var menu = document.createElement('div');
    menu.id = 'furniture-menu';
    menu.className = 'ui-card';
    menu.innerHTML = '<button class="fm-close">✕</button>' +
        '<div class="fm-title">' + f[0] + ' ' + Game.RECIPES[type].label + '</div>' +
        '<div class="fm-help">' + HELP[type] + '</div>' + html;
    menu.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
    menu.querySelector('.fm-close').onclick = Game.furniture.closeMenu;
    // Positionné sous le meuble (à l'écran, pour rester lisible même si la pièce est réduite)
    document.body.appendChild(menu);
    var b = (el && el.isConnected) ? el.getBoundingClientRect() : room().getBoundingClientRect();
    var W = window.innerWidth, H = window.innerHeight;
    var left = Math.max(8, Math.min(W - menu.offsetWidth - 8, b.left + b.width / 2 - menu.offsetWidth / 2));
    var top = b.bottom + 6;
    if (top + menu.offsetHeight > H - 8) top = Math.max(8, b.top - menu.offsetHeight - 6);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
}

// ── Grands panneaux (livre, piano) ──
function openPanel(id, html) {
    closePanel(id);
    var p = document.createElement('div');
    p.id = id;
    p.className = 'furniture-panel';
    p.innerHTML = html;
    p.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
    document.body.appendChild(p);
    return p;
}
function closePanel(id) {
    var p = document.getElementById(id);
    if (p) p.remove();
}

// ── Télé : l'émission défile sur l'écran ──
function showTvScreen(el, on) {
    var scr = el.querySelector('.tv-screen');
    if (!on) { if (scr) scr.remove(); return; }
    if (!scr) {
        scr = document.createElement('div');
        scr.className = 'tv-screen';
        el.appendChild(scr);
    }
    var show = TV_SHOWS[Math.floor(Math.random() * TV_SHOWS.length)];
    scr.innerHTML = '<span class="tv-emoji">' + show[0] + '</span><span class="tv-title">' + show[1] + '</span>';
}

var USES = {
    // Manger à table : +50 % ; avec une chaise collée : x2
    table: function(f, el) {
        var chair = nearestOfType('chair', f, 90);
        var mult = chair ? 2 : 1.5;
        var html = '<div class="fm-help"><b>' + (chair ? '🪑 Avec la chaise : faim x2 !' : 'Faim x1,5 (colle une chaise 🪑 pour x2)') + '</b></div>';
        var any = false;
        Game.FOODS.forEach(function(food) {
            var n = Game.inventory.foodCount(food);
            if (n <= 0) return;
            any = true;
            html += '<button class="btn-animal fm-eat" data-food="' + food.id + '">' + food.emoji + ' ' + food.label + ' ×' + n +
                ' (+' + Math.round(food.hunger * mult) + ')</button>';
        });
        if (!any) html += '<div class="fm-help">Tu n\'as rien à manger. Cueille des pommes 🍎 ou cuisine un plat !</div>';
        if (chair) { moveCharlieTo(chair[1], chair[2] - 6); setPose('sit'); }
        openMenu(f, el, html);
        var btns = document.querySelectorAll('#furniture-menu .fm-eat');
        for (var i = 0; i < btns.length; i++) {
            btns[i].onclick = function() {
                var id = this.dataset.food;
                var food = Game.FOODS.find(function(x) { return x.id === id; });
                var s = Game.state;
                var before = s.hunger;
                Game.inventory.eat(id);
                if (s.hunger > before) {
                    s.hunger = Math.min(Game.CONFIG.HUNGER_MAX, s.hunger + Math.round(food.hunger * (mult - 1)));
                    Game.ui.update();
                    setFx(food.emoji, 'fx-pop');
                    setTimeout(function() { if (!busy) setFx(''); }, 900);
                }
                USES.table(f, el);   // rafraîchit la liste
            };
        }
    },

    // S'asseoir : Charlie s'assoit sur la chaise (+5 XP une fois par jour)
    chair: function(f) {
        moveCharlieTo(f[1], f[2] - 6);
        setPose('sit');
        var table = nearestOfType('table', f, 90);
        var bonus = readyAgain(f);
        if (bonus) { f[3] = now(); Game.xp.add(5); Game.audio.playChime(); }
        Game.ui.notify((table ? "🪑 Assis à table : clique la table 🪵 pour manger (repas x2) !"
                              : "🪑 Tu t'assois. Astuce : colle la chaise à une table 🪵 !") + (bonus ? " (+5 XP)" : ""));
    },

    // Bibliothèque : Charlie prend un livre, on le voit lire, le livre s'ouvre
    bookshelf: function(f) {
        if (Game.time.isNight() && !hasLight()) {
            Game.ui.notify("Il fait trop noir pour lire ! Allume une lampe 💡");
            Game.audio.play('error');
            return;
        }
        busy = 'read';
        moveCharlieTo(f[1] + 10, f[2] + 55);
        setFx('📖', 'fx-read');
        Game.audio.play('craft');
        var page = Math.floor(Math.random() * BOOK_FACTS.length);
        var p = openPanel('book-view',
            '<div class="book">' +
                '<div class="book-page left"><div class="book-title">📖 Le Grand Livre<br>du Village</div><div class="book-text"></div></div>' +
                '<div class="book-page right"><div class="book-text"></div><div class="book-num"></div></div>' +
            '</div>' +
            '<div class="book-actions">' +
                '<button class="btn-animal book-prev">◀ Page</button>' +
                '<button class="btn-animal book-close">Fermer le livre</button>' +
                '<button class="btn-animal book-next">Page ▶</button>' +
            '</div>');
        function show() {
            var texts = p.querySelectorAll('.book-text');
            texts[0].textContent = BOOK_FACTS[page % BOOK_FACTS.length];
            texts[1].textContent = BOOK_FACTS[(page + 1) % BOOK_FACTS.length];
            p.querySelector('.book-num').textContent = 'page ' + (page % BOOK_FACTS.length + 1) + ' / ' + BOOK_FACTS.length;
        }
        show();
        p.querySelector('.book-next').onclick = function() { page += 2; show(); Game.audio.play('collect'); };
        p.querySelector('.book-prev').onclick = function() { page = (page - 2 + BOOK_FACTS.length * 10) % BOOK_FACTS.length; show(); Game.audio.play('collect'); };
        p.querySelector('.book-close').onclick = function() {
            closePanel('book-view');
            busy = null;
            setFx('');
        };
        if (readyAgain(f)) {
            f[3] = now();
            Game.xp.add(25);
            Game.ui.notify("📖 Tu apprends des choses ! +25 XP");
        }
    },

    // Plante : 2 fleurs une fois par jour
    plant: function(f) {
        moveCharlieTo(f[1] + 40, f[2] + 20);
        if (!readyAgain(f)) {
            Game.ui.notify("La plante repousse 🌱 Reviens dans " + minutesLeft(f) + " min");
            return;
        }
        f[3] = now();
        Game.state.inventory.flowers += 2;
        Game.xp.add(4);
        Game.audio.playChime();
        sparkle(f, '🌻', 6);
        setFx('🌻', 'fx-pop');
        setTimeout(function() { if (!busy) setFx(''); }, 1200);
        Game.ui.notify("🌻 +2 fleurs cueillies !");
    },

    // Lit (comme dans Minecraft) : la nuit, Charlie se couche et on passe au matin
    bed: function(f) {
        var s = Game.state;
        if (!isMine()) {
            Game.ui.notify("🛏️ C'est le lit de " + s.activeHouse.name.split(' ')[0] + " : va dormir dans ta maison !");
            return;
        }
        if (!canSleepNow()) {
            Game.ui.notify("Tu ne peux dormir que le soir et la nuit 🌙 (dès " + SLEEP_FROM + "h). Il est " + s.gameHour + "h ☀️");
            return;
        }
        busy = 'sleep';
        moveCharlieTo(f[1] + 4, f[2] + 4);
        setPose('sleep');
        setFx('💤', 'fx-zzz');
        var fade = document.createElement('div');
        fade.id = 'sleep-fade';
        fade.innerHTML = '<div class="sleep-text">💤 Bonne nuit...</div>';
        document.body.appendChild(fade);
        requestAnimationFrame(function() { fade.classList.add('dark'); });
        setTimeout(function() {
            s.gameHour = 7;
            s.gameMinute = 0;
            Game.furniture.updateLight();
            fade.querySelector('.sleep-text').textContent = '☀️ Bonjour ! Il est 7h';
            Game.audio.playChime();
        }, 2200);
        setTimeout(function() { fade.classList.remove('dark'); }, 3600);
        setTimeout(function() {
            fade.remove();
            busy = null;
            setPose(null);
            setFx('');
            moveCharlieTo(Math.min(522, f[1] + 70), f[2] + 30);
            Game.xp.add(10);
            Game.ui.notify("☀️ Bien dormi ! C'est le matin (+10 XP)");
        }, 4400);
    },

    // Lampe : allume / éteint (la lumière éclaire un cercle autour d'elle)
    lamp: function(f, el) {
        f[4] = !f[4];
        if (el) el.classList.toggle('lamp-on', !!f[4]);
        Game.audio.play('craft');
        Game.furniture.updateLight();
    },

    // Miroir : on se regarde et on change de tenue
    mirror: function(f) {
        moveCharlieTo(f[1], f[2] + 55);
        setFx('✨', 'fx-pop');
        setTimeout(function() { if (!busy) setFx(''); }, 1000);
        Game.ui.toggleSkins();
    },

    // Cuisinière : pain et plats
    stove: function(f, el) {
        var icons = { apples: '🍎', fish: '🐟', flowers: '🌻', bread: '🍞' };
        // Le pain se cuit aussi à la maison (indispensable avant la boulangerie, niveau 15)
        var html = '<button class="btn-animal fm-bread">🍞 Pain (🍎' + BREAD_APPLES + ')</button>';
        for (var id in Game.COOKING_RECIPES) {
            var r = Game.COOKING_RECIPES[id];
            var need = '';
            for (var it in r.need) need += (icons[it] || it) + r.need[it] + ' ';
            var locked = Game.state.level < r.level;
            html += '<button class="btn-animal fm-cook' + (locked ? ' fm-locked' : '') + '" data-recipe="' + id + '">' +
                (locked ? '🔒 ' : '') + r.emoji + ' ' + r.label + ' (' + need.trim() + ')' + (locked ? ' niv.' + r.level : '') + '</button>';
        }
        openMenu(f, el, html);
        var btns = document.querySelectorAll('#furniture-menu .fm-cook');
        for (var i = 0; i < btns.length; i++) {
            btns[i].onclick = function() { Game.crafting.cook(this.dataset.recipe); sparkle(f, '🔥', 3); };
        }
        document.querySelector('#furniture-menu .fm-bread').onclick = function() {
            var s = Game.state;
            if (s.inventory.apples < BREAD_APPLES) {
                Game.ui.notify("Il te faut " + BREAD_APPLES + " pommes 🍎 pour faire un pain");
                Game.audio.play('error');
                return;
            }
            s.inventory.apples -= BREAD_APPLES;
            s.inventory.bread++;
            Game.xp.add(5);
            Game.audio.play('craft');
            sparkle(f, '🍞', 3);
            Game.ui.update();
            Game.ui.notify("Pain frais ! 🍞");
        };
    },

    // Télé : allumer / éteindre ; une émission défile à l'écran
    tv: function(f, el) {
        f[4] = !f[4];
        if (el) { el.classList.toggle('tv-on', !!f[4]); showTvScreen(el, !!f[4]); }
        Game.audio.play('craft');
        Game.furniture.updateLight();
        if (f[4]) {
            var seat = nearestOfType('armchair', f, 400);
            if (seat) moveCharlieTo(seat[1], seat[2] - 6);
            else moveCharlieTo(f[1], Math.min(540, f[2] + 90));
            setPose('sit');
            var title = el ? el.querySelector('.tv-title') : null;
            if (readyAgain(f)) {
                f[3] = now();
                Game.xp.add(10);
                Game.ui.notify("📺 Tu regardes : " + (title ? title.textContent : "une émission") + " (+10 XP)");
            }
        }
    },

    // Fauteuil : on s'assoit ; si la télé est allumée, on la regarde
    armchair: function(f) {
        moveCharlieTo(f[1], f[2] - 6);
        setPose('sit');
        var tv = nearestOfType('tv', f, 400);
        if (tv && tv[4]) {
            var tel = elOf(tv), title = tel ? tel.querySelector('.tv-title') : null;
            if (readyAgain(tv)) { tv[3] = now(); Game.xp.add(10); }
            Game.ui.notify("🛋️ Bien installé devant la télé : " + (title ? title.textContent : "une émission") + " 📺");
        } else {
            Game.ui.notify(tv ? "🛋️ Confortable ! Clique la télé 📺 pour l'allumer" : "🛋️ Confortable ! Avec une télé 📺, ce serait parfait");
        }
    },

    // Frigo : un goûter (une fois toutes les 3 minutes)
    fridge: function(f) {
        var s = Game.state, max = Game.CONFIG.HUNGER_MAX;
        if (f[3] && now() - f[3] < DAY_MS / 4) {
            Game.ui.notify("🧊 Le frigo est vide pour l'instant, reviens dans " + Math.max(1, Math.ceil((DAY_MS / 4 - (now() - f[3])) / 60000)) + " min");
            return;
        }
        if (s.hunger >= max) { Game.ui.notify("🧊 Tu n'as pas faim !"); return; }
        f[3] = now();
        s.hunger = Math.min(max, s.hunger + 30);
        var snack = ['🧀', '🥛', '🍓', '🧃', '🍰', '🥕'][Math.floor(Math.random() * 6)];
        moveCharlieTo(f[1], Math.min(540, f[2] + 60));
        sparkle(f, snack, 3);
        Game.audio.playChime();
        Game.ui.notify(snack + " Miam, un goûter du frigo ! (+30 de faim)");
    },

    // Évier : faire la vaisselle
    counter: function(f) {
        moveCharlieTo(f[1], Math.min(540, f[2] + 60));
        sparkle(f, '🫧', 4);
        Game.audio.play('craft');
        if (readyAgain(f)) { f[3] = now(); Game.xp.add(5); Game.ui.notify("🧽 Tu fais la vaisselle : tout brille ! (+5 XP)"); }
        else Game.ui.notify("🧽 La vaisselle est déjà propre ✨");
    },

    // Piano : un vrai clavier qui joue des notes
    piano: function(f) {
        busy = 'piano';
        moveCharlieTo(f[1], Math.min(540, f[2] + 50));
        setPose('sit');
        setFx('🎵', 'fx-music');
        var played = 0;
        var keys = NOTES.map(function(n, i) {
            return '<button class="piano-key" data-i="' + i + '">' + n[0] + '<small>' + (i + 1) + '</small></button>';
        }).join('');
        var p = openPanel('piano-view',
            '<div class="piano-title">🎹 Joue du piano ! (touches 1 à 8 du clavier)</div>' +
            '<div class="piano-keys">' + keys + '</div>' +
            '<div class="book-actions">' +
                '<button class="btn-animal piano-song">🎶 Au clair de la lune</button>' +
                '<button class="btn-animal piano-close">Fermer</button>' +
            '</div>');
        function play(i) {
            Game.audio.playNote(NOTES[i][1], 0.5);
            var k = p.querySelector('.piano-key[data-i="' + i + '"]');
            if (k) { k.classList.add('down'); setTimeout(function() { k.classList.remove('down'); }, 180); }
            sparkle(f, i % 2 ? '🎵' : '🎶', 1);
            played++;
            if (played === 6 && readyAgain(f)) {
                f[3] = now();
                Game.xp.add(10);
                Game.ui.notify("🎹 Bravo, quel musicien ! +10 XP");
            }
        }
        p.querySelectorAll('.piano-key').forEach(function(b) {
            b.onclick = function() { play(parseInt(this.dataset.i, 10)); };
        });
        p.querySelector('.piano-song').onclick = function() {
            SONG.forEach(function(i, n) { setTimeout(function() { if (document.getElementById('piano-view')) play(i); }, n * 380); });
        };
        p.querySelector('.piano-close').onclick = function() {
            closePanel('piano-view');
            busy = null;
            setFx('');
        };
    },

    // Baignoire : Charlie prend un bain, avec des bulles
    bath: function(f) {
        busy = 'bath';
        moveCharlieTo(f[1] + 4, f[2] - 8);
        setPose('bath');
        setFx('🧼', 'fx-pop');
        Game.audio.play('fish');
        var n = 0;
        var bubbles = setInterval(function() {
            sparkle(f, ['💧', '✨', '🫧'][n % 2], 2);
            n++;
        }, 350);
        setTimeout(function() {
            clearInterval(bubbles);
            busy = null;
            setPose(null);
            setFx('✨', 'fx-pop');
            setTimeout(function() { if (!busy) setFx(''); }, 1000);
            moveCharlieTo(Math.min(522, f[1] + 70), f[2] + 30);
            if (readyAgain(f)) {
                f[3] = now();
                Game.xp.add(15);
                Game.ui.notify("🛁 Tout propre ! ✨ (+15 XP)");
            } else {
                Game.ui.notify("🛁 Tout propre ! ✨");
            }
        }, 3000);
    }
};

// Clavier : touches 1 à 8 pour le piano, Échap pour fermer
window.addEventListener('keydown', function(e) {
    var s = Game.state;
    if (!s || s.currentView !== 'interior') return;
    if (busy === 'piano' && e.key >= '1' && e.key <= '8') {
        var k = document.querySelector('#piano-view .piano-key[data-i="' + (parseInt(e.key, 10) - 1) + '"]');
        if (k) k.click();
        return;
    }
    if (e.key === 'Escape') {
        var close = document.querySelector('#piano-view .piano-close, #book-view .book-close');
        if (close) close.click();
        Game.furniture.closeMenu();
    }
});

// ── Lumière : la maison est sombre sans lampe allumée (très sombre la nuit),
//    chaque lampe éclaire un cercle autour d'elle ──
Game.furniture.updateLight = function() {
    var r = room();
    if (!r) return;
    var c = document.getElementById('room-light');
    if (!c) {
        c = document.createElement('canvas');
        c.id = 'room-light';
        r.appendChild(c);
    }
    // Taille réelle de l'intérieur de la pièce (bordure exclue)
    var W = r.clientWidth || 570, H = r.clientHeight || 570;
    if (c.width !== W) c.width = W;
    if (c.height !== H) c.height = H;
    var s = Game.state;
    // Seulement chez Charlie : les villageois ont déjà leur lumière
    if (s.currentView !== 'interior' || !isMine()) { c.style.display = 'none'; return; }
    var night = Game.time.isNight();
    var src = lights();
    var base = night ? 0.85 : (src.length ? 0 : 0.45);
    if (base === 0) { c.style.display = 'none'; return; }
    c.style.display = 'block';
    var g = c.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(10, 14, 40, ' + base + ')';
    g.fillRect(0, 0, W, H);
    // On "perce" la nuit autour de chaque lumière
    g.globalCompositeOperation = 'destination-out';
    src.forEach(function(l) {
        var grd = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        grd.addColorStop(0, 'rgba(0,0,0,1)');
        grd.addColorStop(0.5, 'rgba(0,0,0,0.85)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
    });
    // Un peu de couleur chaude (lampe) ou bleutée (télé)
    g.globalCompositeOperation = 'source-over';
    src.forEach(function(l) {
        var grd = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
        grd.addColorStop(0, l.warm ? 'rgba(255, 200, 90, 0.22)' : 'rgba(120, 180, 255, 0.2)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
    });
};

// Appelé à chaque image dans une maison
var _lightTimer = 0, _tvTimer = 0, _lastPos = null;
Game.furniture.update = function(dt) {
    var s = Game.state;
    if (s.currentView !== 'interior' || !s.activeHouse) return;
    dt = dt || 16;
    // Arrivé au meuble cliqué : on l'utilise
    if (pending) {
        if (dist(pending) <= USE_RADIUS) { var f0 = pending; pending = null; Game.furniture.use(f0); }
        else if (!s.interiorTarget) pending = null;
    }
    // Charlie se relève quand il marche (sauf s'il est occupé)
    var ic = s.interiorCharlie;
    if (!busy && _lastPos && Math.hypot(ic.x - _lastPos.x, ic.y - _lastPos.y) > 3) {
        setPose(null);
        var fx = document.getElementById('charlie-fx');
        if (fx && fx.className !== 'fx-pop') setFx('');
    }
    _lastPos = { x: ic.x, y: ic.y };
    placeFx();
    // Meubles proches en surbrillance, plante/biblio prêtes avec ✨
    var els = room().querySelectorAll('.furniture');
    for (var i = 0; i < els.length; i++) {
        var f = els[i]._f;
        if (!f) continue;
        var type = Game.furniture.typeOf(f[0]);
        var near = !!type && dist(f) <= USE_RADIUS;
        if (els[i].classList.contains('near') !== near) els[i].classList.toggle('near', near);
        var ready = (type === 'plant' || type === 'bookshelf') && readyAgain(f);
        if (els[i].classList.contains('ready') !== ready) els[i].classList.toggle('ready', ready);
    }
    // La télé change d'émission
    _tvTimer += dt;
    if (_tvTimer > 3500) {
        _tvTimer = 0;
        room().querySelectorAll('.furniture.tv-on').forEach(function(el) { showTvScreen(el, true); });
    }
    _lightTimer += dt;
    if (_lightTimer > 1000) { _lightTimer = 0; Game.furniture.updateLight(); }
};

// Touche E : utilise le meuble le plus proche
window.addEventListener('keydown', function(e) {
    var s = Game.state;
    if (!s || s.currentView !== 'interior' || !s.activeHouse || busy) return;
    if (e.key !== 'e' && e.key !== 'E') return;
    var best = null, bd = USE_RADIUS;
    list().forEach(function(f) {
        if (!Game.furniture.typeOf(f[0])) return;
        var d = dist(f);
        if (d <= bd) { bd = d; best = f; }
    });
    if (best) Game.furniture.use(best);
});

})();
