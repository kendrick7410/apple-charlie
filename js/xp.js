// ── xp.js ── XP et niveaux ──
(function(){
"use strict";

Game.xp = {};

Game.xp.add = function(amount) {
    var s = Game.state;
    // Bonus d'XP du skin équipé
    if (Game.player && Game.player.skinBonus) amount = Math.max(1, Math.round(amount * Game.player.skinBonus().xp));
    s.xp += amount;
    var needed = Game.xp.toNext();
    while (s.xp >= needed && s.level < Game.CONFIG.MAX_LEVEL) {
        s.xp -= needed;
        s.level++;
        needed = Game.xp.toNext();
        Game.xp.onLevelUp(s.level);
    }
    if (s.level >= Game.CONFIG.MAX_LEVEL) {
        s.xp = Math.min(s.xp, Game.xp.toNext());
    }
    Game.ui.updateXP();
};

Game.xp.toNext = function() {
    return Game.CONFIG.XP_PER_LEVEL + (Game.state.level - 1) * 30;
};

Game.xp.progress = function() {
    return Game.state.xp / Game.xp.toNext();
};

Game.xp.onLevelUp = function(newLevel) {
    Game.ui.notify("Niveau " + newLevel + " ! ⭐", 'levelup');
    Game.audio.playLevelUp();
    Game.particles.confetti();

    // Unlock messages
    if (newLevel === 3) Game.ui.notify("Cuisine débloquée ! 🍳", 'info');
    if (newLevel === 5) Game.ui.notify("Jardin débloqué ! 🌱", 'info');
    if (newLevel === 7) Game.ui.notify("Recettes rares débloquées ! 🍱", 'info');
};

Game.xp.canCook = function() { return Game.state.level >= 3; };
Game.xp.canGarden = function() { return Game.state.level >= 5; };
Game.xp.canRareCook = function() { return Game.state.level >= 7; };

})();
