// ── villagers.js ── IA des PNJ + dialogues ──
(function(){
"use strict";

var updateTimer = 0;
var UPDATE_INTERVAL = 2500;

Game.villagers = {};

// Track dialogue index per villager for cycling through dialogues
Game.villagers._dialogueIndex = {};

Game.villagers.init = function() {
    Game.state.villagers = [];
    for (var name in Game.VILLAGER_DATA) {
        // Le hibou Pedro ne sort jamais de son musée : pas de sprite qui se balade.
        // On le rencontre uniquement à l'intérieur du musée (la nuit).
        if (name === 'Pedro 🦉') continue;
        // Les villageois n'arrivent qu'une fois leur maison construite
        if (!Game.buildings.isVillagerHere(name)) continue;
        Game.villagers.spawn(name);
    }
};

// Fait apparaître un villageois devant sa maison
Game.villagers.spawn = function(name) {
    var world = document.getElementById('game-world');
    var data = Game.VILLAGER_DATA[name];
    var house = Game.buildings.houseOf(name);
    var home = house ? { x: house.x, y: house.y } : data.home;
    var v = document.createElement('div');
    v.className = 'entity villager-sprite';
    v.style.left = (home.x + 80) + 'px';
    v.style.top = (home.y + 100) + 'px';
    // Extract name without emoji
    var nameOnly = name.split(' ')[0];
    v.innerHTML = '<span class="villager-emoji">' + data.emoji + '</span>' +
        '<div class="building-label">' + nameOnly + '</div>' +
        '<div class="speech-bubble"></div>';
    v.style.fontSize = '2.5rem';
    v.style.cursor = 'pointer';
    v.dataset.villagerName = name;
    v.onclick = function(e) {
        e.stopPropagation();
        Game.villagers.interact(name);
    };
    world.appendChild(v);

    Game.state.villagers.push({
        el: v,
        x: home.x + 80,
        y: home.y + 100,
        name: name,
        homeX: home.x + 80,
        homeY: home.y + 100
    });
};

var WALK_SPEED = 42;   // pixels par seconde (marche tranquille)

Game.villagers.update = function(dt) {
    var isNight = Game.time.isNight();

    // Toutes les UPDATE_INTERVAL : nouvelle destination + petite phrase (le jour)
    updateTimer += dt;
    var pickNew = updateTimer >= UPDATE_INTERVAL;
    if (pickNew) updateTimer = 0;

    var step = WALK_SPEED * (dt / 1000);   // distance parcourue cette frame

    Game.state.villagers.forEach(function(v) {
        if (isNight) {
            // La nuit : rentré se coucher → caché dehors
            v.x = v.homeX; v.y = v.homeY;
            v.tx = v.homeX; v.ty = v.homeY;
            if (v.el.style.display !== 'none') v.el.style.display = 'none';
            return;
        }

        if (v.el.style.display === 'none') v.el.style.display = '';
        if (v.talkUntil && performance.now() < v.talkUntil) return;   // il discute avec Charlie : il ne bouge pas

        // Jour d'anniversaire : il attend à sa fête sur la place
        var party = Game.plaza && Game.plaza.partyTarget(v.name);
        if (party) {   // le point de fête est au sol (les pieds) : on le convertit en position de l'image
            var go = Game.placement.groundOffset(v.el);
            party = { x: party.x - go.x, y: party.y - go.y };
            if (!(v.detourUntil && performance.now() < v.detourUntil)) { v.tx = party.x; v.ty = party.y; }
        }
        // Cible de marche : au départ, ou renouvelée toutes les UPDATE_INTERVAL
        else if (v.tx === undefined || pickNew) {
            // Chaque villageois se promène autour de sa maison (Max reste près de son refuge)
            v.tx = Math.max(v.homeX - 300, Math.min(v.homeX + 300, v.x + (Math.random() - 0.5) * 260));
            v.ty = Math.max(v.homeY - 300, Math.min(v.homeY + 300, v.y + (Math.random() - 0.5) * 260));
        }

        // Avance doucement vers la cible (mouvement fluide chaque frame)
        var dx = v.tx - v.x, dy = v.ty - v.y;
        var dist = Math.hypot(dx, dy);
        if (dist > 1) {
            var mv = Math.min(step, dist);
            // Ne traverse ni arbres, ni maisons, ni rochers, ni balançoire, ni la rivière
            var st = Game.placement.move(v.el, v.x, v.y, v.x + (dx / dist) * mv, v.y + (dy / dist) * mv, 14);
            if (st.hit) {
                v.stuck = (v.stuck || 0) + 1;
                if (party) {
                    // En route pour sa fête mais coincé derrière une maison : il fait un détour par le côté,
                    // et s'il reste vraiment bloqué il finit par arriver (il connaît un raccourci)
                    v.partyStuck = (v.partyStuck || 0) + 1;
                    if (v.partyStuck > 240) { var o = Game.placement.groundOffset(v.el); if (!Game.placement.blocked(party.x + o.x, party.y + o.y, 14)) { st.x = party.x; st.y = party.y; } v.partyStuck = 0; }
                    else if (v.stuck > 25) { v.tx = v.x + (Math.random() - 0.5) * 300; v.ty = v.y + (Math.random() - 0.5) * 300; v.detourUntil = performance.now() + 2500; v.stuck = 0; }
                } else if (v.stuck > 25 || (st.x === v.x && st.y === v.y)) { v.tx = undefined; v.stuck = 0; }   // autre chemin
            } else v.stuck = 0;
            v.x = st.x; v.y = st.y;
            v.el.style.left = v.x + 'px';
            v.el.style.top = v.y + 'px';
            // Regarde dans le sens de la marche
            var em = v.el.querySelector('.villager-emoji');
            if (em) em.style.transform = (dx < 0 ? 'scaleX(-1)' : 'scaleX(1)');
        }

        // Petite phrase de temps en temps (au moment du changement de cible)
        if (pickNew && Math.random() > 0.75) {
            var data = Game.VILLAGER_DATA[v.name];
            var msg = data.greetings[Math.floor(Math.random() * data.greetings.length)];
            Game.villagers.showBubble(v, msg);
        }
    });
};

Game.villagers.showBubble = function(v, msg) {
    var bubble = v.el.querySelector('.speech-bubble');
    if (!bubble) return;
    bubble.textContent = msg;
    bubble.style.display = 'block';
    // Assez longtemps pour lire : plus la phrase est longue, plus la bulle reste
    clearTimeout(bubble._hide);
    bubble._hide = setTimeout(function() { bubble.style.display = 'none'; }, Math.min(8000, 3000 + msg.length * 70));
};

Game.villagers.interact = function(name) {
    var s = Game.state;
    var data = Game.VILLAGER_DATA[name];
    if (!data) return;

    // Check if near enough
    var v = s.villagers.find(function(vl) { return vl.name === name; });
    if (!v) return;
    if (Math.hypot(s.charlie.x - v.x, s.charlie.y - v.y) > 120) return;
    // Panneau d'amitié : discuter, offrir un cadeau, rendre sa quête (js/friends.js)
    if (Game.friends) { Game.friends.open(name); return; }

    var qi = s.questProgress[name] || 0;

    // If all quests are done, show dialogue
    if (qi >= data.quests.length) {
        Game.villagers.showDialogue(name, v);
        return;
    }

    // Check if next quest is locked behind unlock conditions
    if (!Game.quests.isQuestUnlocked(name, qi)) {
        Game.villagers.showDialogue(name, v);
        return;
    }

    var quest = data.quests[qi];

    // Check if quest can be completed
    if (Game.quests.canComplete(name)) {
        Game.quests.complete(name);
        return;
    }

    // Show quest
    Game.villagers.showBubble(v, quest.desc);
    Game.quests.showQuestUI(name, quest);
};

// Dialogue system - shows dialogue panel with villager conversation
Game.villagers.showDialogue = function(name, v) {
    var data = Game.VILLAGER_DATA[name];
    var dialogues = data.dialogues;
    if (!dialogues || dialogues.length === 0) {
        Game.villagers.showBubble(v, "Merci pour tout, Charlie ! 💛");
        return;
    }

    // Get next dialogue (cycle through them)
    if (!Game.villagers._dialogueIndex[name]) Game.villagers._dialogueIndex[name] = 0;
    var idx = Game.villagers._dialogueIndex[name];
    var msg = dialogues[idx % dialogues.length];
    Game.villagers._dialogueIndex[name] = (idx + 1) % dialogues.length;

    // Show dialogue panel
    Game.villagers.showDialoguePanel(name, data.emoji, msg);
};

Game.villagers.showDialoguePanel = function(name, emoji, msg) {
    // Remove existing panel
    var old = document.getElementById('dialogue-panel');
    if (old) old.remove();

    var panel = document.createElement('div');
    panel.id = 'dialogue-panel';
    panel.innerHTML =
        '<div class="dialogue-header">' +
            '<span class="dialogue-emoji">' + emoji + '</span>' +
            '<span class="dialogue-name">' + name + '</span>' +
        '</div>' +
        '<div class="dialogue-text">' + msg + '</div>' +
        '<div class="dialogue-hint">Clique pour fermer</div>';
    panel.onclick = function() { panel.remove(); };
    document.body.appendChild(panel);

    // Auto-close after 4 seconds
    setTimeout(function() {
        if (panel.parentNode) panel.remove();
    }, 4000);
};

})();
