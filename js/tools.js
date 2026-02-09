// ── tools.js ── Outils (hache, canne, arrosoir) ──
(function(){
"use strict";

Game.tools = {};

Game.tools.getToolbar = function() {
    var s = Game.state;
    var items = [];
    if (s.tools.axe) items.push({ emoji: '🪓', label: 'Hache', active: true });
    if (s.tools.rod) items.push({ emoji: '🎣', label: 'Canne', active: true });
    if (s.tools.watering) items.push({ emoji: '🚿', label: 'Arrosoir', active: true });
    return items;
};

Game.tools.hasAxe = function() { return Game.state.tools.axe; };
Game.tools.hasRod = function() { return Game.state.tools.rod; };
Game.tools.hasWatering = function() { return Game.state.tools.watering; };

})();
