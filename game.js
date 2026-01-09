// game.js - All issues fixed
// 1. No undefined addEventListener (listeners added safely after elements exist)
// 2. Proper touch/mouse controls (follows finger/mouse with pointer events)
// 3. Platforms spaced properly (larger gaps, no stacking, safe random x)
// 4. Pause button small, orange, fixed position
// 5. Removed player shadow line
// 6. Confetti ONLY on new high score at game over
// 7. Game over overlay with score, trivia, native share (with Poornata link), restart
// Other: Larger gaps for easier play, level-based difficulty, cloud parallax

const CANVAS_MAX_WIDTH = 450;
const GRAVITY_BASE = 0.35;
const JUMP_STRENGTH = -13.5;
const PLAYER_SPEED = 6;
const POWER_DURATION = 360;
const PLAYER_SIZE = 60;
const PLATFORM_HEIGHT = 100;

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

const POWER_NAMES = ["", "SUPER JUMP!", "SPEED BOOST!", "SHIELD!", "x2 SCORE!"];

// Assets
const charImg = new Image(); charImg.src = 'character.png';
const block1Img = new Image(); block1Img.src = 'block-1.png';
const block2Img = new Image(); block2Img.src = 'block-2.png';

// State
let canvas, ctx;
let player, platforms = [], particles = [], clouds = [];
let score = 0, level = 1, gameRunning = false, paused = false;
let powerType = 0, powerTimer = 0;
let scoreMult = 1, invincible = false;
let activePointerId = null;
let leftPressed = false, rightPressed = false;

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Safe listeners (elements exist)
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const shareBtn = document.getElementById('share-btn');
  const restartBtn = document.getElementById('restart-btn');

  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  if (resumeBtn) resumeBtn.addEventListener('click', togglePause);
  if (shareBtn) shareBtn.addEventListener('click', shareScore);
  if (restartBtn) restartBtn.addEventListener('click', () => location.reload());

  checkSession();
});

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, CANVAS_MAX_WIDTH);
  canvas.height = window.innerHeight;
}

function checkSession() {
  const userStr = localStorage.getItem('game002_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.expiry > Date.now()) {
        startGame();
        return;
      }
    } catch (e) {}
  }
  document.getElementById('start-btn').addEventListener('click', handleLogin);
}

function handleLogin() {
  const name = document.getElementById('username').value.trim();
  const pid = document.getElementById('poornataId').value.trim();
  const errorMsg = document.getElementById('error-msg');

  if (!/^[A-Za-z\s]+$/.test(name)) {
    errorMsg.textContent = "Error: Name must contain alphabets only.";
    errorMsg.classList.remove('hidden'); return;
  }
  if (!/^[0-9]+$/.test(pid)) {
    errorMsg.textContent = "Error: Poornata ID must be numeric.";
    errorMsg.classList.remove('hidden'); return;
  }

  errorMsg.classList.add('hidden');
  const expiry = Date.now() + 7776000000;
  localStorage.setItem('game002_user', JSON.stringify({name, pid, expiry}));
  startGame();
}

function startGame() {
  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');
  resetGame();
  setupControls();
  gameRunning = true;
  gameLoop();
}

function setupControls() {
  canvas.addEventListener('pointerdown', e => {
    activePointerId = e.pointerId;
    updateDirection(e);
  });

  canvas.addEventListener('pointermove', e => {
    if (e.pointerId === activePointerId) updateDirection(e);
  });

  canvas.addEventListener('pointerup', () => {
    leftPressed = rightPressed = false;
    activePointerId = null;
  });

  canvas.addEventListener('pointercancel', () => {
    leftPressed = rightPressed = false;
    activePointerId = null;
  });
}

function updateDirection(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  leftPressed = x < canvas.width / 2;
  rightPressed = x >= canvas.width / 2;
}

function resetGame() {
  score = 0; level = 1; powerType = 0; powerTimer = 0; scoreMult = 1; invincible = false; paused = false;
  particles = []; platforms = []; clouds = [];

  player = { x: canvas.width / 2 - PLAYER_SIZE / 2, y: canvas.height * 0.8, vy: 0, size: PLAYER_SIZE };

  // Clouds
  for (let i = 0; i < 12; i++) {
    clouds.push({ x: Math.random() * canvas.width * 1.5 - canvas.width * 0.25, y: Math.random() * canvas.height * 0.5, size: 40 + Math.random() * 40 });
  }

  // Initial platforms (more spaced)
  let lastY = canvas.height - 100;
  platforms.push({ x: canvas.width / 2 - 100, y: lastY, width: 220, type: 1, power: 0 });
  for (let i = 0; i < 12; i++) {
    lastY = generateNextPlatform(lastY);
  }
}

function generateNextPlatform(prevY) {
  const minGap = 140 + level * 5;
  const gap = minGap + Math.random() * 100;
  const y = prevY - gap;
  const width = Math.random() < 0.35 ? 240 : 160 + Math.random() * 100;
  const x = 40 + Math.random() * (canvas.width - width - 80); // Strong safe margins
  const type = Math.random() < 0.5 ? 1 : 2;
  const power = Math.random() < 0.15 ? Math.floor(Math.random() * 4) + 1 : 0;
  platforms.push({ x, y, width, type, power });
  return y;
}

function togglePause() {
  if (!gameRunning) return;
  paused = !paused;
  document.getElementById('pause-btn').innerText = paused ? 'Resume' : 'Pause';
  if (paused) {
    const trivia = trivias[Math.floor(Math.random() * trivias.length)];
    document.getElementById('pause-trivia').innerText = trivia;
    document.getElementById('paused-overlay').classList.remove('hidden');
  } else {
    document.getElementById('paused-overlay').classList.add('hidden');
  }
}

function shareScore() {
  const text = `I scored ${Math.floor(score)} in Jump Master! 🎉\nDownload Poornata App now: https://onelink.to/6kpm3g`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    prompt("Copy & share your score:", text);
  }
}

function update() {
  // Level progression
  const newLevel = Math.floor(score / 1000) + 1;
  if (newLevel > level) {
    level = newLevel;
    document.getElementById('level-display').innerText = `Level: ${level}`;
    burst(player.x + PLAYER_SIZE / 2, player.y, '#FFD700', 30); // Small celebration
  }

  // Movement
  const speed = powerType === 2 ? PLAYER_SPEED * 1.6 : PLAYER_SPEED;
  player.x += (rightPressed ? speed : 0) - (leftPressed ? speed : 0);

  // Wrap
  if (player.x < -PLAYER_SIZE) player.x += canvas.width + PLAYER_SIZE;
  if (player.x > canvas.width) player.x -= canvas.width + PLAYER_SIZE;

  // Physics
  const gravity = GRAVITY_BASE + (level - 1) * 0.015;
  player.vy += gravity;
  player.y += player.vy;

  // Power timer
  if (powerTimer > 0) {
    powerTimer--;
    if (powerTimer === 0) {
      powerType = 0; scoreMult = 1; invincible = powerType === 3 ? false : invincible;
    }
  }

  // Collision
  let landed = false;
  for (let p of platforms) {
    if (player.vy > 0 &&
        player.x + PLAYER_SIZE > p.x + 20 &&
        player.x < p.x + p.width - 20 &&
        player.y + PLAYER_SIZE > p.y - 20 &&
        player.y + PLAYER_SIZE < p.y + 10) {
      player.y = p.y - PLAYER_SIZE;
      player.vy = powerType === 1 ? JUMP_STRENGTH * 1.5 : JUMP_STRENGTH;
      landed = true;
      burst(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE, '#8B4513', 15);

      if (p.power > 0) {
        powerType = p.power;
        powerTimer = POWER_DURATION;
        scoreMult = powerType === 4 ? 2 : 1;
        invincible = powerType === 3;
        burst(player.x + PLAYER_SIZE / 2, player.y, '#FFD700', 80);
        p.power = 0;
      }
    }
  }

  // Generate new platforms
  const topPlatform = platforms[platforms.length - 1];
  if (topPlatform && topPlatform.y > player.y - canvas.height * 0.8) {
    generateNextPlatform(topPlatform.y);
  }

  // Remove old
  platforms = platforms.filter(p => p.y < player.y + canvas.height + 300);

  // Camera follow
  const targetY = canvas.height * 0.65;
  if (player.y < targetY) {
    const shift = targetY - player.y;
    player.y = targetY;
    platforms.forEach(p => p.y += shift);
    clouds.forEach(c => c.y += shift * 0.25);
    particles.forEach(p => p.y += shift);
    score += shift * scoreMult;
  }

  // Clouds drift
  clouds.forEach(c => {
    c.x -= 0.4;
    if (c.x < -100) c.x += canvas.width + 200;
  });

  // Particles
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);

  // UI
  document.getElementById('score-display').innerText = `Score: ${Math.floor(score)}${scoreMult > 1 ? ' (x' + scoreMult + ')' : ''}`;

  // Game over
  if (player.y > canvas.height + 100) gameOver();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  clouds.forEach(c => drawCloud(c.x, c.y, c.size));

  // Platforms
  platforms.forEach(p => {
    const img = p.type === 1 ? block1Img : block2Img;
    if (img.complete && img.naturalHeight) {
      ctx.drawImage(img, p.x, p.y - PLATFORM_HEIGHT, p.width, PLATFORM_HEIGHT);
    } else {
      ctx.fillStyle = p.type === 1 ? '#90EE90' : '#D2B48C';
      ctx.fillRect(p.x, p.y - 40, p.width, 40);
      ctx.fillStyle = '#228B22';
      ctx.fillRect(p.x, p.y - 60, p.width, 20);
    }

    if (p.power > 0) {
      const time = Date.now() / 150;
      const r = 30 + Math.sin(time) * 10;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y - 50, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFF66';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y - 50, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
    ctx.globalAlpha = 1;
  });

  // Invincible glow
  if (invincible) {
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 30;
  }

  // Player
  if (charImg.complete && charImg.naturalHeight) {
    ctx.drawImage(charImg, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  } else {
    ctx.fillStyle = '#00CED1';
    ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  }

  if (invincible) ctx.shadowBlur = 0;

  // Power banner
  if (powerTimer > 0 && powerType > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, canvas.height - 90, canvas.width - 20, 70);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(POWER_NAMES[powerType], canvas.width / 2, canvas.height - 40);
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.7, y, size * 0.8, 0, Math.PI * 2);
  ctx.arc(x - size * 0.7, y, size * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function addParticle(x, y, vx, vy, color, life = 30) {
  particles.push({x, y, vx, vy, color, life});
}

function burst(x, y, color, count = 30) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2, color);
  }
}

function burstConfetti(x, y) {
  const colors = ['#ff0044', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#ff00ff'];
  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 7;
    addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 5, colors[i % colors.length], 60);
  }
}

function gameLoop() {
  if (gameRunning && !paused) update();
  draw();
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  gameRunning = false;

  const highScoreOld = parseInt(localStorage.getItem('game002_highscore') || '0');
  const isNewHigh = Math.floor(score) > highScoreOld;

  if (isNewHigh) {
    localStorage.setItem('game002_highscore', Math.floor(score));
    burstConfetti(canvas.width / 2, canvas.height / 2);
  }

  // History
  let history = JSON.parse(localStorage.getItem('game002_history') || '[]');
  history.unshift(Math.floor(score));
  history = history.slice(0, 3);
  localStorage.setItem('game002_history', JSON.stringify(history));

  // Show overlay
  document.getElementById('final-score').innerText = `Your Score: ${Math.floor(score)}${isNewHigh ? ' (NEW HIGH SCORE!)' : ''}`;
  document.getElementById('gameover-trivia').innerText = trivias[Math.floor(Math.random() * trivias.length)];
  document.getElementById('gameover-overlay').classList.remove('hidden');
}
