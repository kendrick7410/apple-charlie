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
    var html = '<div class="controls-card" role="dialog" aria-label="Paramètres"><button class="controls-close" aria-label="Fermer">✕</button>' +
        // Langue (tout en haut) : les noms restent dans leur langue pour qu'on s'y retrouve toujours
        '<div class="lang-row"><span class="lang-title">🌐 Language / Langue</span>' +
        '<button type="button" class="lang-btn' + (Game.lang === 'fr' ? ' on' : '') + '" data-lang="fr" translate="no">🇫🇷 Français</button>' +
        '<button type="button" class="lang-btn' + (Game.lang === 'en' ? ' on' : '') + '" data-lang="en" translate="no">🇬🇧 English</button></div>' +
        '<h2>⚙️ Commandes</h2>';
    CONTROLS.forEach(function(sec) {
        html += '<h3>' + sec[0] + '</h3><dl>';
        sec[1].forEach(function(r) { html += '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; });
        html += '</dl>';
    });
    html += '</div>';
    p.innerHTML = html;
    p.onclick = function(e) {
        if (e.target === p || e.target.classList.contains('controls-close')) { p.remove(); return; }
        var lb = e.target.closest && e.target.closest('.lang-btn');
        if (lb && lb.dataset.lang !== Game.lang && Game.setLang) Game.setLang(lb.dataset.lang);
    };
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


    screen.innerHTML = bg +
        '<div style="text-align:center;z-index:2;animation:title-entrance 1s ease-out;">' +
            '<div id="title-hero" style="font-size:5rem;margin-bottom:10px;text-shadow:0 4px 8px rgba(0,0,0,0.1);">🤠</div>' +
            '<h1 style="font-size:2.5rem;color:#5d4037;text-shadow:2px 2px 0 rgba(255,255,255,0.5);margin:0;font-family:Varela Round,sans-serif;">Le Village de Charlie</h1>' +
            '<p style="color:#8b6914;font-size:1rem;margin:10px 0 30px;font-family:Varela Round,sans-serif;">Une aventure tranquille</p>' +
            '<div style="display:flex;flex-direction:column;gap:12px;align-items:center;">' +
                '<button id="btn-play" class="title-play">Jouer ▶️</button>' +
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
    gear.innerHTML = '<span class="gear-icon">⚙️</span><span class="gear-label">Paramètres</span>';
    gear.onclick = function(e) { e.stopPropagation(); Game.titlescreen.showControls(); };
    screen.appendChild(gear);

    document.getElementById('btn-play').onclick = function() { Game.audio.resume(); Game.titlescreen.showWorlds(); };
};

// ── Choix du monde : jouer, créer (10 max), renommer, supprimer ──
function esc(t) { return String(t).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function playWorld(id, isNew) {
    Game.worldId = id;
    var p = document.getElementById('world-picker'); if (p) p.remove();
    if (isNew || !Game.loadGame()) {
        Game.newGame();
        Game.saveGame();
        isNew = true;
    }
    Game.titlescreen.hide();
    Game.startGame();
    if (isNew) setTimeout(function() {
        Game.ui.notify("🏡 Ton village est tout petit : seule Eloise 🐰 y habite. Gagne des niveaux ⭐ et achète des matériaux 🧱 pour construire d'autres maisons !", 'info');
    }, 1500);
}
Game.titlescreen.playWorld = playWorld;
Game.titlescreen.showWorlds = function() {
    var old = document.getElementById('world-picker'); if (old) old.remove();
    var worlds = Game.worlds.list();
    var p = document.createElement('div');
    p.id = 'world-picker';
    var html = '<div class="world-card"><button class="controls-close" aria-label="Fermer">✕</button><h2>🌍 Mes mondes <small>' + worlds.length + '/' + Game.MAX_WORLDS + '</small></h2><div class="world-list">';
    if (!worlds.length) html += '<p class="world-empty">Tu n\'as pas encore de monde. Crée ton premier monde ci-dessous !</p>';
    worlds.forEach(function(w) {
        var d = new Date(w.updated || w.created);
        html += '<div class="world-row" data-id="' + w.id + '">' +
            '<button class="world-play" data-act="play" title="Jouer">▶️</button>' +
            '<div class="world-info"><b class="world-name" translate="no">' + esc(w.name) + '</b><span>Niv. ' + (w.level || 1) + ' · ' + d.toLocaleDateString() + '</span></div>' +
            '<button class="world-btn" data-act="rename" title="Renommer">✏️</button>' +
            '<button class="world-btn" data-act="delete" title="Supprimer">🗑️</button></div>';
    });
    html += '</div>';
    if (worlds.length < Game.MAX_WORLDS) {
        html += '<form class="world-new"><input id="world-name" maxlength="' + Game.WORLD_NAME_MAX + '" placeholder="Nom du nouveau monde" autocomplete="off"><button type="submit" class="world-create">➕ Créer</button></form>' +
            '<div class="world-hint">20 caractères maximum</div>';
    } else {
        html += '<div class="world-hint">Tu as déjà 10 mondes (le maximum). Supprime-en un pour en créer un nouveau.</div>';
    }
    html += '</div>';
    p.innerHTML = html;
    document.body.appendChild(p);
    var form = p.querySelector('.world-new');
    if (form) form.onsubmit = function(e) {
        e.preventDefault();
        var w = Game.worlds.create(document.getElementById('world-name').value);
        if (w) playWorld(w.id, true);
    };
    p.onclick = function(e) {
        if (e.target === p || e.target.classList.contains('controls-close')) { p.remove(); return; }
        var btn = e.target.closest('[data-act]'); if (!btn) return;
        var row = btn.closest('.world-row'), id = row.dataset.id, w = Game.worlds.get(id);
        if (btn.dataset.act === 'play') playWorld(id, false);
        else if (btn.dataset.act === 'rename') {
            row.querySelector('.world-info').innerHTML = '<input class="world-rename" maxlength="' + Game.WORLD_NAME_MAX + '" value="' + esc(w.name) + '"><button class="world-btn world-ok" data-act="save" title="Valider">✅</button>';
            var inp = row.querySelector('.world-rename'); inp.focus(); inp.select();
            inp.onkeydown = function(ev) { if (ev.key === 'Enter') { Game.worlds.rename(id, inp.value); Game.titlescreen.showWorlds(); } };
        } else if (btn.dataset.act === 'save') {
            Game.worlds.rename(id, row.querySelector('.world-rename').value); Game.titlescreen.showWorlds();
        } else if (btn.dataset.act === 'delete') {
            row.querySelector('.world-info').innerHTML = '<b>Supprimer <span translate="no">« ' + esc(w.name) + ' »</span> ?</b><span>Ce monde sera perdu pour toujours.</span>';
            row.querySelector('.world-play').style.visibility = 'hidden';
            row.querySelectorAll('.world-btn').forEach(function(b) { b.remove(); });
            row.insertAdjacentHTML('beforeend', '<button class="world-btn world-yes" data-act="really-delete">Oui</button><button class="world-btn" data-act="cancel">Non</button>');
        } else if (btn.dataset.act === 'really-delete') { Game.worlds.remove(id); Game.titlescreen.showWorlds(); }
        else if (btn.dataset.act === 'cancel') Game.titlescreen.showWorlds();
    };
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
