/* Project: Jump Master (game002)
   Fully Fixed & Optimized Version
*/

const CANVAS_MAX_WIDTH = 450;
const GRAVITY = 0.4;
const JUMP_STRENGTH = -12;
const EXPIRY_MS = 7776000000; // 90 days
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 30;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const INITIAL_PLATFORM_SPACING = 120;

// --- ASSETS ---
const charImg = new Image();
charImg.src = 'character.png';

const block1Img = new Image();
block1Img.src = 'block-1.png';

const block2Img = new Image();
block2Img.src = 'block-2.png';

let assetsLoaded = 0;
const totalAssets = 3;

function incrementLoaded() {
    assetsLoaded++;
}

// --- STATE ---
let canvas, ctx;
let player = null; // Will be initialized after canvas
let platforms = [];
let score = 0;
let gameRunning = false;
let currentUser = null;

// --- DOM READY ---
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Now safe to proceed
    checkSession();

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', handleLogin);
    }

    // Preload images
    charImg.onload = incrementLoaded;
    block1Img.onload = incrementLoaded;
    block2Img.onload = incrementLoaded;

    // Handle errors gracefully
    charImg.onerror = () => incrementLoaded();
    block1Img.onerror = () => incrementLoaded();
    block2Img.onerror = () => incrementLoaded();
});

// --- AUTH ---
const nameRegex = /^[A-Za-z\s]+$/;
const pidRegex = /^[0-9]+$/;

function handleLogin() {
    const name = document.getElementById('username').value.trim();
    const pid = document.getElementById('poornataId').value.trim();
    const errorMsg = document.getElementById('error-msg');

    if (!name || !nameRegex.test(name)) {
        errorMsg.textContent = "Error: Name must contain alphabets only.";
        errorMsg.classList.remove('hidden');
        return;
    }
    if (!pid || !pidRegex.test(pid)) {
        errorMsg.textContent = "Error: Poornata ID must be numeric.";
        errorMsg.classList.remove('hidden');
        return;
    }

    errorMsg.classList.add('hidden');

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
    }
    // If no session or expired → stay on login screen (already visible)
}

// --- GAME START ---
function startGame(user) {
    currentUser = user;

    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    // Set canvas size
    resizeCanvas();

    // Wait for assets, then start
    waitForAssets();
}

function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth, CANVAS_MAX_WIDTH);
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
    if (currentUser) {
        resizeCanvas();
        if (gameRunning) {
            resetGame(); // Keep game state consistent on resize
        }
    }
});

function waitForAssets() {
    if (assetsLoaded >= totalAssets) {
        resetGame();
        setupInputListeners(); // Add only once
        gameRunning = true;
        requestAnimationFrame(gameLoop);
    } else {
        setTimeout(waitForAssets, 100);
    }
}

// --- INPUT (Added only once) ---
function setupInputListeners() {
    window.addEventListener('mousedown', handleInput);
    window.addEventListener('touchstart', handleInput, { passive: false });
    window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

function handleInput(e) {
    e.preventDefault();

    if (!gameRunning) {
        // Tap/click to restart after game over
        resetGame();
        gameRunning = true;
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!player) return; // Safety

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const midPoint = canvas.width / 2;

    player.vx = clientX < midPoint ? -7 : 7;
}

// --- GAME LOGIC ---
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

    // Starting platform
    platforms.push({
        x: canvas.width / 2 - PLATFORM_WIDTH / 2,
        y: canvas.height - 50,
        type: 1
    });

    // Initial platforms above
    for (let i = 0; i < 6; i++) {
        spawnPlatform(canvas.height - 150 - i * INITIAL_PLATFORM_SPACING);
    }
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

    player.vx *= 0.9; // Air friction

    // Wrap around screen
    if (player.x + PLAYER_WIDTH < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -PLAYER_WIDTH;

    // Landing on platforms
    if (player.vy > 0) {
        for (const p of platforms) {
            if (
                player.x < p.x + PLATFORM_WIDTH &&
                player.x + PLAYER_WIDTH > p.x &&
                player.y + PLAYER_HEIGHT > p.y &&
                player.y + PLAYER_HEIGHT < p.y + PLATFORM_HEIGHT
            ) {
                player.vy = JUMP_STRENGTH;
            }
        }
    }

    // Scroll when player goes above center
    const centerY = canvas.height / 2;
    if (player.y < centerY) {
        const scrollAmount = centerY - player.y;
        player.y = centerY;
        score += Math.floor(scrollAmount);
        document.getElementById('score-display').innerText = `Score: ${score}`;

        platforms.forEach(p => {
            p.y += scrollAmount;
            if (p.y > canvas.height) {
                p.y = -PLATFORM_HEIGHT;
                p.x = Math.random() * (canvas.width - PLATFORM_WIDTH);
                p.type = Math.random() > 0.5 ? 1 : 2;
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

    // Player
    ctx.drawImage(charImg, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);

    // Platforms
    platforms.forEach(p => {
        const img = p.type === 1 ? block1Img : block2Img;
        ctx.drawImage(img, p.x, p.y, PLATFORM_WIDTH, PLATFORM_HEIGHT);
    });
}

function gameLoop() {
    if (!gameRunning) return;

    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    updateHistory(score);
    alert(`Game Over! Your Score: ${score}`);
    // Remove input listeners temporarily to prevent errors during alert
    window.removeEventListener('mousedown', handleInput);
    window.removeEventListener('touchstart', handleInput);
    setTimeout(() => {
        location.reload(); // Simple restart
    }, 500);
}

// --- HISTORY ---
function updateHistory(newScore) {
    let history = JSON.parse(localStorage.getItem('game002_history')) || [];

    let highScore = parseInt(localStorage.getItem('game002_highscore')) || 0;
    if (newScore > highScore) {
        localStorage.setItem('game002_highscore', newScore);
    }

    history.unshift(newScore);
    if (history.length > 3) history.pop();

    localStorage.setItem('game002_history', JSON.stringify(history));
}
