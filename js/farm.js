// ── farm.js ── La Ferme : 3 enclos, un fermier, et la mission "rattrape les animaux" ──
(function(){
"use strict";

Game.farm = {
    active: false,
    remaining: 0,
    cooldownUntil: 0,
    escaped: [],       // { el, x, y, pen }
    farmer: null,      // { el, x, y, targetPen, waitUntil }
    pens: []           // { name, emoji, cx, cy, animals:[emoji...] }
};

// Enclos : chacun a un type d'animal
function penDefs() {
    var L = Game.CONFIG.LOCATIONS.farm;
    return [
        { name: '🐔 Poules',  emoji: '🐔', cx: L.x - 300, cy: L.y + 60, animals: ['🐔','🐓','🐤','🐣'] },
        { name: '🐄 Vaches',  emoji: '🐄', cx: L.x,       cy: L.y + 60, animals: ['🐄','🐮','🐄'] },
        { name: '🐷 Cochons', emoji: '🐷', cx: L.x + 300, cy: L.y + 60, animals: ['🐷','🐖','🐷'] }
    ];
}

Game.farm.init = function() {
    var F = Game.farm;
    var world = document.getElementById('game-world');
    var L = Game.CONFIG.LOCATIONS.farm;
    F.pens = penDefs();
    F.active = false; F.escaped = []; F.remaining = 0;

    // Grange rouge (décor) + panneau du nom
    var barn = document.createElement('div');
    barn.style.cssText = 'position:absolute;left:' + (L.x - 80) + 'px;top:' + (L.y - 240) + 'px;width:160px;z-index:8;';
    barn.innerHTML =
        // Toit
        '<div style="width:0;height:0;margin:0 auto;border-left:80px solid transparent;border-right:80px solid transparent;border-bottom:52px solid #7b2d2d;"></div>' +
        // Corps de la grange
        '<div style="width:160px;height:92px;box-sizing:border-box;background:linear-gradient(#c0392b,#9c2418);border:5px solid #f5f0e6;border-top:none;border-radius:0 0 6px 6px;position:relative;box-shadow:0 5px 8px rgba(0,0,0,0.2);">' +
            // Porte + croix blanche
            '<div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:56px;height:66px;background:#8a4b2a;border:4px solid #f5f0e6;border-bottom:none;border-radius:5px 5px 0 0;"></div>' +
            '<div style="position:absolute;left:50%;bottom:30px;transform:translate(-50%,50%) rotate(45deg);width:56px;height:4px;background:#f5f0e6;"></div>' +
            '<div style="position:absolute;left:50%;bottom:30px;transform:translate(-50%,50%) rotate(-45deg);width:56px;height:4px;background:#f5f0e6;"></div>' +
        '</div>' +
        '<div class="building-label" style="position:absolute;left:50%;top:158px;transform:translateX(-50%);">🚜 La Ferme</div>';
    world.appendChild(barn);

    // Tracteur (décor)
    var tractor = document.createElement('div');
    tractor.style.cssText = 'position:absolute;left:' + (L.x - 185) + 'px;top:' + (L.y - 150) +
        'px;font-size:3.2rem;z-index:8;filter:drop-shadow(0 3px 2px rgba(0,0,0,0.25));';
    tractor.textContent = '🚜';
    world.appendChild(tractor);

    // Bottes de foin rondes (décor) : paille enroulée en spirale, avec reflet et ombre
    function hayBale(x, y, size) {
        var h = document.createElement('div');
        h.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + size +
            'px;height:' + size + 'px;border-radius:50%;z-index:7;' +
            'background:' +
                'radial-gradient(circle at 38% 30%, rgba(255,255,255,0.4), rgba(255,255,255,0) 42%),' +
                'repeating-radial-gradient(circle at 50% 50%, #e8c25e 0 4px, #d6a63f 4px 7px, #c2912f 7px 9px);' +
            'border:3px solid #a8781f;box-shadow:0 4px 5px rgba(0,0,0,0.22), inset 0 -6px 11px rgba(0,0,0,0.14);';
        world.appendChild(h);
    }
    hayBale(L.x + 120, L.y - 152, 62);
    hayBale(L.x + 168, L.y - 118, 54);
    hayBale(L.x - 252, L.y + 26, 58);

    // Deux champs cultivés derrière la grange (au nord)
    function cropField(x, y, w, h, crop) {
        var f = document.createElement('div');
        f.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h +
            'px;z-index:3;border:7px solid #7a5a37;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.18);' +
            // rangées de cultures (bandes vertes) sur terre labourée
            'background:repeating-linear-gradient(96deg,#8faa3d 0 16px,#6f8a2c 16px 20px,#8a6a43 20px 24px);';
        // quelques plants qui dépassent
        var cols = Math.floor(w / 46), rows = Math.floor(h / 46);
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var p = document.createElement('div');
                p.style.cssText = 'position:absolute;left:' + (14 + c * 46) + 'px;top:' + (10 + r * 44) +
                    'px;font-size:1.5rem;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.2));';
                p.textContent = crop;
                f.appendChild(p);
            }
        }
        world.appendChild(f);
    }
    cropField(L.x - 230, L.y - 430, 200, 150, '🌽');   // champ de maïs
    cropField(L.x + 30,  L.y - 430, 200, 150, '🌾');   // champ de blé

    // Enclos (clôtures) avec animaux
    F.pens.forEach(function(pen) {
        var w = 210, h = 150;
        pen.boxLeft = pen.cx - w/2;
        pen.boxTop = pen.cy - h/2;
        pen.animalEls = [];
        var box = document.createElement('div');
        box.className = 'farm-pen';
        box.style.cssText = 'position:absolute;left:' + pen.boxLeft + 'px;top:' + pen.boxTop +
            'px;width:' + w + 'px;height:' + h + 'px;z-index:5;' +
            'border:6px solid #a1724b;border-radius:10px;background:rgba(150,110,60,0.14);' +
            'box-shadow:inset 0 0 0 3px rgba(255,255,255,0.15);';
        // Animaux dans l'enclos
        var positions = [[35,45],[120,40],[70,90],[150,95]];
        pen.animals.forEach(function(em, i) {
            var a = document.createElement('div');
            var pos = positions[i % positions.length];
            a.style.cssText = 'position:absolute;left:' + pos[0] + 'px;top:' + pos[1] +
                'px;font-size:2.2rem;filter:drop-shadow(0 2px 1px rgba(0,0,0,0.2));';
            a.textContent = em;
            a.dataset.px = pos[0];
            a.dataset.py = pos[1];
            box.appendChild(a);
            pen.animalEls.push(a);
        });
        // Étiquette de l'enclos
        var lb = document.createElement('div');
        lb.className = 'building-label';
        lb.textContent = pen.name;
        lb.style.cssText += 'position:absolute;left:50%;top:-22px;transform:translateX(-50%);';
        box.appendChild(lb);
        world.appendChild(box);
    });

    // Le fermier qui s'occupe de la ferme
    var fel = document.createElement('div');
    fel.className = 'entity farmer-sprite';
    fel.style.cssText = 'position:absolute;font-size:2.6rem;z-index:12;pointer-events:none;';
    fel.style.left = L.x + 'px';
    fel.style.top = (L.y - 40) + 'px';
    fel.textContent = '🧑‍🌾';
    world.appendChild(fel);
    F.farmer = { el: fel, x: L.x, y: L.y - 40, targetPen: 0, waitUntil: 0 };
};

// Le fermier se promène d'enclos en enclos et nourrit les animaux (🌾)
function updateFarmer(dt, now) {
    var F = Game.farm;
    var f = F.farmer;
    if (!f) return;
    var pen = F.pens[f.targetPen];
    var tx = pen.cx, ty = pen.cy - 100;   // devant l'enclos
    var dx = tx - f.x, dy = ty - f.y;
    var dist = Math.hypot(dx, dy);

    if (dist > 6 && now >= f.waitUntil) {
        var sp = 0.9;
        f.x += (dx / dist) * sp;
        f.y += (dy / dist) * sp;
    } else if (now >= f.waitUntil) {
        // Arrivé devant l'enclos : il nourrit puis attend un peu
        if (Game.particles && Game.particles.spawnWorld) {
            Game.particles.spawnWorld('🌾', pen.cx, pen.cy, { count: 2, spread: 40, vy: -30 });
        }
        f.waitUntil = now + 2500;
        f.targetPen = (f.targetPen + 1) % F.pens.length;
    }
    f.el.style.left = f.x + 'px';
    f.el.style.top = f.y + 'px';
}

Game.farm.startEscape = function() {
    var F = Game.farm, s = Game.state;
    if (F.active) return;
    var L = Game.CONFIG.LOCATIONS.farm;
    var world = document.getElementById('game-world');

    // TOUS les animaux de chaque enclos sortent EN COURANT : l'enclos se vide vraiment
    F.escaped = [];
    F.pens.forEach(function(pen, pi) {
        pen.hidden = [];   // les animaux figés cachés pendant qu'ils sont dehors
        pen.animalEls.forEach(function(src) {
            // Position de départ : à l'intérieur de l'enclos (là où l'animal était dessiné)
            var sx = pen.boxLeft + (+src.dataset.px) + 16;
            var sy = pen.boxTop  + (+src.dataset.py) + 16;
            src.style.display = 'none';
            pen.hidden.push(src);

            // Cible : un point dispersé autour de la ferme (pas trop loin, facile à retrouver)
            var angle = Math.random() * Math.PI * 2;
            var dist = 180 + Math.random() * 200;
            var tx = L.x + Math.cos(angle) * dist;
            var ty = L.y + 40 + Math.sin(angle) * dist;

            var el = document.createElement('div');
            el.className = 'entity farm-escaped';
            el.style.cssText = 'position:absolute;font-size:2.4rem;z-index:15;';
            el.style.left = sx + 'px';
            el.style.top = sy + 'px';
            el.textContent = src.textContent;   // le même animal que celui qui est parti
            world.appendChild(el);
            // mode 'run' : ils foncent hors de l'enclos, puis 'wander' : ils trottinent doucement
            F.escaped.push({ el: el, x: sx, y: sy, tx: tx, ty: ty, pen: pi, returned: false, mode: 'run', pauseUntil: 0 });
        });
    });

    F.active = true;
    F.remaining = F.escaped.length;
    var panel = document.getElementById('action-farm');
    if (panel) panel.style.display = 'none';
    var hud = document.getElementById('farm-hud');
    if (hud) hud.style.display = 'block';
    setFarmHud();
    Game.audio.play('levelup');
    Game.ui.notify("🐮 Oh non, les animaux se sont échappés ! Marche sur eux pour les ramener dans leurs enclos.");
};

function setFarmHud() {
    var el = document.getElementById('farm-count');
    if (el) el.textContent = Game.farm.remaining + ' à ramener';
}

Game.farm.update = function(dt, now) {
    var s = Game.state;
    var F = Game.farm;

    if (s.currentView !== 'world') {
        var pnl = document.getElementById('action-farm');
        if (pnl) pnl.style.display = 'none';
        return;
    }

    updateFarmer(dt, now);

    if (F.active) {
        for (var i = 0; i < F.escaped.length; i++) {
            var a = F.escaped[i];
            if (a.returned) continue;
            moveEscaped(a, dt, now);
            if (Math.hypot(s.charlie.x - a.x, s.charlie.y - a.y) < 85) {
                returnAnimal(a);
            }
        }
        if (F.remaining <= 0) finishFarm(now);
        return;
    }

    // Pas de mission en cours : propose la mission quand on est près de la ferme
    var panel = document.getElementById('action-farm');
    if (!panel) return;
    var L = Game.CONFIG.LOCATIONS.farm;
    var near = Math.hypot(s.charlie.x - L.x, s.charlie.y - (L.y + 40)) < 340;
    var enterEl = document.getElementById('action-enter');
    var enterShown = enterEl && getComputedStyle(enterEl).display !== 'none';
    panel.style.display = (near && now >= F.cooldownUntil && !enterShown) ? 'flex' : 'none';
};

// Déplace un animal échappé : d'abord il court hors de l'enclos ('run'),
// puis il trottine tranquillement d'un point à l'autre ('wander'). Jamais trop vite.
function moveEscaped(a, dt, now) {
    var F = Game.farm;
    var L = Game.CONFIG.LOCATIONS.farm;
    var step = dt / 16;   // ~1 à 60 fps

    if (a.mode === 'wander' && now < a.pauseUntil) { return; }  // petite pause entre deux trajets

    var dx = a.tx - a.x, dy = a.ty - a.y;
    var d = Math.hypot(dx, dy);
    var sp = (a.mode === 'run' ? 1.15 : 0.55) * step;   // course puis balade lente

    if (d > sp) {
        a.x += (dx / d) * sp;
        a.y += (dy / d) * sp;
    } else {
        a.x = a.tx; a.y = a.ty;
        // Arrivé : il repart flâner vers un nouveau point autour de la ferme
        a.mode = 'wander';
        a.pauseUntil = now + 400 + Math.random() * 900;
        var angle = Math.random() * Math.PI * 2;
        var dist = 120 + Math.random() * 220;
        a.tx = L.x + Math.cos(angle) * dist;
        a.ty = L.y + 40 + Math.sin(angle) * dist;
    }
    a.el.style.left = a.x + 'px';
    a.el.style.top = a.y + 'px';
}

function returnAnimal(a) {
    var F = Game.farm;
    a.returned = true;
    F.remaining--;
    var pen = F.pens[a.pen];
    // Un animal réapparaît dans son enclos
    if (pen.hidden && pen.hidden.length) { pen.hidden.pop().style.display = ''; }
    Game.audio.play('collect');
    if (Game.particles && Game.particles.spawnWorld) {
        Game.particles.spawnWorld('❤️', a.x, a.y, { count: 2, spread: 30, vy: -40 });
    }
    if (a.el && a.el.parentNode) a.el.parentNode.removeChild(a.el);
    setFarmHud();
    Game.ui.notify(pen.emoji + " de retour dans son enclos ! (" + F.remaining + " restant" + (F.remaining > 1 ? 's' : '') + ")");
}

function finishFarm(now) {
    var F = Game.farm, s = Game.state;
    F.active = false;
    var reward = 60 + Math.floor(Math.random() * 41);   // 60 à 100
    s.inventory.money += reward;
    Game.xp.add(35);
    Game.audio.playCoin();
    var L = Game.CONFIG.LOCATIONS.farm;
    if (Game.particles && Game.particles.spawnWorld) {
        Game.particles.spawnWorld('🌟', L.x, L.y, { count: 8, spread: 70, vy: -70 });
    }
    var hud = document.getElementById('farm-hud');
    if (hud) hud.style.display = 'none';
    F.cooldownUntil = now + 25000;
    Game.ui.update();
    Game.ui.notify("🎉 Bravo ! Tous les animaux sont rentrés. Le fermier te remercie : +" + reward + " clochettes 💰");
}

Game.farm.reset = function() {
    var F = Game.farm;
    F.active = false; F.remaining = 0; F.cooldownUntil = 0;
    F.escaped.forEach(function(a){ if (a.el && a.el.parentNode) a.el.parentNode.removeChild(a.el); });
    F.escaped = [];
    // Réaffiche les animaux qui étaient sortis de leur enclos
    (F.pens || []).forEach(function(pen){
        (pen.hidden || []).forEach(function(el){ el.style.display = ''; });
        pen.hidden = [];
    });
    var hud = document.getElementById('farm-hud');
    if (hud) hud.style.display = 'none';
    var p = document.getElementById('action-farm');
    if (p) p.style.display = 'none';
};

})();
