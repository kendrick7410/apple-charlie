// ── villagers.js ── IA des PNJ + dialogues ──
(function(){
"use strict";

var updateTimer = 0;
var UPDATE_INTERVAL = 2500;

Game.villagers = {};

// Track dialogue index per villager for cycling through dialogues
Game.villagers._dialogueIndex = {};

Game.villagers.init = function() {
    var world = document.getElementById('game-world');
    Game.state.villagers = [];

    for (var name in Game.VILLAGER_DATA) {
        var data = Game.VILLAGER_DATA[name];
        var v = document.createElement('div');
        v.className = 'entity villager-sprite';
        v.style.left = (data.home.x + 80) + 'px';
        v.style.top = (data.home.y + 100) + 'px';
        v.innerHTML = '<span class="villager-emoji">' + data.emoji + '</span>' +
            '<div class="building-label">' + name + '</div>' +
            '<div class="speech-bubble"></div>';
        v.style.fontSize = '2.5rem';
        v.style.cursor = 'pointer';
        v.dataset.villagerName = name;
        v.onclick = (function(n){ return function(e) {
            e.stopPropagation();
            Game.villagers.interact(n);
        }; })(name);
        world.appendChild(v);

        Game.state.villagers.push({
            el: v,
            x: data.home.x + 80,
            y: data.home.y + 100,
            name: name,
            homeX: data.home.x + 80,
            homeY: data.home.y + 100
        });
    }
};

Game.villagers.update = function(dt) {
    updateTimer += dt;
    if (updateTimer < UPDATE_INTERVAL) return;
    updateTimer = 0;

    var isNight = Game.time.isNight();

    Game.state.villagers.forEach(function(v) {
        if (isNight) {
            // Go home at night
            v.x += (v.homeX - v.x) * 0.3;
            v.y += (v.homeY - v.y) * 0.3;
        } else {
            // Wander
            v.x += (Math.random() - 0.5) * 100;
            v.y += (Math.random() - 0.5) * 100;
            v.x = Math.max(550, Math.min(1700, v.x));
            v.y = Math.max(700, Math.min(1700, v.y));
        }

        v.el.style.left = v.x + 'px';
        v.el.style.top = v.y + 'px';

        // Random speech
        if (!isNight && Math.random() > 0.75) {
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
    setTimeout(function() { bubble.style.display = 'none'; }, 2500);
};

Game.villagers.interact = function(name) {
    var s = Game.state;
    var data = Game.VILLAGER_DATA[name];
    if (!data) return;

    // Check if near enough
    var v = s.villagers.find(function(vl) { return vl.name === name; });
    if (!v) return;
    if (Math.hypot(s.charlie.x - v.x, s.charlie.y - v.y) > 120) return;

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
