// ── quests.js ── Quêtes des villageois ──
(function(){
"use strict";

Game.quests = {};

Game.quests.canComplete = function(villagerName) {
    var s = Game.state;
    var data = Game.VILLAGER_DATA[villagerName];
    if (!data) return false;
    var qi = s.questProgress[villagerName] || 0;
    if (qi >= data.quests.length) return false;

    var quest = data.quests[qi];
    for (var item in quest.need) {
        if ((s.inventory[item] || 0) < quest.need[item]) return false;
    }
    return true;
};

Game.quests.complete = function(villagerName) {
    var s = Game.state;
    var data = Game.VILLAGER_DATA[villagerName];
    var qi = s.questProgress[villagerName] || 0;
    var quest = data.quests[qi];

    // Consume items
    for (var item in quest.need) {
        s.inventory[item] -= quest.need[item];
    }

    // Rewards
    s.inventory.money += quest.reward.money;
    Game.xp.add(quest.reward.xp);

    // Mark complete
    if (!s.questCompleted[villagerName]) s.questCompleted[villagerName] = [];
    s.questCompleted[villagerName][qi] = true;
    s.questProgress[villagerName] = qi + 1;

    // Show completion
    var v = s.villagers.find(function(vl) { return vl.name === villagerName; });
    if (v) Game.villagers.showBubble(v, quest.done);

    Game.audio.playCoin();
    Game.particles.spawn('⭐', window.innerWidth / 2, window.innerHeight / 2, { count: 5, spread: 80, vy: -100 });
    Game.ui.update();
    Game.ui.notify("Quête terminée ! +" + quest.reward.money + "💰 +" + quest.reward.xp + "XP");
    Game.quests.updateQuestTracker();
};

Game.quests.showQuestUI = function(villagerName, quest) {
    Game.quests.updateQuestTracker();
};

Game.quests.getActiveQuest = function() {
    var s = Game.state;
    for (var name in Game.VILLAGER_DATA) {
        var qi = s.questProgress[name] || 0;
        var data = Game.VILLAGER_DATA[name];
        if (qi < data.quests.length) {
            return { villager: name, quest: data.quests[qi], index: qi };
        }
    }
    return null;
};

Game.quests.updateQuestTracker = function() {
    var tracker = document.getElementById('quest-tracker');
    if (!tracker) return;

    var html = '';
    var hasQuest = false;
    for (var name in Game.VILLAGER_DATA) {
        var qi = Game.state.questProgress[name] || 0;
        var data = Game.VILLAGER_DATA[name];
        if (qi < data.quests.length) {
            var quest = data.quests[qi];
            var complete = Game.quests.canComplete(name);
            html += '<div class="quest-item' + (complete ? ' quest-ready' : '') + '">';
            html += '<strong>' + name + '</strong>: ' + quest.desc;
            if (complete) html += ' ✅';
            html += '</div>';
            hasQuest = true;
        }
    }

    if (!hasQuest) {
        html = '<div class="quest-item">Pas de quête active</div>';
    }
    tracker.innerHTML = html;
};

})();
