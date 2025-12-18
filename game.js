const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loginScreen = document.getElementById('login-screen');
const scoreEl = document.getElementById('score');
const graffiti = document.getElementById('graffiti');

// Game Variables
let width, height, player, platforms, score = 0, gameActive = false;
const gravity = 0.35;
const jumpStrength = -11;

// Image Loading Manager
let imagesLoaded = 0;
const totalImages = 3;
function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("All assets ready.");
    }
}

const charImg = new Image(); charImg.src = 'character.png'; charImg.onload = imageLoaded;
const plat1 = new Image(); plat1.src = 'block-1.jpg'; plat1.onload = imageLoaded;
const plat2 = new Image(); plat2.src = 'block-2.jpg'; plat2.onload = imageLoaded;

// 1. Persistence Logic (90 Days)
function checkLogin() {
    const savedData = localStorage.getItem('game001_user');
    const expiry = localStorage.getItem('game001_expiry');
    const now = new Date().getTime();

    if (savedData && expiry && now < expiry) {
        loginScreen.style.display = 'none';
        initGame();
    }
}

document.getElementById('start-btn').onclick = () => {
    const name = document.getElementById('username').value;
    const pid = document.getElementById('poornataId').value;
    if (name && pid) {
        const userData = { name, pid, history: [], highScore: 0 };
        localStorage.setItem('game001_user', JSON.stringify(userData));
        localStorage.setItem('game001_expiry', new Date().getTime() + (90 * 24 * 60 * 60 * 1000));
        loginScreen.style.display = 'none';
        initGame();
    } else {
        alert("Please enter Name and Poornata ID");
    }
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
    player = { x: width/2 - 25, y: height - 150, w: 50, h: 50, vx: 0, vy: 0 };
    platforms = [];
    
    // Create initial platforms
    for(let i=0; i<8; i++) {
        platforms.push({
            x: Math.random() * (width - 80),
            y: height - (i * 100) - 50,
            w: 80, h: 20,
            img: Math.random() > 0.5 ? plat1 : plat2
        });
    }
    gameActive = true;
    animate();
}

// 2. Click/Touch Controls
const handleInput = (clientX) => {
    if (clientX < width / 2) player.vx = -6; // Move Left
    else player.vx = 6; // Move Right
};

window.addEventListener('mousedown', (e) => handleInput(e.clientX));
window.addEventListener('touchstart', (e) => handleInput(e.touches[0].clientX));
window.addEventListener('mouseup', () => player.vx = 0);
window.addEventListener('touchend', () => player.vx = 0);

function update() {
    if(!gameActive) return;

    player.vy += gravity;
    player.y += player.vy;
    player.x += player.vx;

    // Screen wrap
    if (player.x > width) player.x = -player.w;
    if (player.x < -player.w) player.x = width;

    // Collision
    platforms.forEach(p => {
        if (player.vy > 0 && 
            player.x + 10 < p.x + p.w && player.x + player.w - 10 > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + 15) {
            player.vy = jumpStrength;
        }
    });

    // Camera movement
    if (player.y < height / 3) {
        let offset = height / 3 - player.y;
        player.y = height / 3;
        score += Math.floor(offset / 10);
        scoreEl.innerText = score;
        platforms.forEach(p => {
            p.y += offset;
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
    platforms.forEach(p => ctx.drawImage(p.img, p.x, p.y, p.w, p.h));
    ctx.drawImage(charImg, player.x, player.y, player.w, player.h);
}

function animate() {
    update();
    draw();
    if(gameActive) requestAnimationFrame(animate);
}

function endGame() {
    gameActive = false;
    let user = JSON.parse(localStorage.getItem('game001_user'));
    
    // Track last 3 games
    user.history.unshift({ score: score, date: new Date().toLocaleDateString() });
    user.history = user.history.slice(0, 3);
    
    if (score > user.highScore) user.highScore = score;
    
    localStorage.setItem('game001_user', JSON.stringify(user));
    alert("Game Over! Score: " + score);
    location.reload(); 
}

// Check session on load
checkLogin();
