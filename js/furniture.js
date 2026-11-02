// ── furniture.js ── Meubles utiles dans les maisons : utiliser, déplacer, ranger ──
// Chaque meuble est stocké dans Game.state.houseFurniture[houseId] sous la forme
// [emoji, x, y, dernierUsage, lampeAllumee] (les 2 derniers sont optionnels).
(function(){
"use strict";

Game.furniture = {};

var USE_RADIUS = 110;          // distance pour pouvoir utiliser un meuble
var DAY_MS = 12 * 60 * 1000;   // 1 jour de jeu = 12 minutes réelles (2h de jeu par minute)
var DRAG_THRESHOLD = 6;        // en dessous, c'est un clic ; au-dessus, on déplace

var BOOK_FACTS = [
    "Les loutres se tiennent la main en dormant pour ne pas dériver. 🦦",
    "Le Cervin mesure 4478 mètres de haut ! 🏔️",
    "Une pieuvre a trois cœurs. 🐙",
    "Les abeilles dansent pour dire aux autres où sont les fleurs. 🐝",
    "Les escargots peuvent dormir pendant trois ans. 🐌",
    "Le miel ne se périme jamais, même après des milliers d'années. 🍯",
    "Les chats passent environ 70 % de leur vie à dormir. 🐱",
    "Un éclair est cinq fois plus chaud que la surface du Soleil. ⚡",
    "Les flamants roses sont roses à cause de ce qu'ils mangent. 🦩",
    "Les dauphins se donnent des noms en sifflant. 🐬"
];

// Le type de meuble (clé de Game.RECIPES) à partir de son emoji
Game.furniture.typeOf = function(emoji) {
    for (var id in Game.RECIPES) { if (Game.RECIPES[id].emoji === emoji) return id; }
    return null;
};

// Ce que fait chaque meuble (texte du bouton + petite explication)
var ACTIONS = {
    table:     "🍽️ Manger à table",
    chair:     "🪑 S'asseoir",
    bookshelf: "📖 Lire un livre",
    plant:     "🌻 Cueillir des fleurs",
    bed:       "😴 Dormir",
    lamp:      "💡 Allumer / éteindre",
    mirror:    "🪞 Changer de tenue",
    stove:     "🍳 Cuisiner"
};
var HELP = {
    table:     "Manger ici rassasie +50 %, et le double si une chaise 🪑 est collée à la table !",
    chair:     "Place-la à côté d'une table 🪵 pour manger deux fois mieux.",
    bookshelf: "+25 XP une fois par jour. La nuit, il faut une lampe allumée 💡.",
    plant:     "Donne 2 fleurs 🌻 une fois par jour.",
    bed:       "La nuit, dors jusqu'au matin ☀️.",
    lamp:      "La nuit, la maison est sombre sans lampe allumée.",
    mirror:    "Essaie tes skins 🎭.",
    stove:     "Cuisine des plats sans aller à la boulangerie."
};

function room() { return document.getElementById('current-room'); }
// Échelle d'affichage de la pièce (réduite sur téléphone)
function scale() { var r = room(); return r.offsetWidth ? r.getBoundingClientRect().width / r.offsetWidth : 1; }
// Un meuble de villageois lui appartient : on peut l'utiliser et le déplacer, pas le ranger
function isMine() { var h = Game.state.activeHouse; return !!h && h.id === 'charlie'; }

// Réduit la pièce pour qu'elle tienne dans l'écran (téléphone), barre du bas comprise
var _fitKey = '';
Game.furniture.fitRoom = function() {
    var r = room();
    if (!r) return;
    var key = window.innerWidth + 'x' + window.innerHeight;
    if (key === _fitKey) return;
    _fitKey = key;
    var full = r.offsetWidth || 630;
    var k = Math.min(1, (window.innerWidth - 16) / full, (window.innerHeight - 170) / full);
    r.style.transform = k < 1 ? 'scale(' + k.toFixed(3) + ')' : '';
    r.style.transformOrigin = 'center 40%';
};
window.addEventListener('resize', function() { _fitKey = ''; Game.furniture.fitRoom(); });

// Toucher / cliquer le sol d'une pièce : Charlie marche jusque-là (indispensable sur téléphone)
document.addEventListener('pointerdown', function(e) {
    var r = room();
    if (!r || Game.state.currentView !== 'interior') return;
    if (e.target !== r && !e.target.classList.contains('exit-mat')) return;
    var rect = r.getBoundingClientRect(), k = scale();
    Game.state.interiorTarget = {
        x: Math.max(20, Math.min(540, (e.clientX - rect.left) / k - 24)),
        y: Math.max(20, Math.min(540, (e.clientY - rect.top) / k - 24))
    };
    Game.furniture.closeMenu();
});
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

// Affiche tous les meubles de la maison active (remplace les anciens)
Game.furniture.render = function() {
    var r = room();
    if (!r) return;
    Game.furniture.closeMenu();
    Game.furniture.fitRoom();
    var old = r.querySelectorAll('.furniture');
    for (var i = 0; i < old.length; i++) old[i].remove();
    list().forEach(function(f) {
        var div = document.createElement('div');
        div.className = 'furniture';
        div.textContent = f[0];
        div.style.left = f[1] + 'px';
        div.style.top = f[2] + 'px';
        if (Game.furniture.typeOf(f[0]) === 'lamp' && f[4]) div.classList.add('lamp-on');
        div._f = f;
        attachPointer(div, f);
        r.appendChild(div);
    });
    Game.furniture.updateLight();
};

// Glisser pour déplacer, cliquer pour ouvrir le menu (souris ET doigt)
function attachPointer(el, f) {
    var start = null, dragging = false, offX = 0, offY = 0;
    el.addEventListener('pointerdown', function(e) {
        e.stopPropagation();
        e.preventDefault();
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
        nx = Math.max(0, Math.min(r.clientWidth - 50, nx));
        ny = Math.max(0, Math.min(r.clientHeight - 50, ny));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
        f[1] = nx; f[2] = ny;   // sauvegardé avec la maison
    });
    el.addEventListener('pointerup', function() {
        if (!start) return;
        start = null;
        if (dragging) {
            dragging = false;
            el.classList.remove('dragging');
            Game.audio.play('craft');
        } else {
            Game.furniture.openMenu(f, el);
        }
    });
    el.addEventListener('pointercancel', function() { start = null; dragging = false; el.classList.remove('dragging'); });
}

// ── Petit menu sous le meuble ──
Game.furniture.closeMenu = function() {
    var m = document.getElementById('furniture-menu');
    if (m) m.remove();
};

Game.furniture.openMenu = function(f, el, extraHtml) {
    Game.furniture.closeMenu();
    var type = Game.furniture.typeOf(f[0]);
    var menu = document.createElement('div');
    menu.id = 'furniture-menu';
    menu.className = 'ui-card';
    var html = '<button class="fm-close">✕</button>';
    html += '<div class="fm-title">' + f[0] + ' ' + (type ? Game.RECIPES[type].label : 'Décoration') + '</div>';
    if (type) {
        html += '<div class="fm-help">' + HELP[type] + '</div>';
        if (!extraHtml) {
            html += '<button class="btn-animal fm-use">' + ACTIONS[type] + '</button>';
            if (isMine()) html += '<button class="btn-animal fm-store">📦 Ranger (rend le bois et la pierre)</button>';
        }
    } else {
        html += '<div class="fm-help">Un objet de décoration. Fais-le glisser pour le déplacer !</div>';
    }
    if (extraHtml) html += extraHtml;
    menu.innerHTML = html;
    menu.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
    var use = menu.querySelector('.fm-use');
    if (use) use.onclick = function() { Game.furniture.use(f, el); };
    var store = menu.querySelector('.fm-store');
    if (store) store.onclick = function() { Game.furniture.store(f); };
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
};

// ── Utiliser un meuble ──
Game.furniture.use = function(f, el) {
    var type = Game.furniture.typeOf(f[0]);
    if (!type) return;
    if (dist(f) > USE_RADIUS) {
        Game.ui.notify("Approche-toi du meuble pour l'utiliser 🚶");
        Game.audio.play('error');
        return;
    }
    var fn = USES[type];
    if (fn) fn(f, el);
    Game.ui.update();
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
    Game.ui.notify(f[0] + " rangé : +" + rcp.wood + " bois 🪵, +" + rcp.stone + " pierre");
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

function lampLit() {
    return list().some(function(o) { return Game.furniture.typeOf(o[0]) === 'lamp' && o[4]; });
}

function sparkle(f, emoji) {
    var r = room().getBoundingClientRect(), k = scale();
    Game.particles.spawn(emoji, r.left + (f[1] + 24) * k, r.top + (f[2] + 10) * k, { count: 4, spread: 30, vy: -60 });
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
        Game.furniture.openMenu(f, el, html);
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
                }
                USES.table(f, el);   // rafraîchit la liste
            };
        }
    },

    // S'asseoir : petit repos (+5 XP une fois par jour) et rappel de l'astuce table
    chair: function(f) {
        var table = nearestOfType('table', f, 90);
        var bonus = readyAgain(f);
        if (bonus) {
            f[3] = now();
            Game.xp.add(5);
            Game.audio.playChime();
            sparkle(f, '💤');
        }
        Game.ui.notify((table ? "🪑 Tu te reposes à table. Manger ici rassasie deux fois plus !"
                              : "🪑 Tu te reposes. Astuce : colle la chaise à une table 🪵 pour mieux manger !") + (bonus ? " (+5 XP)" : ""));
        Game.furniture.closeMenu();
    },

    // Lire un livre : +25 XP une fois par jour ; la nuit, il faut une lampe allumée
    bookshelf: function(f) {
        if (Game.time.isNight() && !lampLit()) {
            Game.ui.notify("Il fait trop noir pour lire ! Allume une lampe 💡");
            Game.audio.play('error');
            return;
        }
        if (!readyAgain(f)) {
            Game.ui.notify("Tu as déjà lu aujourd'hui 📚 Reviens dans " + minutesLeft(f) + " min");
            return;
        }
        f[3] = now();
        Game.xp.add(25);
        Game.audio.playChime();
        sparkle(f, '✨');
        Game.ui.notify("📖 " + BOOK_FACTS[Math.floor(Math.random() * BOOK_FACTS.length)] + " (+25 XP)");
        Game.furniture.closeMenu();
    },

    // Plante : 2 fleurs une fois par jour
    plant: function(f) {
        if (!readyAgain(f)) {
            Game.ui.notify("La plante repousse 🌱 Reviens dans " + minutesLeft(f) + " min");
            return;
        }
        f[3] = now();
        Game.state.inventory.flowers += 2;
        Game.xp.add(4);
        Game.audio.playChime();
        sparkle(f, '🌻');
        Game.ui.notify("🌻 +2 fleurs cueillies !");
        Game.furniture.closeMenu();
    },

    // Lit : la nuit, dormir jusqu'au matin
    bed: function() {
        var s = Game.state;
        if (!Game.time.isNight()) {
            Game.ui.notify("Tu n'as pas sommeil ☀️ Reviens dormir la nuit 🌙");
            return;
        }
        s.gameHour = 7;
        s.gameMinute = 0;
        Game.xp.add(10);
        Game.audio.playChime();
        Game.ui.notify("😴 Bonne nuit... ☀️ Bonjour ! Tu as dormi jusqu'à 7h (+10 XP)");
        Game.furniture.closeMenu();
        Game.furniture.updateLight();
    },

    // Lampe : allume / éteint
    lamp: function(f, el) {
        f[4] = !f[4];
        if (el) el.classList.toggle('lamp-on', !!f[4]);
        Game.audio.play('craft');
        Game.ui.notify(f[4] ? "💡 Lampe allumée" : "Lampe éteinte");
        Game.furniture.updateLight();
        Game.furniture.closeMenu();
    },

    // Miroir : ouvre les skins
    mirror: function() {
        Game.furniture.closeMenu();
        Game.ui.toggleSkins();
    },

    // Cuisinière : cuisiner à la maison
    stove: function(f, el) {
        var icons = { apples: '🍎', fish: '🐟', flowers: '🌻', bread: '🍞' };
        var html = '';
        for (var id in Game.COOKING_RECIPES) {
            var r = Game.COOKING_RECIPES[id];
            var need = '';
            for (var it in r.need) need += (icons[it] || it) + r.need[it] + ' ';
            var locked = Game.state.level < r.level;
            html += '<button class="btn-animal fm-cook' + (locked ? ' fm-locked' : '') + '" data-recipe="' + id + '">' +
                (locked ? '🔒 ' : '') + r.emoji + ' ' + r.label + ' (' + need.trim() + ')' + (locked ? ' niv.' + r.level : '') + '</button>';
        }
        Game.furniture.openMenu(f, el, html);
        var btns = document.querySelectorAll('#furniture-menu .fm-cook');
        for (var i = 0; i < btns.length; i++) {
            btns[i].onclick = function() { Game.crafting.cook(this.dataset.recipe); };
        }
    }
};

// ── La nuit, la maison est sombre sauf si une lampe est allumée ──
Game.furniture.updateLight = function() {
    var r = room();
    if (!r) return;
    var s = Game.state;
    var inHouse = s.currentView === 'interior' && !!s.activeHouse;
    var night = inHouse && Game.time.isNight();
    r.classList.toggle('room-dark', night && !lampLit());
    r.classList.toggle('room-lamp', night && lampLit());
};

// Appelé à chaque image dans une maison : surligne les meubles qu'on peut utiliser
var _lightTimer = 0;
Game.furniture.update = function(dt) {
    var s = Game.state;
    if (s.currentView !== 'interior' || !s.activeHouse) return;
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
    _lightTimer += dt || 16;
    if (_lightTimer > 1000) { _lightTimer = 0; Game.furniture.updateLight(); }
};

// Touche E : utilise le meuble le plus proche
window.addEventListener('keydown', function(e) {
    var s = Game.state;
    if (!s || s.currentView !== 'interior' || !s.activeHouse) return;
    if (e.key !== 'e' && e.key !== 'E') return;
    var best = null, bd = USE_RADIUS;
    list().forEach(function(f) {
        if (!Game.furniture.typeOf(f[0])) return;
        var d = dist(f);
        if (d <= bd) { bd = d; best = f; }
    });
    if (!best) return;
    var els = room().querySelectorAll('.furniture');
    for (var i = 0; i < els.length; i++) if (els[i]._f === best) Game.furniture.use(best, els[i]);
});

})();
