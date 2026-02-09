// ── farming.js ── Jardin potager ──
(function(){
"use strict";

var STAGES = ['', '🌱', '🌿', ''];  // last is crop emoji

Game.farming = {};

Game.farming.update = function(dt) {
    var s = Game.state;
    if (s.season === 'winter') return; // No growth in winter

    var now = performance.now();
    var rainBonus = Game.weather.isRaining() ? 0.5 : 0;

    for (var i = 0; i < s.gardenPlots.length; i++) {
        var plot = s.gardenPlots[i];
        if (!plot.crop || plot.stage >= 3) continue;

        var cropData = Game.CROPS[plot.crop];
        if (!cropData) continue;

        var growTime = Game.CONFIG.CROP_GROW_TIME * cropData.growTime;

        // Water speeds growth
        var waterMult = plot.waterLevel > 0 ? 0.7 : 1.0;
        // Rain auto-waters
        if (rainBonus > 0 && plot.waterLevel <= 0) {
            plot.waterLevel = 1;
        }
        // Decay water
        if (plot.waterLevel > 0) plot.waterLevel -= dt * 0.00005;

        var elapsed = now - plot.plantedAt;
        var growProgress = elapsed / (growTime * waterMult);

        if (growProgress >= 1 && plot.stage < 3) {
            plot.stage = 3; // Ready to harvest
        } else if (growProgress >= 0.5 && plot.stage < 2) {
            plot.stage = 2;
        } else if (growProgress >= 0.1 && plot.stage < 1) {
            plot.stage = 1;
        }
    }

    Game.farming.renderGarden();
};

Game.farming.onPlotClick = function(index) {
    var s = Game.state;
    if (!Game.xp.canGarden()) {
        Game.ui.notify("Jardin débloqué au niveau 5 ! 🔒");
        return;
    }

    // Check if near garden
    var gardenLoc = Game.CONFIG.LOCATIONS.garden;
    if (Math.hypot(s.charlie.x - gardenLoc.x - 90, s.charlie.y - gardenLoc.y - 90) > 150) {
        return; // Too far
    }

    var plot = s.gardenPlots[index];
    if (!plot) return;

    if (plot.crop && plot.stage >= 3) {
        // Harvest
        var cropData = Game.CROPS[plot.crop];
        s.inventory.money += cropData.sell;
        Game.xp.add(cropData.xp);
        Game.audio.playChime();
        Game.particles.spawnWorld(cropData.emoji, gardenLoc.x + (index % 5) * 39, gardenLoc.y + Math.floor(index / 5) * 39 + 20);
        Game.ui.notify(cropData.label + " récolté ! +" + cropData.sell + "💰");
        plot.crop = null;
        plot.stage = 0;
        plot.waterLevel = 0;
        plot.plantedAt = 0;
        Game.ui.update();
    } else if (plot.crop && plot.stage < 3) {
        // Water if has watering can
        if (s.tools.watering) {
            plot.waterLevel = 1;
            Game.audio.play('plant');
            Game.ui.notify("Arrosé ! 💧");
        } else {
            Game.ui.notify("Il te faut un arrosoir 🚿");
        }
    } else {
        // Plant - show seed selector
        Game.farming.showSeedMenu(index);
    }
};

Game.farming.showSeedMenu = function(plotIndex) {
    var s = Game.state;
    var season = s.season;
    var html = '<div class="seed-menu">';
    var hasSeeds = false;

    for (var cropId in Game.CROPS) {
        var crop = Game.CROPS[cropId];
        var count = s.seeds[cropId] || 0;
        var inSeason = crop.season.indexOf(season) >= 0;
        if (count > 0 && inSeason) {
            hasSeeds = true;
            html += '<button class="seed-btn" onclick="Game.farming.plant(' + plotIndex + ',\'' + cropId + '\')">' +
                crop.emoji + ' ' + crop.label + ' (' + count + ')</button>';
        }
    }

    if (!hasSeeds) {
        html += '<div style="padding:8px;font-size:12px;">Pas de graines disponibles cette saison</div>';
    }
    html += '</div>';

    // Show popup
    var popup = document.getElementById('seed-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'seed-popup';
        popup.style.cssText = 'position:fixed;bottom:50%;left:50%;transform:translateX(-50%);background:var(--ui-bg);border:4px solid #e8e2c8;border-radius:16px;padding:12px;z-index:6000;box-shadow:0 8px 20px rgba(0,0,0,0.2);';
        document.body.appendChild(popup);
    }
    popup.innerHTML = html + '<button class="seed-btn" onclick="document.getElementById(\'seed-popup\').style.display=\'none\'">Annuler</button>';
    popup.style.display = 'block';
};

Game.farming.plant = function(plotIndex, cropId) {
    var s = Game.state;
    if ((s.seeds[cropId] || 0) <= 0) return;

    s.seeds[cropId]--;
    var plot = s.gardenPlots[plotIndex];
    plot.crop = cropId;
    plot.stage = 0;
    plot.waterLevel = 0;
    plot.plantedAt = performance.now();

    Game.audio.play('plant');
    Game.ui.notify(Game.CROPS[cropId].label + " planté ! " + Game.CROPS[cropId].emoji);
    Game.ui.update();

    var popup = document.getElementById('seed-popup');
    if (popup) popup.style.display = 'none';
};

Game.farming.renderGarden = function() {
    var grid = document.getElementById('garden-grid');
    if (!grid) return;

    var cells = grid.querySelectorAll('.garden-cell');
    for (var i = 0; i < cells.length; i++) {
        var plot = Game.state.gardenPlots[i];
        if (!plot) continue;

        if (plot.crop) {
            var cropData = Game.CROPS[plot.crop];
            if (plot.stage >= 3) {
                cells[i].textContent = cropData.emoji;
                cells[i].style.background = 'rgba(100,180,60,0.5)';
            } else if (plot.stage >= 2) {
                cells[i].textContent = '🌿';
                cells[i].style.background = 'rgba(100,160,40,0.4)';
            } else if (plot.stage >= 1) {
                cells[i].textContent = '🌱';
                cells[i].style.background = 'rgba(139,120,43,0.5)';
            } else {
                cells[i].textContent = '·';
                cells[i].style.background = 'rgba(139,90,43,0.6)';
            }
            // Water indicator
            if (plot.waterLevel > 0) {
                cells[i].style.borderColor = 'rgba(100,150,255,0.6)';
            } else {
                cells[i].style.borderColor = 'rgba(139,90,43,0.3)';
            }
        } else {
            cells[i].textContent = '';
            cells[i].style.background = 'rgba(139,90,43,0.6)';
            cells[i].style.borderColor = 'rgba(139,90,43,0.3)';
        }
    }
};

})();
