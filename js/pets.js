// ── pets.js ── Prairie aux Lucioles, refuge des animaux et compagnon de Charlie ──
// Derrière le pont du torrent : fleurs rares, arbres fruitiers, lucioles la nuit, et le refuge où
// Charlie adopte un hamster, un chien OU un chat. Le compagnon le suit partout (sans traverser les obstacles)
// et a son panier dans la maison de Charlie.
(function(){
"use strict";

Game.pets = {};
var KINDS = {
    hamster: { emoji: '🐹', label: 'Hamster', speed: 1.05 },
    dog:     { emoji: '🐶', label: 'Chien',   speed: 1.25 },
    cat:     { emoji: '🐱', label: 'Chat',    speed: 1.15 }
};
var NAMES = { hamster: 'Noisette', dog: 'Rex', cat: 'Minou' };
Game.pets.KINDS = KINDS;
function L() { return Game.CONFIG.LOCATIONS; }
function world() { return document.getElementById('game-world'); }

// ── La prairie : fleurs rares et arbres fruitiers (posés là où il y a de la place) ──
var FRUITS = [['🍒', '#c2185b'], ['🍊', '#fb8c00'], ['🍑', '#ffab91']];
var RARE_FLOWERS = ['🌺', '🌼', '🪷', '🌸', '🪻'];
function prairiePick(rx, ry) {
    return function() {
        var a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()), P = L().prairie;
        var x = P.x + Math.cos(a) * d * rx, y = P.y + Math.sin(a) * d * ry;
        if (Game.bridge && Game.bridge.inTorrent(x + 30, y + 40)) return null;
        return { x: x, y: y };
    };
}
function buildPrairie() {
    for (var i = 0; i < 10; i++) {
        var f = FRUITS[i % FRUITS.length], t = document.createElement('div');
        t.className = 'entity tree fruit-tree';
        t.style.fontSize = (3.4 + Math.random() * 0.8) + 'rem';
        t.innerHTML = Game.SEASON_TREE[Game.state.season];
        t.dataset.hasApple = Game.state.season !== 'winter' ? 'true' : 'false';
        t.dataset.fruit = f[0]; t.dataset.fruitColor = f[1];
        Game.placement.place(t, prairiePick(520, 600), 60);
    }
    for (var j = 0; j < 30; j++) {
        var fl = Game.entities.createFlowerEl(0, 0, RARE_FLOWERS[j % RARE_FLOWERS.length], false);
        Game.placement.place(fl, prairiePick(560, 650), 40);
    }
}

// ── Le refuge : bâtiment + enclos où jouent un chien, un chat et un hamster ──
function buildRefuge() {
    var R = L().petRefuge, w = world();
    var b = document.createElement('div');
    b.id = 'pet-refuge';
    b.className = 'entity pet-refuge';
    b.style.left = R.x + 'px'; b.style.top = R.y + 'px';
    b.innerHTML = '<div class="building-label">🐾 Refuge des animaux</div>';
    w.appendChild(b);
    var pen = document.createElement('div');
    pen.className = 'farm-pen refuge-pen';
    var pw = 200, ph = 130, px = R.x + 130, py = R.y + 70;
    pen.style.cssText = 'position:absolute;left:' + px + 'px;top:' + py + 'px;width:' + pw + 'px;height:' + ph + 'px;z-index:5;border:6px solid #a1724b;border-radius:10px;background:rgba(150,110,60,0.14);';
    [['🐶', 30, 30], ['🐱', 120, 40], ['🐹', 70, 75]].forEach(function(a) {
        var d = document.createElement('div');
        d.style.cssText = 'position:absolute;left:' + a[1] + 'px;top:' + a[2] + 'px;font-size:2rem;';
        d.textContent = a[0]; d.dataset.px = a[1]; d.dataset.py = a[2];
        pen.appendChild(d);
    });
    var lb = document.createElement('div'); lb.className = 'building-label'; lb.textContent = '🐾 Pensionnaires';
    lb.style.cssText += 'position:absolute;left:50%;top:-22px;transform:translateX(-50%);';
    pen.appendChild(lb);
    w.appendChild(pen);
    if (!document.getElementById('action-refuge')) {
        var p = document.createElement('div');
        p.id = 'action-refuge';
        p.style.cssText = 'position:fixed;bottom:80px;right:10px;z-index:1000;display:none;flex-direction:column;gap:6px;';
        document.body.appendChild(p);
        p.addEventListener('click', function(e) { var bt = e.target.closest('button[data-pet]'); if (bt) Game.pets.adopt(bt.dataset.pet); });
    }
}
function refugePanel() {
    var s = Game.state, p = document.getElementById('action-refuge');
    if (!p) return;
    if (s.pet) {
        var k = KINDS[s.pet.type];
        p.innerHTML = '<div class="ui-card" style="padding:10px;max-width:250px;"><div style="font-size:0.85rem;font-weight:bold;color:#5d4037;">🐾 Refuge des animaux</div>' +
            '<div style="font-size:0.75rem;margin-top:4px;">' + k.emoji + ' <b>' + s.pet.name + '</b> est heureux avec toi ! Les autres pensionnaires te disent bonjour.</div></div>';
        return;
    }
    p.innerHTML = '<div class="ui-card" style="padding:10px;max-width:260px;">' +
        '<div style="font-size:0.85rem;font-weight:bold;color:#5d4037;margin-bottom:4px;">🐾 Refuge des animaux</div>' +
        '<div style="font-size:0.72rem;margin-bottom:6px;">Adopte un compagnon ! Il te suivra partout et dormira dans son panier, chez toi.</div>' +
        '<div style="display:flex;gap:6px;">' +
        Object.keys(KINDS).map(function(id) { return '<button data-pet="' + id + '" class="btn-animal" style="flex:1;padding:6px 4px;font-size:0.8rem;background:#8fbf7f;box-shadow:0 4px 0 #6f9e60;">' + KINDS[id].emoji + '<br>' + KINDS[id].label + '</button>'; }).join('') +
        '</div></div>';
}

Game.pets.init = function() {
    buildRefuge();
    // Le refuge et son enclos arrivent après le décor : on dégage ce qui les touche (arbres, fleurs, rochers)
    if (Game.placement.refreshObstacles) Game.placement.refreshObstacles();
    var R = L().petRefuge;
    Array.prototype.slice.call(world().children).forEach(function(c) {
        if (!(c.dataset.placed || c.dataset.layout) || c.classList.contains('plaza-deco')) return;
        var fp = Game.placement.footprint(c);
        if (!fp || fp.rect) return;
        if (Math.hypot(fp.x - R.x, fp.y - R.y) < 450 && !Game.placement.isFree(c)) c.remove();
    });
    buildPrairie();
    spawnPet();
};

// ── Adoption ──
Game.pets.adopt = function(type, givenName) {
    var s = Game.state, k = KINDS[type];
    if (!k || s.pet) return;
    var name = givenName !== undefined ? givenName : prompt('Comment veux-tu appeler ton ' + k.label.toLowerCase() + ' ? ' + k.emoji, NAMES[type]);
    if (name === null) return;
    name = String(name || '').replace(/[<>]/g, '').trim().slice(0, 16) || NAMES[type];
    s.pet = { type: type, name: name };
    // Son panier dans la maison de Charlie (un meuble comme les autres : déplaçable, solide)
    s.houseFurniture.charlie = s.houseFurniture.charlie || [];
    var basket = ['🧺', 400, 300, 0, 0, 0, k.emoji];
    if (Game.furniture.placeFree) Game.furniture.placeFree(s.houseFurniture.charlie, basket);
    s.houseFurniture.charlie.push(basket);
    spawnPet();
    if (Game.particles.confetti) Game.particles.confetti();
    if (Game.audio.playLevelUp) Game.audio.playLevelUp();
    Game.xp.add(30);
    Game.ui.notify(k.emoji + ' ' + name + ' est ton nouveau compagnon ! Il te suit partout, et son panier t\'attend dans ta maison 🧺');
    refugePanel();
    Game.saveGame();
};

// ── Le compagnon qui suit Charlie ──
var pet = null;
function spawnPet() {
    var s = Game.state;
    if (pet) { pet.el.remove(); pet = null; }
    if (!s.pet || !KINDS[s.pet.type]) return;
    var k = KINDS[s.pet.type], el = document.createElement('div');
    el.className = 'entity pet-sprite';
    el.style.fontSize = '2rem';
    el.appendChild(document.createTextNode(k.emoji));
    var lab = document.createElement('div'); lab.className = 'building-label'; lab.textContent = s.pet.name; el.appendChild(lab);
    var x = s.charlie.x - 60, y = s.charlie.y - 20;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    world().appendChild(el);
    pet = { el: el, x: x, y: y, k: k };
}
Game.pets.update = function(dt) {
    var s = Game.state, p = document.getElementById('action-refuge');
    if (p) {
        var near = s.currentView === 'world' && Math.hypot(s.charlie.x - L().petRefuge.x, s.charlie.y - (L().petRefuge.y + 60)) < 200;
        if (near && p.style.display === 'none') refugePanel();
        p.style.display = near ? 'flex' : 'none';
    }
    if (!pet) return;
    var inside = s.currentView !== 'world';
    pet.el.style.display = inside ? 'none' : '';   // dans la maison, il dort dans son panier
    if (inside) return;
    var o = Game.placement.groundOffset(pet.el);
    var gx = pet.x + o.x, gy = pet.y + o.y, cx = s.charlie.x, cy = s.charlie.y;
    var d = Math.hypot(cx - gx, cy - gy);
    if (d > 650) {   // Charlie est loin (voyage rapide, sortie de maison) : il le rejoint d'un bond
        pet.x = cx - 60 - o.x; pet.y = cy - 10 - o.y;
    } else if (d > 70) {   // il suit à petite distance, en contournant les obstacles
        var step = Game.CONFIG.PLAYER_SPEED * pet.k.speed * (dt || 16.67) / 16.67 * Math.min(1.6, d / 140);
        var nx = pet.x + (cx - gx) / d * step, ny = pet.y + (cy - gy) / d * step;
        var mv = Game.placement.move(pet.el, pet.x, pet.y, nx, ny, 12, { water: false });
        var ng = { x: mv.x + o.x, y: mv.y + o.y };
        if (Game.bridge && Game.bridge.inTorrent(ng.x, ng.y) && !(Game.bridge.fixed() && Game.bridge.onDeck(ng.x, ng.y))) mv = { x: pet.x, y: pet.y };   // pas dans le torrent
        pet.x = mv.x; pet.y = mv.y;
    }
    pet.el.style.left = pet.x + 'px'; pet.el.style.top = pet.y + 'px';
};

})();
