/* Project: Jump Master (game002)
    Optimized Version: Preloading, distance-based scoring, cleaned structure.
*/

// --- CONFIGURATION ---
const CANVAS_MAX_WIDTH = 450; // Cap for larger screens
const GRAVITY = 0.4;
const JUMP_STRENGTH = -12;
const EXPIRY_MS = 7776000000; // 90 Days
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 30;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const INITIAL_PLATFORM_SPACING = 120;

// --- ASSETS ---
const charImg = new Image(); charImg.src = 'character.png';
const block1Img = new Image(); block1Img.src = 'block-1.png';
const block2Img = new Image(); block2Img.src = 'block-2.png';
let assetsLoaded = 0;
const totalAssets = 3;

charImg.onload = () => assetsLoaded++;
block1Img.onload = () => assetsLoaded++;
block2Img.onload = () => assetsLoaded++;

// --- STATE MANAGEMENT ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let player = { x: 0, y: 0, vx: 0, vy: 0 }; // Initialized in resetGame
let platforms = [];
let score = 0;
let gameRunning = false;
let currentUser = null;

// --- VALIDATION & AUTH ---
const nameRegex = /^[A-Za-z\s]+$/;
const pidRegex = /^[0-9]+$/;

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    document.getElementById('start-btn').addEventListener('click', handleLogin);
});

function handleLogin() {
    const name = document.getElementById('username').value.trim();
    const pid = document.getElementById('poornataId').value.trim();
    const errorMsg = document.getElementById('error-msg');

    if (!name || !nameRegex.test(name)) {
        errorMsg.textContent = "Error: Name must contain alphabets only (no empty).";
        errorMsg.classList.remove('hidden');
        return;
    }
    if (!pid || !pidRegex.test(pid)) {
        errorMsg.textContent = "Error: Poornata ID must be numeric (no empty).";
        errorMsg.classList.remove('hidden');
        return;
    }

    errorMsg.classList.add('hidden');

    // Set Session
    const expiry = Date.now() + EXPIRY_MS;
    const userData = { name, pid, expiry };
    localStorage.setItem('game002_user', JSON.stringify(userData));
    localStorage.setItem('game002_expiry', expiry);

    startGame(userData);
}

function checkSession() {
    const storedUser = localStorage.getItem('game002_user');
    const storedExpiry = localStorage.getItem('game002_expiry');

    if (storedUser && storedExpiry && Date.now() < parseInt(storedExpiry)) {
        startGame(JSON.parse(storedUser));
    } else {
        localStorage.removeItem('game002_user');
        localStorage.removeItem('game002_expiry');
    }
}

// --- GAME ENGINE ---
function startGame(user) {
    currentUser = user;
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    // Resize canvas
    canvas.width = Math.min(window.innerWidth, CANVAS_MAX_WIDTH);
    canvas.height = window.innerHeight;

    // Wait for assets before starting
    checkAssetsLoaded();
}

function checkAssetsLoaded() {
    if (assetsLoaded === totalAssets) {
        resetGame();
        gameRunning = true;
        requestAnimationFrame(gameLoop);
    } else {
        setTimeout(checkAssetsLoaded, 100); // Poll every 100ms
    }
}

window.addEventListener('resize', () => {
    if (currentUser) {
        canvas.width = Math.min(window.innerWidth, CANVAS_MAX_WIDTH);
        canvas.height = window.innerHeight;
        resetGame(); // Optional: Reset on resize for consistency
    }
});

function handleInput(e) {
    if (!gameRunning) {
        resetGame();
        gameRunning = true;
        return;
    }
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const midPoint = canvas.width / 2;
    player.vx = clientX < midPoint ? -7 : 7;
}

function resetGame() {
    player = {
        x: canvas.width / 2 - PLAYER_WIDTH / 2,
        y: canvas.height - 150,
        vx: 0,
        vy: 0
    };
    platforms = [];
    score = 0;
    document.getElementById('score-display').innerText = `Score: ${score}`;

    // Starter Platform
    platforms.push({ x: canvas.width / 2 - PLATFORM_WIDTH / 2, y: canvas.height - 50, type: 1 });

    // Generate initial platforms
    for (let i = 0; i < 6; i++) {
        spawnPlatform(canvas.height - 150 - (i * INITIAL_PLATFORM_SPACING));
    }

    // Input Handling
    window.addEventListener('mousedown', handleInput);
    window.addEventListener('touchstart', handleInput, { passive: false });
}

function spawnPlatform(y) {
    const x = Math.random() * (canvas.width - PLATFORM_WIDTH);
    const type = Math.random() > 0.5 ? 1 : 2;
    platforms.push({ x, y, type });
}

function update() {
    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;
    player.vx *= 0.9; // Friction

    // Screen Wrap
    if (player.x + PLAYER_WIDTH < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -PLAYER_WIDTH;

    // Platform Collision (only when falling)
    if (player.vy > 0) {
        platforms.forEach(p => {
            if (
                player.x < p.x + PLATFORM_WIDTH &&
                player.x + PLAYER_WIDTH > p.x &&
                player.y + PLAYER_HEIGHT > p.y &&
                player.y + PLAYER_HEIGHT < p.y + PLATFORM_HEIGHT
            ) {
                player.vy = JUMP_STRENGTH;
            }
        });
    }

    // Scroll Logic (keep player centered when ascending)
    const centerY = canvas.height / 2;
    if (player.y < centerY) {
        const scrollAmount = centerY - player.y;
        player.y = centerY;
        score += Math.floor(scrollAmount); // Optimized: score by distance
        document.getElementById('score-display').innerText = `Score: ${score}`;
        platforms.forEach(p => {
            p.y += scrollAmount; // Move platforms down by scroll amount
            if (p.y > canvas.height) {
                p.y = 0 - PLATFORM_HEIGHT; // Reset slightly above top for smooth entry
                p.x = Math.random() * (canvas.width - PLATFORM_WIDTH);
                p.type = Math.random() > 0.5 ? 1 : 2; // Randomize type on reset
            }
        });
    }

    // Game Over
    if (player.y > canvas.height) {
        gameOver();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Player
    ctx.drawImage(charImg, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT); // Preloaded, no fallback needed

    // Draw Platforms
    platforms.forEach(p => {
        const img = p.type === 1 ? block1Img : block2Img;
        ctx.drawImage(img, p.x, p.y, PLATFORM_WIDTH, PLATFORM_HEIGHT);
    });
}

function gameLoop() {
    if (gameRunning) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

function gameOver() {
    gameRunning = false;
    updateHistory(score);
    alert(`Game Over! Score: ${score}`);
    location.reload();
}

// --- HISTORY & STATS ---
function updateHistory(newScore) {
    let history = JSON.parse(localStorage.getItem('game002_history')) || [];

    // Update High Score
    let highScore = parseInt(localStorage.getItem('game002_highscore')) || 0;
    if (newScore > highScore) {
        localStorage.setItem('game002_highscore', newScore);
    }

    // Update Recent History (FIFO, newest first)
    history.unshift(newScore);
    if (history.length > 3) history.pop();

    localStorage.setItem('game002_history', JSON.stringify(history));
}
