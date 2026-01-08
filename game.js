/* Project: Jump Master (game002) - ENGAGED EDITION
   Features: Power-ups, Particles, Confetti, ABG Trivia, Parallax Clouds, Glows, Easier Gameplay
*/

const CANVAS_MAX_WIDTH = 450;
const GRAVITY = 0.35; // Slightly easier
const JUMP_STRENGTH = -13; // Stronger jump
const EXPIRY_MS = 7776000000;
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 30;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const INITIAL_PLATFORM_SPACING = 110; // Closer for easier jumps

// Power-up duration (frames ~10s @60fps)
const POWER_DURATION = 600;

// --- ASSETS ---
const charImg = new Image(); charImg.src = 'character.png';
const block1Img = new Image(); block1Img.src = 'block-1.png';
const block2Img = new Image(); block2Img.src = 'block-2.png';

let assetsLoaded = 0;
const totalAssets = 3;

function incrementLoaded() { assetsLoaded++; }

// --- ABG TRIVIA ---
const trivias = [
  "The Aditya Birla Group traces its roots to 1857 in Pilani, Rajasthan!",
  "Grasim Industries was set up just 10 days after India's independence in 1947!",
  "In 1969, Aditya Vikram Birla created India's first multinational in Thailand!",
  "ABG operates in 36+ countries with over 140,000 employees!",
  "A US$67 billion Fortune 500 conglomerate!",
  "Global leader in viscose staple fibre & carbon black!",
  "World's largest copper smelter in Dahej, Gujarat!",
  "Employs 42 nationalities worldwide!",
  "47 brands across 14 sectors!",
  "Market cap over $100 billion!",
  "From cotton trading to metals, cement, telecom & fashion!"
];

// --- STATE ---
let canvas, ctx;
let player = null;
let platforms = [];
let clouds = [];
let particles = [];
let score = 0;
let gameRunning = false;
let gamePaused = false;
let showTrivia = false;
let triviaText = '';
let triviaLevel = 0;
let powerType = 0;
let powerTime = 0;
let powerName = '';
let currentJumpStrength = JUMP_STRENGTH;
let vxMult = 1;
let invincible = false;
let scoreMult = 1;
let currentUser = null;

// --- DOM READY ---
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  checkSession();
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.addEventListener('click', handleLogin);

  // Assets
  charImg.onload = incrementLoaded; charImg.onerror = incrementLoaded;
  block1Img.onload = incrementLoaded; block1Img.onerror = incrementLoaded;
  block2Img.onload = incrementLoaded; block2Img.onerror = incrementLoaded;
});

// --- AUTH (unchanged) ---
const nameRegex = /^[A-Za-z\s]+$/;
const pidRegex = /^[0-9]+$/;

function handleLogin() {
  const name = document.getElementById('username').value.trim();
  const pid = document.getElementById('poornataId').value.trim();
  const errorMsg = document.getElementById('error-msg');

  if (!name || !nameRegex.test(name)) {
    errorMsg.textContent = "Error: Name must contain alphabets only.";
    errorMsg.classList.remove('hidden'); return;
  }
  if (!pid || !pidRegex.test(pid)) {
    errorMsg.textContent = "Error: Poornata ID must be numeric.";
    errorMsg.classList.remove('hidden'); return;
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
}

// --- GAME START ---
function startGame(user) {
  currentUser = user;
  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');
  resizeCanvas();
  waitForAssets();
}

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, CANVAS_MAX_WIDTH);
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
  if (currentUser) {
    resizeCanvas();
    if (gameRunning) resetGame();
  }
});

function waitForAssets() {
  if (assetsLoaded >= totalAssets) {
    resetGame();
    setupInputListeners();
    gameRunning = true;
    requestAnimationFrame(gameLoop);
  } else {
    setTimeout(waitForAssets, 100);
  }
}

function setupInputListeners() {
  window.addEventListener('mousedown', handleInput);
  window.addEventListener('touchstart', handleInput, { passive: false });
  window.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
}

// --- INPUT ---
function handleInput(e) {
  e.preventDefault();
  if (!canvas || !player) return;

  if (gamePaused || showTrivia) {
    gamePaused = false;
    showTrivia = false;
    return;
  }

  if (!gameRunning) {
    resetGame();
    gameRunning = true;
    requestAnimationFrame(gameLoop);
    return;
  }

  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  const midPoint = canvas.width / 2;
  player.vx = (clientX < midPoint ? -7 : 7) * vxMult;
}

// --- RESET ---
function resetGame() {
  player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: canvas.height - 150,
    vx: 0,
    vy: 0
  };
  platforms = [];
  clouds = [];
  particles = [];
  score = 0;
  triviaLevel = 0;
  powerType = 0;
  powerTime = 0;
  powerName = '';
  currentJumpStrength = JUMP_STRENGTH;
  vxMult = 1;
  invincible = false;
  scoreMult = 1;
  gamePaused = false;
  showTrivia = false;
  document.getElementById('score-display').innerText = `Score: ${score}`;

  // Starting wide platform
  platforms.push({ x: canvas.width / 2 - 60, y: canvas.height - 50, type: 0, width: 120 });

  // Initial platforms (more for easier start)
  for (let i = 0; i < 8; i++) {
    spawnPlatform(canvas.height - 150 - i * INITIAL_PLATFORM_SPACING);
  }

  // Clouds (3 layers)
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 4; i++) {
      clouds.push({
        x: Math.random() * (canvas.width + 200),
        y: 80 + layer * 120 + Math.random() * 40,
        size: 20 + Math.random() * 30,
        speed: 0.15 + layer * 0.1
      });
    }
  }
}

function spawnPlatform(y) {
  const rand = Math.random();
  let type, width = PLATFORM_WIDTH;
  if (rand < 0.12) {
    type = 0; width = 120; // Wide safe
  } else if (rand < 0.17) {
    type = 3; width = PLATFORM_WIDTH; // Power-up
  } else {
    type = Math.random() > 0.5 ? 1 : 2;
    width = PLATFORM_WIDTH;
  }
  platforms.push({ x: Math.random() * (canvas.width - width), y, type, width });
}

// --- UPDATE ---
function update() {
  // Player physics
  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;
  player.vx *= 0.9;

  // Wrap around
  if (player.x + PLAYER_WIDTH < 0) player.x = canvas.width;
  if (player.x > canvas.width) player.x = -PLAYER_WIDTH;

  // Platforms collision (falling only)
  if (player.vy > 0) {
    for (const p of platforms) {
      if (
        player.x < p.x + p.width &&
        player.x + PLAYER_WIDTH > p.x &&
        player.y + PLAYER_HEIGHT > p.y &&
        player.y + PLAYER_HEIGHT < p.y + PLATFORM_HEIGHT
      ) {
        player.vy = currentJumpStrength;
        // Land particles
        burst(player.x + PLAYER_WIDTH / 2, player.y + PLAYER_HEIGHT, '#4CAF50', 12);
        // Power-up?
        if (p.type === 3) {
          burst(p.x + p.width / 2, p.y + 15, '#FFD700', 16);
          activatePower();
          p.type = 1; // Consume
        }
        break;
      }
    }
  }

  // Trail particles (when jumping up)
  if (player.vy < -2) {
    addParticle(
      player.x + PLAYER_WIDTH / 2 + (Math.random() - 0.5) * 10,
      player.y + PLAYER_HEIGHT,
      (Math.random() - 0.5) * 2,
      Math.random() * -1,
      'rgba(255,255,255,0.6)',
      3
    );
  }

  // Scroll (center player)
  const centerY = canvas.height / 2;
  if (player.y < centerY) {
    const scrollAmount = centerY - player.y;
    player.y = centerY;
    score += Math.floor(scrollAmount * scoreMult);
    document.getElementById('score-display').innerText = `Score: ${score}`;

    // Move platforms
    platforms.forEach(p => {
      p.y += scrollAmount;
      if (p.y > canvas.height) {
        p.y = -PLATFORM_HEIGHT;
        p.x = Math.random() * (canvas.width - p.width);
        // Respawn type
        const rand = Math.random();
        if (rand < 0.12) p.type = 0;
        else if (rand < 0.17) p.type = 3;
        else p.type = Math.random() > 0.5 ? 1 : 2;
      }
    });

    // Trivia check
    const newTriviaLevel = Math.floor(score / 500);
    if (newTriviaLevel > triviaLevel) {
      triviaLevel = newTriviaLevel;
      gamePaused = true;
      showTrivia = true;
      triviaText = trivias[Math.floor(Math.random() * trivias.length)];
    }
  }

  // Clouds scroll
  clouds.forEach(c => {
    c.x -= c.speed;
    if (c.x < -100) c.x = canvas.width + Math.random() * 200;
  });

  // Particles update
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // Light gravity
    p.life--;
    p.alpha = p.life / 30;
    return p.life > 0;
  });

  // Power-up timer
  if (powerTime > 0) {
    powerTime--;
    if (powerTime <= 0) {
      deactivatePower();
    }
  }

  // Game Over
  if (player.y > canvas.height && !invincible) {
    gameOver();
  }
}

function activatePower() {
  powerType = Math.floor(Math.random() * 4) + 1;
  powerTime = POWER_DURATION;
  switch (powerType) {
    case 1:
      powerName = 'Super Jump!';
      currentJumpStrength = -16;
      break;
    case 2:
      powerName = 'Speed Boost!';
      vxMult = 1.5;
      break;
    case 3:
      powerName = 'Shield Active!';
      invincible = true;
      break;
    case 4:
      powerName = 'x2 Score!';
      scoreMult = 2;
      break;
  }
}

function deactivatePower() {
  powerName = '';
  currentJumpStrength = JUMP_STRENGTH;
  vxMult = 1;
  invincible = false;
  scoreMult = 1;
}

// --- DRAW ---
function draw() {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(1, '#E0F6FF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  clouds.forEach(c => {
    drawCloud(c.x, c.y, c.size);
  });

  // Platforms
  platforms.forEach(p => {
    if (p.type === 3) {
      // Power orb glow
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 15, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Base
      ctx.drawImage(block1Img, p.x, p.y, p.width, PLATFORM_HEIGHT);
    } else if (p.type === 0) {
      // Wide platform
      ctx.drawImage(block1Img, p.x, p.y, 60, PLATFORM_HEIGHT);
      ctx.drawImage(block1Img, p.x + 60, p.y, 60, PLATFORM_HEIGHT);
    } else {
      const img = p.type === 1 ? block1Img : block2Img;
      ctx.drawImage(img, p.x, p.y, p.width, PLATFORM_HEIGHT);
    }
  });

  // Particles
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
  });

  // Player shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(player.x + 8, player.y + PLAYER_HEIGHT - 8, PLAYER_WIDTH * 0.8, 8);

  // Player glow if invincible
  if (invincible) {
    ctx.save();
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
  }
  ctx.drawImage(charImg, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  if (invincible) ctx.restore();

  // UI
  ctx.textAlign = 'left';
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`Score: ${score}`, 20, 35);

  if (scoreMult > 1) {
    ctx.fillStyle = 'gold';
    ctx.fillText(`x${scoreMult}`, canvas.width - 120, 35);
  }

  // Power banner
  if (powerName) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(20, canvas.height - 80, canvas.width - 40, 60);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(powerName, canvas.width / 2, canvas.height - 45);
    ctx.font = '16px Arial';
    ctx.fillText('Active!', canvas.width / 2, canvas.height - 25);
  }

  // Trivia overlay
  if (showTrivia) {
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Trivia Time!', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '22px Arial';
    ctx.fillText(triviaText, canvas.width / 2, canvas.height / 2 + 10);
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Tap anywhere to continue', canvas.width / 2, canvas.height / 2 + 70);
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - size / 2, y - size / 3, size * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size / 2, y - size / 3, size * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function addParticle(x, y, vx, vy, color, size) {
  particles.push({ x, y, vx, vy, color, size, life: 30, alpha: 1 });
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    addParticle(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * -speed + (Math.random() - 0.5) * 2,
      color,
      3 + Math.random() * 4
    );
  }
}

function burstConfetti(centerX, centerY, count = 80) {
  const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 3 + Math.random() * 4;
    addParticle(
      centerX,
      centerY,
      Math.cos(angle) * speed,
      Math.sin(angle) * -speed,
      colors[i % 6],
      4 + Math.random() * 6
    );
  }
}

// --- LOOP ---
function gameLoop() {
  if (gameRunning) {
    if (!gamePaused) update();
    draw();
    requestAnimationFrame(gameLoop);
  }
}

// --- GAME OVER ---
function gameOver() {
  gameRunning = false;
  updateHistory(score);

  // Confetti if new high score
  const highScore = parseInt(localStorage.getItem('game002_highscore')) || 0;
  if (score > highScore) {
    burstConfetti(canvas.width / 2, canvas.height / 2);
  }

  setTimeout(() => {
    alert(`Game Over! Your Score: ${score}`);
    location.reload();
  }, 300);
}

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
