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

    // Grange + panneau du nom
    var barn = document.createElement('div');
    barn.className = 'entity';
    barn.style.left = L.x + 'px';
    barn.style.top = (L.y - 170) + 'px';
    barn.style.fontSize = '5rem';
    barn.style.zIndex = 8;
    barn.innerHTML = '<div>🛖</div><div class="building-label">🚜 La Ferme</div>';
    world.appendChild(barn);

    // Enclos (clôtures) avec animaux
    F.pens.forEach(function(pen) {
        var w = 210, h = 150;
        var box = document.createElement('div');
        box.className = 'farm-pen';
        box.style.cssText = 'position:absolute;left:' + (pen.cx - w/2) + 'px;top:' + (pen.cy - h/2) +
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
            box.appendChild(a);
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

    // 2 animaux par enclos sortent et se dispersent autour de la ferme (faciles à retrouver)
    F.escaped = [];
    F.pens.forEach(function(pen, pi) {
        for (var k = 0; k < 2; k++) {
            var angle = Math.random() * Math.PI * 2;
            var dist = 180 + Math.random() * 200;   // pas trop loin
            var x = L.x + Math.cos(angle) * dist;
            var y = L.y + 40 + Math.sin(angle) * dist;
            var el = document.createElement('div');
            el.className = 'entity farm-escaped';
            el.style.cssText = 'position:absolute;font-size:2.4rem;z-index:15;';
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.textContent = pen.emoji;
            world.appendChild(el);
            F.escaped.push({ el: el, x: x, y: y, pen: pi, returned: false });
        }
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

function returnAnimal(a) {
    var F = Game.farm;
    a.returned = true;
    F.remaining--;
    var pen = F.pens[a.pen];
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
    var hud = document.getElementById('farm-hud');
    if (hud) hud.style.display = 'none';
    var p = document.getElementById('action-farm');
    if (p) p.style.display = 'none';
};

})();
