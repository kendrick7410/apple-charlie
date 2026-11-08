// ── time.js ── Cycle jour/nuit auto + saisons ──
(function(){
"use strict";

var lastUpdate = 0;

Game.time = {};

Game.time.init = function() {
    lastUpdate = performance.now();
    // Le temps passé dans la saison est sauvegardé avec la partie (Game.state.seasonElapsed) :
    // avant, il repartait de zéro à chaque ouverture du jeu et on pouvait rester bloqué dans une saison
    if (typeof Game.state.seasonElapsed !== 'number') Game.state.seasonElapsed = 0;
};

Game.time.update = function(now) {
    var dt = Math.max(0, now - lastUpdate);   // jamais négatif (sinon l'horloge affichait 09:0-1)
    lastUpdate = now;
    if (Game.state.paused || Game.state.currentView === 'title') return;

    Game.state.totalTimePlayed += dt;

    // Apply time speed multiplier
    dt *= (Game.state.timeSpeed || 1);

    // Advance game clock
    var msPerMin = Game.CONFIG.REAL_MS_PER_GAME_HOUR / 60;
    var gameMinsElapsed = dt / msPerMin;
    Game.state.gameMinute += gameMinsElapsed;

    while (Game.state.gameMinute >= 60) {
        Game.state.gameMinute -= 60;
        Game.state.gameHour++;
        if (Game.state.gameHour >= 24) {
            Game.state.gameHour = 0;
        }
    }

    // Season
    Game.state.seasonElapsed = (Game.state.seasonElapsed || 0) + dt;
    var seasonLen = Game.state.season === 'winter' ? Game.CONFIG.WINTER_DURATION_MS : Game.CONFIG.SEASON_DURATION_MS;
    if (Game.state.seasonElapsed >= seasonLen) {
        Game.state.seasonElapsed = Math.min(Game.state.seasonElapsed - seasonLen, Game.CONFIG.SEASON_DURATION_MS - 1000);
        Game.state.seasonIndex = (Game.state.seasonIndex + 1) % 4;
        Game.state.season = Game.SEASONS[Game.state.seasonIndex];
        Game.time.onSeasonChange(Game.state.season);
    }
};

Game.time.getPhase = function() {
    var h = Game.state.gameHour;
    var phases = Game.TIME_PHASES;
    if (h >= phases.dawn.start && h < phases.dawn.end) return 'dawn';
    if (h >= phases.day.start && h < phases.day.end) return 'day';
    if (h >= phases.dusk.start && h < phases.dusk.end) return 'dusk';
    return 'night';
};

Game.time.isNight = function() {
    // Nuit = 21h→8h. L'aube et le crépuscule restent "jour".
    return Game.time.getPhase() === 'night';
};

Game.time.getOverlayColor = function() {
    return Game.TIME_PHASES[Game.time.getPhase()].overlay;
};

Game.time.getClockString = function() {
    var h = Math.floor(Game.state.gameHour);
    var m = Math.floor(Game.state.gameMinute);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
};

Game.time.onSeasonChange = function(season) {
    Game.ui.notify(Game.SEASON_LABELS[season], 'info');

    // Update grass color
    document.documentElement.style.setProperty('--grass', Game.SEASON_GRASS[season]);

    // Update weather based on season
    Game.weather.onSeasonChange(season);

    // Update trees
    Game.entities.updateTreesForSeason(season);
};

Game.time.getSeasonLabel = function() {
    return Game.SEASON_LABELS[Game.state.season];
};

Game.time.setSpeed = function(speed) {
    Game.state.timeSpeed = speed;
    Game.ui.notify("Vitesse x" + speed);
    var el = document.getElementById('speed-display');
    if (el) el.textContent = 'x' + speed;
};

Game.time.togglePause = function() {
    Game.state.paused = !Game.state.paused;
    Game.ui.notify(Game.state.paused ? "Pause ⏸️" : "Reprise ▶️");
    var el = document.getElementById('pause-btn');
    if (el) el.textContent = Game.state.paused ? '▶️' : '⏸️';
};

})();
