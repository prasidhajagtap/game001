const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loginScreen = document.getElementById('login-screen');
const scoreEl = document.getElementById('score');

let width, height, player, platforms, score = 0, gameActive = false;
const gravity = 0.4;
const jumpStrength = -12;

// Asset Loading (.png as requested)
const charImg = new Image(); charImg.src = 'character.png';
const plat1 = new Image(); plat1.src = 'block-1.png'; // Updated to .png
const plat2 = new Image(); plat2.src = 'block-2.png'; // Updated to .png

// 1. Validation & Persistence
function checkUserSession() {
    const savedUser = localStorage.getItem('game001_user');
    const expiry = localStorage.getItem('game001_expiry');
    if (savedUser && expiry && new Date().getTime() < expiry) {
        loginScreen.style.display = 'none';
        initGame();
    }
}

document.getElementById('start-btn').onclick = function() {
    const nameInput = document.getElementById('username').value;
    const pidInput = document.getElementById('poornataId').value;

    // Bug 1 Fix: Regex Validation
    const nameRegex = /^[A-Za-z\s]+$/;
    const pidRegex = /^[0-9]+$/;

    if(!nameRegex.test(nameInput)) {
        alert("Name must contain alphabets only.");
        return;
    }
    if(!pidRegex.test(pidInput)) {
        alert("Poornata ID must contain numbers only.");
        return;
    }

    const user = { name: nameInput, pid: pidInput, history: [], highScore: 0 };
    localStorage.setItem('game001_user', JSON.stringify(user));
    localStorage.setItem('game001_expiry', new Date().getTime() + (90 * 24 * 60 * 60 * 1000));
    loginScreen.style.display = 'none';
    initGame();
};

function resize() {
    width = window.innerWidth > 500 ? 500 : window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

function initGame() {
    score = 0;
    scoreEl.innerText = score;
    // Start player 100px above the starter platform
    player = { x: width/2 - 25, y: height - 150, w: 50, h: 50, vx: 0, vy: 0 };
    platforms = [];

    // Bug 2 Fix: Create a guaranteed starting platform
    platforms.push({ x: width/2 - 50, y: height - 80, w: 100, h: 30, img: plat1 });

    for(let i=1; i<8; i++) {
        platforms.push({
            x: Math.random() * (width - 80),
            y: height - (i * 120) - 80,
            w: 80, h: 30,
            img: Math.random() > 0.5 ? plat1 : plat2
        });
    }
    gameActive = true;
    animate();
}

// Bug 3 Fix: Robust Click & Touch
function handleInput(e) {
    e.preventDefault();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    player.vx = clientX < width / 2 ? -7 : 7;
}

window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, {passive: false});
window.addEventListener('mouseup', () => player.vx = 0);
window.addEventListener('touchend', () => player.vx = 0);

function update() {
    if(!gameActive) return;
    player.vy += gravity;
    player.y += player.vy;
    player.x += player.vx;

    if (player.x > width) player.x = -player.w;
    if (player.x < -player.w) player.x = width;

    // Platform Collision
    platforms.forEach(p => {
        if (player.vy > 0 && 
            player.x + 15 < p.x + p.w && player.x + player.w - 15 > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + 15) {
            player.vy = jumpStrength;
        }
    });

    // Camera move
    if (player.y < height / 2) {
        let diff = height / 2 - player.y;
        player.y = height / 2;
        score += 1;
        scoreEl.innerText = score;
        platforms.forEach(p => {
            p.y += diff;
            if (p.y > height) {
                p.y = 0;
                p.x = Math.random() * (width - 80);
                p.img = Math.random() > 0.5 ? plat1 : plat2;
            }
        });
    }
    if (player.y > height) endGame();
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    // Bug 4 Fix: Full platform image rendering
    platforms.forEach(p => {
        ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
    });
    ctx.drawImage(charImg, player.x, player.y, player.w, player.h);
}

function animate() {
    update();
    draw();
    if(gameActive) requestAnimationFrame(animate);
}

// Bug 5 Fix: History Display
function endGame() {
    gameActive = false;
    let user = JSON.parse(localStorage.getItem('game001_user'));
    
    user.history.unshift(score);
    user.history = user.history.slice(0, 3);
    
    if (score > user.highScore) user.highScore = score;
    localStorage.setItem('game001_user', JSON.stringify(user));

    const historyText = user.history.map((s, i) => `Game ${i+1}: ${s}`).join('\n');
    alert(`GAME OVER\n\nYour Score: ${score}\nBest: ${user.highScore}\n\nLast 3 Games:\n${historyText}`);
    location.reload();
}

checkUserSession();
