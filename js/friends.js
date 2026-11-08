// ── friends.js ── Amitié avec les habitants : cœurs, discussions, cadeaux, récompense à 5 cœurs ──
// Game.state.friendship[nom] = points (100 points = 1 cœur, 5 cœurs maximum)
// On gagne des points en discutant (1 fois par jour), en offrant un cadeau (1 fois par jour) et en finissant ses quêtes.
// À 5 cœurs, l'habitant offre son portrait encadré, posé dans la maison de Charlie.
(function(){
"use strict";

Game.friends = {};

var MAX = 500, PER_HEART = 100;
var TALK_PTS = 15, QUEST_PTS = 50;
var GIFT_PTS = { love: 60, like: 30, meh: 10 };

// Ce que chacun adore (❤️) et aime bien (👍) ; le reste lui fait juste plaisir
var TASTES = {
    'Eloise 🐰':        { love: ['flowers', 'bouquet'], like: ['apples', 'butterflies'] },
    'Lea 🐱':           { love: ['fish', 'sushi'],      like: ['bread', 'soup'] },
    'Tom 🐶':           { love: ['bread', 'cake'],      like: ['wood', 'apples'] },
    'Lucie 🦊':         { love: ['butterflies'],        like: ['flowers', 'bouquet'] },
    'Ordralfabétix 🐡': { love: ['soup', 'gourmet'],    like: ['fish', 'stone'] },
    'Max 🐕':           { love: ['soup', 'bread'],      like: ['stone', 'wood'] }
};
// Une phrase spéciale à chaque nouveau cœur
var HEART_LINES = [
    "Je suis contente de te connaître !",
    "On devient de vrais amis, toi et moi !",
    "Tu passes souvent me voir, ça me fait plaisir 😊",
    "Tu es vraiment quelqu'un de bien, Charlie.",
    "Tu es mon meilleur ami du village ! J'ai un cadeau pour toi 💝"
];

// Les choses qu'on peut offrir : inventaire et plats cuisinés
var BASIC = [
    ['apples', '🍎', 'Pomme'], ['bread', '🍞', 'Pain'], ['fish', '🐟', 'Poisson'], ['flowers', '🌻', 'Fleur'],
    ['butterflies', '🦋', 'Papillon'], ['wood', '🪵', 'Bois'], ['stone', '🪨', 'Pierre']
];
function giftables() {
    var s = Game.state, out = [];
    BASIC.forEach(function(b) { if ((s.inventory[b[0]] || 0) > 0) out.push({ id: b[0], emoji: b[1], label: b[2], n: s.inventory[b[0]], cooked: false }); });
    Object.keys(s.cookedItems || {}).forEach(function(k) {
        var r = Game.COOKING_RECIPES[k];
        if (r && s.cookedItems[k] > 0) out.push({ id: k, emoji: r.emoji, label: r.label, n: s.cookedItems[k], cooked: true });
    });
    return out;
}

// ── Données sauvegardées ──
function st() {
    var s = Game.state;
    s.friendship = s.friendship || {};
    s.friendDay = s.friendDay || {};      // { nom: { talk: jour, gift: jour } }
    s.friendKnown = s.friendKnown || {};  // { nom: { cadeau: 'love'|'like'|'meh' } } : goûts découverts
    s.friendReward = s.friendReward || {};
    return s;
}
function today() { return Game.state.dayNumber || 0; }
Game.friends.points = function(name) { return st().friendship[name] || 0; };
Game.friends.hearts = function(name) { return Math.min(5, Math.floor(Game.friends.points(name) / PER_HEART)); };
function heartsHtml(name) {
    var p = Game.friends.points(name), full = Game.friends.hearts(name), part = full < 5 ? (p % PER_HEART) / PER_HEART : 0, h = '';
    for (var i = 0; i < 5; i++) {
        var fill = i < full ? 1 : (i === full ? part : 0);
        h += '<span class="fh"><span class="fh-bg">\u2665\uFE0E</span><span class="fh-fg" style="width:' + Math.round(fill * 100) + '%">\u2665\uFE0E</span></span>';
    }
    return h;
}

// Ajoute des points ; annonce chaque nouveau cœur ; à 5 cœurs, le cadeau
Game.friends.add = function(name, pts) {
    var s = st(), before = Game.friends.hearts(name);
    s.friendship[name] = Math.min(MAX, (s.friendship[name] || 0) + pts);
    var after = Game.friends.hearts(name), first = name.split(' ')[0];
    if (after > before) {
        if (Game.audio.playLevelUp) Game.audio.playLevelUp();
        Game.particles.spawn('💛', window.innerWidth / 2, window.innerHeight / 2, { count: 6, spread: 90, vy: -90 });
        Game.ui.notify('💛 ' + first + ' : ' + after + ' cœur' + (after > 1 ? 's' : '') + ' ! « ' + HEART_LINES[after - 1] + ' »');
        if (after === 5 && !s.friendReward[name]) giveReward(name);
    }
    refreshPanel();
};

// Récompense à 5 cœurs : un portrait encadré de l'habitant, sur un chevalet, dans la maison de Charlie
function giveReward(name) {
    var s = st(), data = Game.VILLAGER_DATA[name];
    s.friendReward[name] = true;
    s.houseFurniture.charlie = s.houseFurniture.charlie || [];
    var f = ['🖼️', 260, 260, 0, 0, 0, data.emoji];
    if (Game.furniture.placeFree) Game.furniture.placeFree(s.houseFurniture.charlie, f);
    s.houseFurniture.charlie.push(f);
    s.inventory.money += 150;
    Game.ui.update();
    Game.ui.notify('🖼️ ' + name.split(' ')[0] + ' t\'offre son portrait encadré : il t\'attend dans ta maison ! (+150 💰)');
    if (s.activeHouse && s.activeHouse.id === 'charlie') Game.furniture.render();
}

// ── Panneau d'amitié ──
var current = null, panel = null, mode = 'talk', line = '';
function villagerOf(name) { return Game.state.villagers.find(function(v) { return v.name === name; }); }

Game.friends.open = function(name) {
    var data = Game.VILLAGER_DATA[name];
    if (!data) return;
    current = name; mode = 'talk';
    var v = villagerOf(name);
    if (v) v.talkUntil = Infinity;   // il s'arrête pour parler
    line = data.greetings[Math.floor(Math.random() * data.greetings.length)];
    if (questState(name) === 'ready') line = "Oh, tu as ce que je t'avais demandé ? 😃";
    render();
};
Game.friends.close = function() {
    if (current) { var v = villagerOf(current); if (v) v.talkUntil = performance.now() + 1500; }
    current = null;
    if (panel) { panel.remove(); panel = null; }
};
function refreshPanel() { if (current) render(); }

function questState(name) {
    var s = Game.state, data = Game.VILLAGER_DATA[name], qi = s.questProgress[name] || 0;
    if (!data.quests || qi >= data.quests.length) return 'none';
    if (!Game.quests.isQuestUnlocked(name, qi)) return 'none';
    return Game.quests.canComplete(name) ? 'ready' : 'open';
}

function render() {
    var s = st(), name = current, data = Game.VILLAGER_DATA[name], first = name.split(' ')[0];
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'friend-panel';
        panel.addEventListener('click', onClick);
        panel.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
        document.body.appendChild(panel);
    }
    var d = s.friendDay[name] || {}, talked = d.talk === today(), gifted = d.gift === today();
    var qs = questState(name), qi = s.questProgress[name] || 0, quest = data.quests && data.quests[qi];
    var html =
        '<button class="fp-close" data-a="close" aria-label="Fermer">✕</button>' +
        '<div class="fp-head"><span class="fp-emoji">' + data.emoji + '</span><div><div class="fp-name">' + first + '</div>' +
        '<div class="fp-hearts" title="' + Game.friends.points(name) + ' / ' + MAX + '">' + heartsHtml(name) + '</div></div></div>' +
        '<div class="fp-line">« ' + line + ' »</div>';
    if (mode === 'gift') {
        var items = giftables(), known = s.friendKnown[name] || {};
        html += '<div class="fp-sub">Que veux-tu offrir à ' + first + ' ?</div><div class="fp-gifts">';
        if (!items.length) html += '<div class="fp-empty">Tu n\'as rien à offrir pour l\'instant (pommes, fleurs, poissons, pain, plats...).</div>';
        items.forEach(function(it) {
            var tag = known[it.id] === 'love' ? '<i>❤️</i>' : known[it.id] === 'like' ? '<i>👍</i>' : '';
            html += '<button class="fp-gift" data-a="give" data-id="' + it.id + '" data-c="' + (it.cooked ? 1 : 0) + '" title="' + it.label + '">' + it.emoji + '<small>' + it.n + '</small>' + tag + '</button>';
        });
        html += '</div><div class="fp-actions"><button data-a="back">↩️ Retour</button></div>';
    } else {
        html += '<div class="fp-actions">' +
            '<button data-a="talk">💬 Discuter' + (talked ? '' : ' <b>+💛</b>') + '</button>' +
            '<button data-a="gift"' + (gifted ? ' disabled title="Déjà un cadeau aujourd\'hui"' : '') + '>🎁 Offrir un cadeau</button>' +
            '</div>';
        if (qs === 'ready') html += '<div class="fp-quest ready">📜 ' + quest.desc + '<br><button data-a="quest">✅ Donner (' + needText(quest.need) + ')</button></div>';
        else if (qs === 'open') html += '<div class="fp-quest">📜 ' + quest.desc + '<br><small>Il te faut : ' + needText(quest.need) + '</small></div>';
        if (gifted) html += '<div class="fp-note">🎁 Tu lui as déjà fait un cadeau aujourd\'hui.</div>';
        if (Game.friends.hearts(name) >= 5) html += '<div class="fp-note">💝 Meilleurs amis ! Son portrait est dans ta maison.</div>';
    }
    panel.innerHTML = html;
}
function needText(need) {
    var E = { apples: '🍎', bread: '🍞', fish: '🐟', flowers: '🌻', wood: '🪵', stone: '🪨', butterflies: '🦋', materials: '🧱', money: '💰' };
    return Object.keys(need || {}).map(function(k) { return need[k] + ' ' + (E[k] || k); }).join(', ');
}

function onClick(e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var a = b.dataset.a, s = st(), name = current, data = Game.VILLAGER_DATA[name];
    if (a === 'close') { Game.friends.close(); return; }
    if (a === 'gift') { mode = 'gift'; render(); return; }
    if (a === 'back') { mode = 'talk'; render(); return; }
    if (a === 'talk') {
        var idx = (Game.villagers._dialogueIndex[name] || 0);
        line = data.dialogues && data.dialogues.length ? data.dialogues[idx % data.dialogues.length] : 'Merci pour tout, Charlie ! 💛';
        Game.villagers._dialogueIndex[name] = idx + 1;
        s.friendDay[name] = s.friendDay[name] || {};
        if (s.friendDay[name].talk !== today()) { s.friendDay[name].talk = today(); Game.friends.add(name, TALK_PTS); }
        render(); return;
    }
    if (a === 'quest') { Game.quests.complete(name); line = (data.quests[(s.questProgress[name] || 1) - 1] || {}).done || 'Merci !'; render(); return; }
    if (a === 'give') {
        var id = b.dataset.id, cooked = b.dataset.c === '1';
        if (cooked) { if (!(s.cookedItems[id] > 0)) return; s.cookedItems[id]--; }
        else { if (!(s.inventory[id] > 0)) return; s.inventory[id]--; }
        var t = TASTES[name] || { love: [], like: [] };
        var kind = t.love.indexOf(id) > -1 ? 'love' : t.like.indexOf(id) > -1 ? 'like' : 'meh';
        s.friendKnown[name] = s.friendKnown[name] || {}; s.friendKnown[name][id] = kind;
        s.friendDay[name] = s.friendDay[name] || {}; s.friendDay[name].gift = today();
        line = kind === 'love' ? 'Oh ! J\'adore ça ! Merci mille fois Charlie 😍' : kind === 'like' ? 'Merci, c\'est gentil ! 😊' : 'Oh... merci quand même 🙂';
        if (kind === 'love') Game.particles.spawn('💖', window.innerWidth / 2, window.innerHeight / 2 - 60, { count: 5, spread: 70, vy: -80 });
        Game.audio.playChime();
        Game.ui.update();
        mode = 'talk';
        Game.friends.add(name, GIFT_PTS[kind]);
        render(); return;
    }
}

// Le panneau se ferme si Charlie s'éloigne ou entre quelque part
Game.friends.update = function() {
    if (!current) return;
    var s = Game.state, v = villagerOf(current);
    if (!v || s.currentView !== 'world' || Math.hypot(s.charlie.x - v.x, s.charlie.y - v.y) > 220) Game.friends.close();
};

// Finir une quête rapproche aussi
var origComplete = Game.quests.complete;
Game.quests.complete = function(name) {
    origComplete.apply(this, arguments);
    Game.friends.add(name, QUEST_PTS);
};

})();
