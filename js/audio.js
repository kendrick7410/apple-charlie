// ── audio.js ── Sons procéduraux (Web Audio API) ──
(function(){
"use strict";

var ctx = null;
var muted = false;
var ambientInterval = null;

Game.audio = {};

Game.audio.init = function() {
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
        console.warn('Web Audio not supported');
    }
};

Game.audio.resume = function() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
};

Game.audio.toggleMute = function() {
    muted = !muted;
    return muted;
};

Game.audio.isMuted = function() { return muted; };

Game.audio.play = function(soundName) {
    if (muted || !ctx) return;
    var def = Game.SOUNDS[soundName];
    if (!def) return;

    if (def.type === 'noise') {
        playNoise(def.dur);
        return;
    }

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = def.type || 'sine';
    osc.frequency.setValueAtTime(def.freq, ctx.currentTime);

    // Quick fade out
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + def.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + def.dur);
};

// Play a chime (collect sound with rising pitch)
Game.audio.playChime = function() {
    if (muted || !ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
};

// Level-up jingle
Game.audio.playLevelUp = function() {
    if (muted || !ctx) return;
    var notes = [523, 659, 784, 1047];
    notes.forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'square';
        var t = ctx.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    });
};

// Coin jingle (sell)
Game.audio.playCoin = function() {
    if (muted || !ctx) return;
    [1200, 1600].forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        var t = ctx.currentTime + i * 0.08;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    });
};

function playNoise(dur) {
    if (!ctx) return;
    var bufferSize = ctx.sampleRate * dur;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.02;
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
}

// Ambient sounds based on time of day
Game.audio.startAmbient = function() {
    if (ambientInterval) clearInterval(ambientInterval);
    ambientInterval = setInterval(function() {
        if (muted || !ctx) return;
        var s = Game.state;
        var hour = s.gameHour;
        if (hour >= 6 && hour < 19) {
            // Day: birds
            if (Math.random() > 0.6) Game.audio.play('bird');
        } else {
            // Night: crickets
            if (Math.random() > 0.5) Game.audio.play('cricket');
        }
    }, 4000);
};

Game.audio.stopAmbient = function() {
    if (ambientInterval) { clearInterval(ambientInterval); ambientInterval = null; }
};

})();
