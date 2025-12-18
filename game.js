const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loginScreen = document.getElementById('login-screen');
const scoreEl = document.getElementById('score');

let width, height, player, platforms, score, gameActive = false;
const gravity = 0.45;
const jumpStrength = -12;

// --- 1. ASSET HANDLING ---
const images = {};
const assets = {
    char: 'character.png',
    plat1: 'block-1.jpg', // Updated to match your uploaded filenames
    plat2: 'block-2.jpg'
};

let loadedCount = 0;
const totalAssets = Object.keys(assets).length;

function loadAssets(callback) {
    for (let key in assets) {
        images[key] = new Image();
        images[key].src = assets[key];
        images[key].onload = () => {
            loadedCount++;
            if (loadedCount === totalAssets) callback();
        };
        // Fallback if image fails
        images[key].onerror = () => {
            console.error("Failed to load: " + assets[key]);
            loadedCount++; 
            if (loadedCount === totalAssets) callback();
        };
    }
}

// --- 2. PERSISTENCE (90 DAYS) ---
function checkAuth() {
    const savedData = localStorage.getItem('currentUser');
    const expiry = localStorage.getItem('authExpiry');
    const now = new Date().getTime();

    if (savedData && expiry && now < expiry) {
        loginScreen.style.display = 'none'; // Auto-login
        initGame();
    }
}

document.getElementById('start-btn').onclick = () => {
    const name = document.getElementById('username').value;
    const pid = document.getElementById('poornataId').value;
    
    if(name && pid) {
        const expiryDate = new Date().getTime() + (90 * 24 * 60 * 60 * 1000);
        localStorage.setItem('currentUser', JSON.stringify({ name, pid, scores: [] }));
        localStorage.setItem('authExpiry', expiryDate);
        loginScreen.style.display = 'none';
        initGame();
    } else {
        alert("Please enter both Name and Poornata ID");
    }
};

// --- 3. GAME ENGINE ---
function resize() {
    width = window.innerWidth > 600 ? 600 : window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

function initGame() {
    score = 0;
    player = { x: width/2, y: height - 150, w: 50, h: 50, vx: 0, vy: 0 };
    platforms = [];
    for(let i=0; i<8; i++) {
        platforms.push({
            x: Math.random() * (width - 80),
            y: height - (i * 130),
            w: 80, h: 25,
            img: i % 2 === 0 ? images.plat1 : images.plat2
        });
    }
    gameActive = true;
    animate();
}

function update() {
    if(!gameActive) return;
    player.vy += gravity;
    player.y += player.vy;
    player.x += player.vx;

    // Bounce off platforms
    platforms.forEach(p => {
        if (player.vy > 0 && 
            player.x + 10 < p.x + p.w && player.x + player.w - 10 > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + 15) {
            player.vy = jumpStrength;
        }
    });

    // Screen wrap
    if (player.x > width) player.x = 0;
    if (player.x < -player.w) player.x = width;

    // Camera scroll
    if (player.y < height / 2) {
        let diff = height / 2 - player.y;
        player.y = height / 2;
        score += Math.floor(diff/10);
        scoreEl.innerText = score;
        platforms.forEach(p => {
            p.y += diff;
            if (p.y > height) {
                p.y = 0;
                p.x = Math.random() * (width - 80);
            }
        });
    }

    if (player.y > height) endGame();
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Draw Platforms
    platforms.forEach(p => {
        if (p.img.complete) ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
        else { ctx.fillStyle = "#F2622E"; ctx.fillRect(p.x, p.y, p.w, p.h); }
    });

    // Draw Player
    if (images.char.complete) ctx.drawImage(images.char, player.x, player.y, player.w, player.h);
    else { ctx.fillStyle = "blue"; ctx.fillRect(player.x, player.y, player.w, player.h); }
}

function animate() {
    update();
    draw();
    if(gameActive) requestAnimationFrame(animate);
}

function endGame() {
    gameActive = false;
    alert("Score: " + score);
    initGame(); // Restart automatically
}

// --- 4. CONTROLS (Click/Touch & Keyboard) ---
window.addEventListener('mousedown', (e) => {
    player.vx = e.clientX < window.innerWidth / 2 ? -6 : 6;
});
window.addEventListener('touchstart', (e) => {
    player.vx = e.touches[0].clientX < window.innerWidth / 2 ? -6 : 6;
});
window.addEventListener('mouseup', () => player.vx = 0);
window.addEventListener('touchend', () => player.vx = 0);

// Initialize
window.addEventListener('resize', resize);
resize();
loadAssets(checkAuth);
