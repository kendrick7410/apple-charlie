// ── weather.js ── Météo (pluie, neige, soleil) via canvas ──
(function(){
"use strict";

var canvas, ctxW;
var drops = [];
var flakes = [];
var sunParticles = [];
var weatherTimer = 0;
var WEATHER_CHANGE_INTERVAL = 90000; // 1.5 min

Game.weather = {};

Game.weather.init = function() {
    canvas = document.createElement('canvas');
    canvas.id = 'weather-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1500;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    ctxW = canvas.getContext('2d');

    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Init drops
    for (var i = 0; i < 200; i++) {
        drops.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: 4 + Math.random() * 6, len: 10 + Math.random() * 15 });
    }
    for (var j = 0; j < 100; j++) {
        flakes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: 1 + Math.random() * 2, size: 2 + Math.random() * 4, drift: (Math.random() - 0.5) * 1 });
    }
    for (var k = 0; k < 40; k++) {
        sunParticles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: 1 + Math.random() * 3, alpha: Math.random() * 0.5, speed: 0.3 + Math.random() * 0.5 });
    }
};

Game.weather.update = function(dt) {
    if (!ctxW) return;
    ctxW.clearRect(0, 0, canvas.width, canvas.height);

    weatherTimer += dt;
    if (weatherTimer >= WEATHER_CHANGE_INTERVAL) {
        weatherTimer = 0;
        Game.weather.randomize();
    }

    var w = Game.state.weather;
    if (w === 'rain') drawRain(dt);
    else if (w === 'snow') drawSnow(dt);
    else if (w === 'sunny') drawSun(dt);
};

function drawRain(dt) {
    ctxW.strokeStyle = 'rgba(100,150,255,0.5)';
    ctxW.lineWidth = 1.5;
    ctxW.beginPath();
    for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        d.y += d.speed;
        d.x -= 1;
        if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
        if (d.x < 0) d.x = canvas.width;
        ctxW.moveTo(d.x, d.y);
        ctxW.lineTo(d.x + 1, d.y + d.len);
    }
    ctxW.stroke();
}

function drawSnow(dt) {
    ctxW.fillStyle = 'rgba(255,255,255,0.8)';
    for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.speed;
        f.x += f.drift + Math.sin(f.y * 0.01) * 0.5;
        if (f.y > canvas.height) { f.y = -f.size; f.x = Math.random() * canvas.width; }
        if (f.x < 0) f.x = canvas.width;
        if (f.x > canvas.width) f.x = 0;
        ctxW.beginPath();
        ctxW.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctxW.fill();
    }
}

function drawSun(dt) {
    for (var i = 0; i < sunParticles.length; i++) {
        var p = sunParticles[i];
        p.y += p.speed;
        p.alpha = 0.2 + Math.sin(performance.now() * 0.001 + i) * 0.2;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        ctxW.fillStyle = 'rgba(255,220,100,' + p.alpha + ')';
        ctxW.beginPath();
        ctxW.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctxW.fill();
    }
}

Game.weather.onSeasonChange = function(season) {
    if (season === 'winter') {
        Game.state.weather = 'snow';
    } else if (season === 'spring') {
        Game.state.weather = Math.random() > 0.5 ? 'rain' : 'clear';
    } else if (season === 'summer') {
        Game.state.weather = Math.random() > 0.4 ? 'sunny' : 'clear';
    } else if (season === 'autumn') {
        Game.state.weather = Math.random() > 0.4 ? 'rain' : 'clear';
    }
};

Game.weather.randomize = function() {
    var season = Game.state.season;
    var r = Math.random();
    if (season === 'winter') {
        Game.state.weather = r > 0.3 ? 'snow' : 'clear';
    } else if (season === 'spring') {
        Game.state.weather = r > 0.6 ? 'rain' : (r > 0.3 ? 'sunny' : 'clear');
    } else if (season === 'summer') {
        Game.state.weather = r > 0.5 ? 'sunny' : (r > 0.2 ? 'clear' : 'rain');
    } else {
        Game.state.weather = r > 0.5 ? 'rain' : (r > 0.2 ? 'clear' : 'snow');
    }
};

Game.weather.getLabel = function() {
    var w = Game.state.weather;
    if (w === 'rain') return '🌧️ Pluie';
    if (w === 'snow') return '🌨️ Neige';
    if (w === 'sunny') return '☀️ Grand soleil';
    return '⛅ Dégagé';
};

Game.weather.isRaining = function() {
    return Game.state.weather === 'rain';
};

})();
