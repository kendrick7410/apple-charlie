// ── i18n.js ── Langue du jeu (français par défaut, anglais au choix dans ⚙️ Paramètres) ──
// Les textes du jeu restent écrits en français dans le code. En anglais, chaque texte affiché
// (page, messages, bulles, étiquettes 3D) est traduit juste avant d'apparaître, grâce au
// dictionnaire Game.I18N_EN (js/i18n-en.js : morceau de phrase français → anglais).
(function(){
"use strict";

var LANG = 'fr';
try { LANG = localStorage.getItem('village_lang') === 'en' ? 'en' : 'fr'; } catch (e) {}
Game.lang = LANG;

// Change de langue : on sauvegarde la partie et on recharge la page dans la nouvelle langue
Game.setLang = function(lang) {
    try { localStorage.setItem('village_lang', lang); } catch (e) {}
    if (Game.state && Game.state.currentView && Game.state.currentView !== 'title' && Game.saveGame) Game.saveGame();
    location.reload();
};

var _re = null, _cache = new Map();
function buildRegex() {
    var dict = Game.I18N_EN || {};
    var keys = Object.keys(dict).filter(function(k) { return k.trim().length >= 3 && dict[k] !== k; });
    keys.sort(function(a, b) { return b.length - a.length; });   // les plus longs d'abord
    var L = '\\p{L}';
    var parts = keys.map(function(k) {
        var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Un mot ne doit pas être remplacé à l'intérieur d'un autre mot (« Pain » dans « Pains »)
        return (/^\p{L}/u.test(k) ? '(?<!' + L + ')' : '') + esc + (/\p{L}$/u.test(k) ? '(?!' + L + ')' : '');
    });
    _re = parts.length ? new RegExp(parts.join('|'), 'gu') : null;
}
Game.tr = function(text) {
    if (LANG === 'fr' || !text || typeof text !== 'string') return text;
    if (!_re) buildRegex();
    if (!_re || !/\p{L}{2}/u.test(text)) return text;
    var hit = _cache.get(text);
    if (hit !== undefined) return hit;
    var dict = Game.I18N_EN;
    var out = text.replace(_re, function(m) { return dict[m] !== undefined ? dict[m] : m; });
    if (_cache.size > 4000) _cache.clear();
    _cache.set(text, out);
    return out;
};

if (LANG === 'fr') return;
document.documentElement.lang = 'en';

// Traduit un nœud de texte et les attributs visibles (title, aria-label, placeholder)
var ATTRS = ['title', 'aria-label', 'placeholder'];
function trText(node) {
    var v = node.nodeValue;
    if (!v || node.__tr === v) return;
    var p = node.parentNode;
    if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return;
    var t = Game.tr(v);
    node.__tr = t;
    if (t !== v) node.nodeValue = t;
}
function trEl(el) {
    for (var i = 0; i < ATTRS.length; i++) {
        var a = el.getAttribute && el.getAttribute(ATTRS[i]);
        if (a) { var t = Game.tr(a); if (t !== a) el.setAttribute(ATTRS[i], t); }
    }
}
function walk(root) {
    if (root.nodeType === 3) { trText(root); return; }
    if (root.nodeType !== 1 || root.nodeName === 'SCRIPT' || root.nodeName === 'STYLE') return;
    trEl(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) trText(n); else trEl(n); }
}
function start() {
    document.title = Game.tr(document.title);
    walk(document.body);
    new MutationObserver(function(muts) {
        for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            if (m.type === 'characterData') trText(m.target);
            else if (m.type === 'attributes') trEl(m.target);
            else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

})();
