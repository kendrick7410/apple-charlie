// ── titlescreen.js ── Écran titre animé ──
(function(){
"use strict";

Game.titlescreen = {};

// Fenêtre « Commandes » (ouverte par l'engrenage, sur l'accueil et dans le jeu)
var CONTROLS = [
    ['🚶 Se déplacer', [['Flèches ou Z Q S D', 'Marcher'], ['Clic sur le sol', 'Charlie marche jusque-là'], ['Flèches à l\'écran', 'Sur téléphone et tablette']]],
    ['🍎 Ramasser et récolter', [['Marcher dessus', 'Pommes, fleurs, cailloux, papillons (avec le filet)'], ['Clic sur un papillon', 'L\'attraper de loin (avec le filet)'], ['Bouton « Pêcher »', 'Au bord de l\'eau']]],
    ['🏠 Bâtiments', [['Bouton « Entrer »', 'Près d\'une porte'], ['Bouton « Construire »', 'Près d\'un terrain ou d\'un chantier'], ['Tapis 🌟', 'Marcher dessus pour sortir']]],
    ['🛋️ Dans ta maison', [['Clic sur un meuble', 'Charlie va l\'utiliser'], ['E', 'Utiliser le meuble le plus proche'], ['Glisser un meuble', 'Le déplacer'], ['Clic droit sur un meuble', 'Le tourner'], ['🔄 / 📦', 'Tourner ou ranger un meuble'], ['1 à 8', 'Jouer du piano'], ['Échap', 'Fermer le livre ou le piano']]],
    ['🧭 Aventure', [['N ou 🗺️', 'Voyage rapide'], ['🥾 + piolet', 'Escalader les montagnes'], ['Entrer dans l\'eau profonde', 'Nager'], ['🎠 Se balancer', 'Près de ta balançoire ; une flèche pour descendre']]],
    ['🧰 Boutons du panneau', [['💾', 'Sauvegarder'], ['🔊', 'Couper ou remettre le son'], ['⛏️', 'Pelle : tracer des chemins'], ['📖', 'Collection'], ['🎭', 'Skins'], ['🍴 Manger', 'Remplir la barre de faim']]]
];
Game.titlescreen.showControls = function() {
    var old = document.getElementById('controls-panel');
    if (old) { old.remove(); return; }
    var p = document.createElement('div');
    p.id = 'controls-panel';
    var html = '<div class="controls-card" role="dialog" aria-label="Commandes"><button class="controls-close" aria-label="Fermer">✕</button><h2>⚙️ Commandes</h2>';
    CONTROLS.forEach(function(sec) {
        html += '<h3>' + sec[0] + '</h3><dl>';
        sec[1].forEach(function(r) { html += '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; });
        html += '</dl>';
    });
    html += '</div>';
    p.innerHTML = html;
    p.onclick = function(e) { if (e.target === p || e.target.classList.contains('controls-close')) p.remove(); };
    document.body.appendChild(p);
};

Game.titlescreen.show = function() {
    Game.state.currentView = 'title';

    var existing = document.getElementById('title-screen');
    if (existing) existing.remove();

    var screen = document.createElement('div');
    screen.id = 'title-screen';
    screen.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#87CEEB 0%,#8cd47e 70%,#6ab04c 100%);overflow:hidden;';

    // Animated background elements
    var bg = '';
    var bgEmojis = ['🌳', '🌸', '🦋', '🐦', '☁️', '🌻', '🏡'];
    for (var i = 0; i < 20; i++) {
        var e = bgEmojis[Math.floor(Math.random() * bgEmojis.length)];
        var x = Math.random() * 100;
        var y = Math.random() * 100;
        var s = 1 + Math.random() * 2;
        var d = 5 + Math.random() * 10;
        bg += '<div style="position:absolute;left:' + x + '%;top:' + y + '%;font-size:' + s + 'rem;opacity:0.5;animation:title-float ' + d + 's ease-in-out infinite alternate;">' + e + '</div>';
    }

    var hasSave = Game.hasSave();

    screen.innerHTML = bg +
        '<div style="text-align:center;z-index:2;animation:title-entrance 1s ease-out;">' +
            '<div id="title-hero" style="font-size:5rem;margin-bottom:10px;text-shadow:0 4px 8px rgba(0,0,0,0.1);">🤠</div>' +
            '<h1 style="font-size:2.5rem;color:#5d4037;text-shadow:2px 2px 0 rgba(255,255,255,0.5);margin:0;font-family:Varela Round,sans-serif;">Le Village de Charlie</h1>' +
            '<p style="color:#8b6914;font-size:1rem;margin:10px 0 30px;font-family:Varela Round,sans-serif;">Une aventure tranquille</p>' +
            '<div style="display:flex;flex-direction:column;gap:12px;align-items:center;">' +
                (hasSave ?
                    '<button id="btn-continue" style="background:#ff9d5c;color:white;border:none;border-radius:999px;padding:14px 40px;font-size:1.1rem;font-weight:bold;cursor:pointer;box-shadow:0 4px 0 #d97d3e;font-family:Varela Round,sans-serif;transition:transform 0.1s;">Continuer 🎮</button>' : '') +
                '<button id="btn-newgame" style="background:' + (hasSave ? '#8d6e63' : '#ff9d5c') + ';color:white;border:none;border-radius:999px;padding:14px 40px;font-size:1.1rem;font-weight:bold;cursor:pointer;box-shadow:0 4px 0 ' + (hasSave ? '#6d4c41' : '#d97d3e') + ';font-family:Varela Round,sans-serif;transition:transform 0.1s;">Nouvelle Partie 🌟</button>' +
            '</div>' +
            '<div style="margin-top:40px;color:#8b6914;font-size:0.75rem;opacity:0.7;">ZQSD / Flèches pour se déplacer • Cliquer pour interagir</div>' +
        '</div>';

    document.body.appendChild(screen);

    // Bouton paramètres (engrenage) : affiche toutes les commandes
    var gear = document.createElement('button');
    gear.id = 'btn-settings';
    gear.className = 'settings-gear';
    gear.title = 'Paramètres et commandes';
    gear.setAttribute('aria-label', 'Paramètres et commandes');
    gear.textContent = '⚙️';
    gear.onclick = function(e) { e.stopPropagation(); Game.titlescreen.showControls(); };
    screen.appendChild(gear);

    // Button handlers
    var btnNew = document.getElementById('btn-newgame');
    if (btnNew) {
        btnNew.onmousedown = function() { this.style.transform = 'scale(0.95)'; };
        btnNew.onmouseup = function() { this.style.transform = 'scale(1)'; };
        btnNew.onclick = function() {
            Game.audio.resume();
            Game.newGame();
            Game.titlescreen.hide();
            Game.startGame();
            setTimeout(function() {
                Game.ui.notify("🏡 Ton village est tout petit : seule Eloise 🐰 y habite. Gagne des niveaux ⭐ et achète des matériaux 🧱 pour construire d'autres maisons !", 'info');
            }, 1500);
        };
    }

    var btnContinue = document.getElementById('btn-continue');
    if (btnContinue) {
        btnContinue.onmousedown = function() { this.style.transform = 'scale(0.95)'; };
        btnContinue.onmouseup = function() { this.style.transform = 'scale(1)'; };
        btnContinue.onclick = function() {
            Game.audio.resume();
            if (Game.loadGame()) {
                Game.titlescreen.hide();
                Game.startGame();
            }
        };
    }
};

Game.titlescreen.hide = function() {
    var screen = document.getElementById('title-screen');
    if (screen) {
        screen.style.transition = 'opacity 0.5s';
        screen.style.opacity = '0';
        setTimeout(function() { screen.remove(); }, 500);
    }
};

})();
