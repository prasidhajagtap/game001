const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreVal');
const menu = document.getElementById('menu');
const regForm = document.getElementById('reg-form');
const startBtn = document.getElementById('startBtn');

function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', resize);
resize();

// Assets - Relative paths for GitHub
const charImg = new Image(); charImg.src = './character.jpg';
const plat1 = new Image();   plat1.src = './block-1.jpg';
const plat2 = new Image();   plat2.src = './block-2.jpg';

let score, gameActive, platforms, player, startTime, clouds = [];
const gravity = 0.45;
const jumpPower = -14;
let keys = {};

// Initialize Clouds for Parallax
for(let i=0; i<5; i++) {
    clouds.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, s: 0.2 + Math.random()*0.5 });
}

// User Tracking
let currentUser = JSON.parse(localStorage.getItem('poornata_user'));

function checkUser() {
    if (!currentUser || (Date.now() - currentUser.regDate > 90 * 24 * 60 * 60 * 1000)) {
        regForm.style.display = 'block';
        menu.style.display = 'none';
    } else {
        document.getElementById('user-display').innerText = `PILOT: ${currentUser.name}`;
    }
}

window.registerUser = function() {
    const name = document.getElementById('reg-name').value.trim();
    const id = document.getElementById('reg-id').value.trim();
    if (!name || !id) return alert("REQUIRED: NAME & ID");

    currentUser = { name, id, regDate: Date.now(), totalTime: 0, sessions: 0, highScores: [] };
    localStorage.setItem('poornata_user', JSON.stringify(currentUser));
    location.reload();
};

function spawnGraffiti(text, x, y) {
    const g = document.createElement('div');
    g.className = 'graffiti';
    g.innerText = text;
    g.style.left = x + 'px'; g.style.top = y + 'px';
    document.getElementById('graffiti-container').appendChild(g);
    setTimeout(() => g.remove(), 800);
}

function initGame() {
    score = 0; gameActive = true;
    menu.style.display = 'none';
    startTime = Date.now();
    player = { x: canvas.width/2 - 30, y: canvas.height - 200, w: 60, h: 60, vx: 0, vy: 0 };
    platforms = [{ x: player.x - 20, y: player.y + 70, w: 120, h: 60, img: plat2 }];
    for(let i=0; i<8; i++) spawnPlatform(canvas.height - (i * 160) - 200);
    loop();
}

function spawnPlatform(y) {
    platforms.push({ x: Math.random()*(canvas.width-120), y: y, w: 120, h: 60, img: Math.random()>0.5?plat1:plat2 });
}

function loop() {
    if(!gameActive) return;
    
    // BG & Parallax Clouds
    ctx.fillStyle = '#000814';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    clouds.forEach(c => {
        ctx.beginPath(); ctx.arc(c.x, c.y, 20, 0, Math.PI*2); ctx.fill();
        c.y += c.s; if(c.y > canvas.height) c.y = -20;
    });

    // Control Logic
    if (keys['ArrowLeft']) player.vx = -8;
    else if (keys['ArrowRight']) player.vx = 8;
    else player.vx *= 0.85;

    player.x += player.vx;
    player.vy += gravity;
    player.y += player.vy;

    if(player.x > canvas.width) player.x = -player.w;
    if(player.x < -player.w) player.x = canvas.width;

    platforms.forEach(p => {
        if (p.img.complete) ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
        if (player.vy > 0 && player.x + player.w > p.x + 20 && player.x < p.x + p.w - 20 &&
            player.y + player.h > p.y && player.y + player.h < p.y + 25) {
            player.vy = jumpPower;
            if (score > 0 && score % 1000 === 0) spawnGraffiti("COOL!", player.x, player.y);
        }
    });

    if (player.y < canvas.height / 2) {
        let diff = canvas.height / 2 - player.y;
        player.y = canvas.height / 2;
        score += 10;
        scoreEl.innerText = score;
        platforms.forEach(p => {
            p.y += diff;
            if(p.y > canvas.height) { p.y = -60; p.x = Math.random()*(canvas.width-120); }
        });
    }

    if(charImg.complete) ctx.drawImage(charImg, player.x, player.y, player.w, player.h);
    
    if (player.y > canvas.height) endGame();
    else requestAnimationFrame(loop);
}

function endGame() {
    gameActive = false;
    menu.style.display = 'block';
    
    const duration = (Date.now() - startTime) / 1000;
    currentUser.totalTime += duration;
    currentUser.sessions += 1;
    currentUser.highScores.push(score);
    currentUser.highScores.sort((a,b) => b-a);
    currentUser.highScores = currentUser.highScores.slice(0, 3);
    currentUser.lastPlayed = new Date().toLocaleString();
    
    localStorage.setItem('poornata_user', JSON.stringify(currentUser));
    showLeaderboard();
}

function showLeaderboard() {
    if(!currentUser) return;
    let html = `<p style="color:#f0f; font-size:10px; margin-top:10px;">YOUR TOP SCORES:</p>`;
    currentUser.highScores.forEach(s => html += `<div style="font-size:12px;">${s}</div>`);
    document.getElementById('leaderboard').innerHTML = html;
}

// Global Event Listeners
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
canvas.addEventListener('touchstart', e => {
    const tx = e.touches[0].clientX;
    if(tx < canvas.width/2) { keys['ArrowLeft'] = true; keys['ArrowRight'] = false; }
    else { keys['ArrowRight'] = true; keys['ArrowLeft'] = false; }
}, {passive: true});
canvas.addEventListener('touchend', () => { keys['ArrowLeft'] = false; keys['ArrowRight'] = false; });

startBtn.onclick = initGame;
checkUser();
showLeaderboard();
