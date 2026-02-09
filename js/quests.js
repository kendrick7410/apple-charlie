// ── quests.js ── Quêtes des villageois ──
(function(){
"use strict";

Game.quests = {};

// Count total quests completed across all villagers
Game.quests.totalCompleted = function() {
    var s = Game.state;
    var total = 0;
    for (var name in s.questCompleted) {
        var arr = s.questCompleted[name];
        if (arr) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i]) total++;
            }
        }
    }
    return total;
};

// Check if a specific quest index is unlocked for a villager
Game.quests.isQuestUnlocked = function(villagerName, questIndex) {
    var data = Game.VILLAGER_DATA[villagerName];
    if (!data || questIndex >= data.quests.length) return false;
    var quest = data.quests[questIndex];
    if (!quest.unlock) return true; // no unlock condition = always available
    var total = Game.quests.totalCompleted();
    if (total < quest.unlock.totalQuests) return false;
    if (Game.state.level < quest.unlock.level) return false;
    return true;
};

Game.quests.canComplete = function(villagerName) {
    var s = Game.state;
    var data = Game.VILLAGER_DATA[villagerName];
    if (!data) return false;
    var qi = s.questProgress[villagerName] || 0;
    if (qi >= data.quests.length) return false;
    if (!Game.quests.isQuestUnlocked(villagerName, qi)) return false;

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

    // Check if new quests just unlocked
    var total = Game.quests.totalCompleted();
    Game.quests._checkNewUnlocks(total);

    Game.quests.updateQuestTracker();
};

// Notify the player when a new wave of quests unlocks
Game.quests._checkNewUnlocks = function(totalDone) {
    for (var name in Game.VILLAGER_DATA) {
        var qi = Game.state.questProgress[name] || 0;
        var data = Game.VILLAGER_DATA[name];
        if (qi < data.quests.length) {
            var quest = data.quests[qi];
            if (quest.unlock && totalDone >= quest.unlock.totalQuests && Game.state.level >= quest.unlock.level) {
                // This is the first time we see a wave-2 quest becoming available
                if (!Game.quests._wave2Notified) {
                    Game.quests._wave2Notified = true;
                    Game.ui.notify("Nouvelles quêtes débloquées ! 🌟", 'info');
                    Game.particles.confetti();
                }
                return;
            }
        }
    }
};

Game.quests.showQuestUI = function(villagerName, quest) {
    Game.quests.updateQuestTracker();
};

Game.quests.getActiveQuest = function() {
    var s = Game.state;
    for (var name in Game.VILLAGER_DATA) {
        var qi = s.questProgress[name] || 0;
        var data = Game.VILLAGER_DATA[name];
        if (qi < data.quests.length && Game.quests.isQuestUnlocked(name, qi)) {
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
            if (!Game.quests.isQuestUnlocked(name, qi)) {
                // Quest exists but is locked
                html += '<div class="quest-item quest-locked">';
                html += '<strong>' + name + '</strong>: 🔒 Nouvelles quêtes bientôt...';
                html += '</div>';
                hasQuest = true;
                continue;
            }
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
