const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- UI Elements ---
const startScreen = document.getElementById('start-screen');
const hud = document.getElementById('game-hud');
const levelModal = document.getElementById('level-modal');
const gameOverScreen = document.getElementById('game-over-screen');

const nameInput = document.getElementById('player-name');
const idInput = document.getElementById('player-id');
const nameError = document.getElementById('name-error');
const idError = document.getElementById('id-error');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const triviaText = document.getElementById('trivia-text');

// --- Game State ---
let gameState = 'START'; // START, PLAYING, LEVEL_UP, GAME_OVER
let score = 0;
let level = 1;
let frameCount = 0;
let playerName = "";
let speedMultiplier = 1;

// --- Trivia Data (Based on Seamex/ABG facts) ---
const triviaFacts = [
    "Seamex was established in 2017 to provide a seamless HR experience.",
    "Seamex is powered by 'Poornata', the Group's HRMS software.",
    "Seamex acts as a single point of contact for the entire employee lifecycle.",
    "Seamex handles everything from Onboarding to Exit Management.",
    "Seamex is located in Airoli, Navi Mumbai.",
    "Core Value: 'Respect for all' is a key work ethic at Seamex.",
    "Seamex uses 'Cornerstone on Demand' for employee learning.",
    "The Seamex team motto includes 'Acting as One' and 'Taking Accountability'."
];

// --- Resize Handling ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- INPUT VALIDATION ---
function validateInputs() {
    let valid = true;
    const nameVal = nameInput.value.trim();
    const idVal = idInput.value.trim();

    // Name: Letters and spaces only
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameVal || !nameRegex.test(nameVal)) {
        nameError.style.display = 'block';
        valid = false;
    } else {
        nameError.style.display = 'none';
    }

    // ID: Numbers only
    const idRegex = /^[0-9]+$/;
    if (!idVal || !idRegex.test(idVal)) {
        idError.style.display = 'block';
        valid = false;
    } else {
        idError.style.display = 'none';
    }

    return valid ? { name: nameVal, id: idVal } : null;
}

document.getElementById('start-btn').addEventListener('click', () => {
    const data = validateInputs();
    if (data) {
        playerName = data.name;
        startGame();
    }
});

// --- CLASSES ---

class Player {
    constructor() {
        this.size = 50;
        this.x = canvas.width / 2 - this.size / 2;
        this.y = canvas.height - 120;
        // Gradient Color for Player (Seamex "S" style)
        this.color = '#FFC107'; 
    }

    draw() {
        // Draw a rounded rectangle with gradient
        let grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.size);
        grad.addColorStop(0, '#FFC107'); // Amber
        grad.addColorStop(1, '#D32F2F'); // Red
        
        ctx.fillStyle = grad;
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#D32F2F';
        
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.size, this.size, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    moveTo(x, y) {
        this.x = x - this.size / 2;
        // Keep Y fixed or allow movement? Let's allow partial Y movement but keep near bottom
        // For simple dodge gameplay, X axis is most important.
        // Boundary checks
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width - this.size) this.x = canvas.width - this.size;
    }
}

class Enemy {
    constructor() {
        this.size = Math.random() * 30 + 30; // 30-60px
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        // Speed increases with level
        this.speed = (Math.random() * 3 + 3) * speedMultiplier; 
        this.color = '#A01018'; // Seamex Deep Red
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Draw circle enemy for variety
        ctx.arc(this.x + this.size/2, this.y + this.size/2, this.size/2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Simple Confetti Particle
class Confetti {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.color = ['#FFC107', '#D32F2F', '#A01018', '#FFFFFF'][Math.floor(Math.random() * 4)];
        this.size = Math.random() * 8 + 4;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = Math.random() * 2 - 1;
    }
    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        if(this.y > canvas.height) this.y = -10;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// --- GAME LOGIC ---

let player;
let enemies = [];
let confettis = [];
let animationId;

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    gameState = 'PLAYING';
    score = 0;
    level = 1;
    frameCount = 0;
    speedMultiplier = 1;
    
    player = new Player();
    enemies = [];
    confettis = [];
    
    updateHUD();
    animate();
}

function updateHUD() {
    scoreEl.innerText = Math.floor(score);
    levelEl.innerText = level;
}

function levelUp() {
    gameState = 'LEVEL_UP';
    level++;
    speedMultiplier += 0.2; // Increase speed by 20%
    
    // Pick a random trivia fact
    const fact = triviaFacts[(level - 2) % triviaFacts.length];
    triviaText.innerText = fact;
    
    // Generate Confetti
    confettis = [];
    for(let i=0; i<100; i++) confettis.push(new Confetti());
    
    // Show Modal
    levelModal.classList.remove('hidden');
}

document.getElementById('continue-btn').addEventListener('click', () => {
    levelModal.classList.add('hidden');
    gameState = 'PLAYING';
    confettis = []; // Clear confetti
});

document.getElementById('restart-btn').addEventListener('click', startGame);

function checkCollision(p, e) {
    // Circle vs Rect collision approximation
    const distX = Math.abs((p.x + p.size/2) - (e.x + e.size/2));
    const distY = Math.abs((p.y + p.size/2) - (e.y + e.size/2));

    if (distX > (p.size/2 + e.size/2)) { return false; }
    if (distY > (p.size/2 + e.size/2)) { return false; }

    if (distX <= (p.size/2)) { return true; } 
    if (distY <= (p.size/2)) { return true; }

    const dx = distX - p.size/2;
    const dy = distY - p.size/2;
    return (dx*dx + dy*dy <= (e.size/2 * e.size/2));
}

function animate() {
    // If we are in LEVEL_UP state, we still render to show confetti, but stop game updates
    if (gameState === 'GAME_OVER') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'LEVEL_UP') {
        // Draw background game frozen
        player.draw();
        enemies.forEach(e => e.draw());
        
        // Animate Confetti Overlay
        confettis.forEach(c => {
            c.update();
            c.draw();
        });
        
        requestAnimationFrame(animate);
        return;
    }

    if (gameState === 'PLAYING') {
        frameCount++;
        score += 0.1; // Score increases over time
        updateHUD();

        // Level Up Threshold (every 100 points)
        if (Math.floor(score) > 0 && Math.floor(score) % 100 === 0 && Math.floor(score) > (level-1)*100 + 1) {
             // Small debounce to prevent multiple triggers
             levelUp();
             return; // Stop this frame
        }

        // Player
        player.draw();

        // Enemies
        if (frameCount % Math.max(20, 60 - level * 5) === 0) { // Spawn faster as levels go up
            enemies.push(new Enemy());
        }

        enemies.forEach((e, index) => {
            e.update();
            e.draw();

            if (checkCollision(player, e)) {
                endGame();
            }

            if (e.y > canvas.height) enemies.splice(index, 1);
        });
        
        requestAnimationFrame(animate);
    }
}

function endGame() {
    gameState = 'GAME_OVER';
    hud.classList.add('hidden');
    gameCanvas.classList.add('blur'); // Optional css effect
    gameOverScreen.classList.remove('hidden');
    
    document.getElementById('final-name').innerText = playerName;
    document.getElementById('final-score').innerText = Math.floor(score);
}

// --- CONTROLS ---

// Mouse
window.addEventListener('mousemove', (e) => {
    if (gameState === 'PLAYING' && player) {
        player.moveTo(e.clientX, e.clientY);
    }
});

// Touch
window.addEventListener('touchmove', (e) => {
    if (gameState === 'PLAYING' && player) {
        e.preventDefault(); 
        const touch = e.touches[0];
        player.moveTo(touch.clientX, touch.clientY);
    }
}, { passive: false });
