// game.js - Complete, fixed, mobile-friendly endless jumper

const CANVAS_MAX_WIDTH = 450;
const GRAVITY = 0.35; // Gentler
const JUMP_STRENGTH = -13.5; // Stronger base jump
const PLAYER_SPEED = 6;
const POWER_DURATION = 360; // ~6 seconds at 60fps
const PLAYER_SIZE = 60;
const PLATFORM_HEIGHT = 80;

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

let assetsLoaded = 0;
const totalAssets = 3;
function assetLoaded() {
  assetsLoaded++;
  if (assetsLoaded === totalAssets && document.getElementById('loading')) {
    document.getElementById('loading').classList.add('hidden');
  }
}
charImg.onload = charImg.onerror = assetLoaded;
block1Img.onload = block1Img.onerror = assetLoaded;
block2Img.onload = block2Img.onerror = assetLoaded;

// State
let canvas, ctx;
let player, platforms = [], particles = [];
let score = 0, gameRunning = false;
let powerType = 0, powerTimer = 0;
let scoreMult = 1, invincible = false, currentJump = JUMP_STRENGTH;
let leftPressed = false, rightPressed = false;

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  document.getElementById('start-btn').addEventListener('click', handleLogin);
});

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, CANVAS_MAX_WIDTH);
  canvas.height = window.innerHeight;
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
  const expiry = Date.now() + 7776000000; // ~90 days
  localStorage.setItem('game002_user', JSON.stringify({name, pid, expiry}));

  startGame();
}

function startGame() {
  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');

  // Loading message if assets not ready
  if (assetsLoaded < totalAssets) {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.innerText = 'Loading assets...';
    document.body.appendChild(loading);
  }

  resetGame();
  gameRunning = true;
  gameLoop();
}

function resetGame() {
  score = 0; powerType = 0; powerTimer = 0; scoreMult = 1; invincible = false; currentJump = JUMP_STRENGTH;
  particles = []; platforms = [];
  player = {x: canvas.width / 2 - PLAYER_SIZE / 2, y: canvas.height - 200, vy: JUMP_STRENGTH, size: PLAYER_SIZE}; // Auto-start jump

  // Initial platforms
  let y = canvas.height - 100;
  platforms.push({x: canvas.width / 2 - 100, y, width: 200, type: 1, power: 0});
  for (let i = 0; i < 12; i++) {
    y -= 120 + Math.random() * 80;
    const width = Math.random() < 0.3 ? 220 : 140 + Math.random() * 80; // More wide for easier
    const x = 60 + Math.random() * (canvas.width - width - 120); // Safe margins
    const type = Math.random() < 0.5 ? 1 : 2;
    const power = Math.random() < 0.15 ? Math.floor(Math.random() * 4) + 1 : 0;
    platforms.push({x, y, width, type, power});
  }
}

// Controls
canvas.addEventListener('pointerdown', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (x < canvas.width / 2) leftPressed = true;
  else rightPressed = true;
});
canvas.addEventListener('pointerup', () => { leftPressed = rightPressed = false; });
canvas.addEventListener('pointerleave', () => { leftPressed = rightPressed = false; });

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressed = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressed = true;
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressed = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressed = false;
});

function update() {
  // Horizontal movement
  const speed = powerType === 2 ? PLAYER_SPEED * 1.5 : PLAYER_SPEED;
  player.vx = (rightPressed ? speed : 0) - (leftPressed ? speed : 0);
  player.x += player.vx;

  // Screen wrap
  if (player.x < -PLAYER_SIZE) player.x += canvas.width + PLAYER_SIZE;
  if (player.x > canvas.width) player.x -= canvas.width + PLAYER_SIZE;

  // Physics
  player.vy += GRAVITY;
  player.y += player.vy;

  // Power timer
  if (powerTimer > 0) {
    powerTimer--;
    if (powerTimer === 0) {
      powerType = 0; scoreMult = 1; invincible = false; currentJump = JUMP_STRENGTH;
    }
  }

  // Platform collision
  for (let p of platforms) {
    if (player.vy > 0 &&
        player.x + PLAYER_SIZE > p.x &&
        player.x < p.x + p.width &&
        player.y + PLAYER_SIZE > p.y - 20 &&
        player.y + PLAYER_SIZE < p.y + 20) {
      player.y = p.y - PLAYER_SIZE;
      player.vy = powerType === 1 ? currentJump * 1.4 : currentJump;
      burst(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE, '#8B4513', 15); // Landing dust

      if (p.power > 0 && !invincible) { // Don't collect if already powered? Or allow stack — here allow new
        powerType = p.power;
        powerTimer = POWER_DURATION;
        scoreMult = powerType === 4 ? 2 : 1;
        invincible = powerType === 3;
        currentJump = powerType === 1 ? JUMP_STRENGTH * 1.4 : JUMP_STRENGTH;
        burst(player.x + PLAYER_SIZE / 2, player.y, '#FFD700', 80); // Massive gold burst
        p.power = 0;
      }
    }
  }

  // Generate new platforms
  if (platforms[0].y > 100) {
    const last = platforms[0];
    const y = last.y - (120 + Math.random() * 80);
    const width = Math.random() < 0.3 ? 220 : 140 + Math.random() * 80;
    let x = 60 + Math.random() * (canvas.width - width - 120);
    const type = Math.random() < 0.5 ? 1 : 2;
    const power = Math.random() < 0.15 ? Math.floor(Math.random() * 4) + 1 : 0;
    platforms.unshift({x, y, width, type, power});
  }
  // Remove old
  platforms = platforms.filter(p => p.y < canvas.height + 200);

  // Camera follow (keep player lower for visibility)
  const targetY = canvas.height * 0.65;
  if (player.y < targetY) {
    const shift = targetY - player.y;
    player.y = targetY;
    platforms.forEach(p => p.y += shift);
    particles.forEach(p => p.y += shift);
    score += shift * scoreMult; // Distance-based accurate scoring with multiplier
  }

  // Particles update
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);

  // Game over
  if (player.y > canvas.height + 100) gameOver();

  document.getElementById('score-display').innerText = `Score: ${Math.floor(score)}`;
  if (scoreMult > 1) document.getElementById('score-display').innerText += ` (x${scoreMult})`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Platforms
  platforms.forEach(p => {
    const img = p.type === 1 ? block1Img : block2Img;
    ctx.drawImage(img, p.x, p.y - PLATFORM_HEIGHT, p.width, PLATFORM_HEIGHT);

    // Power-up orb (highly visible pulsing)
    if (p.power > 0) {
      const time = Date.now() / 150;
      const radius = 30 + Math.sin(time) * 10;
      ctx.globalAlpha = 0.7 + Math.sin(time) * 0.3;
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y - 40, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFF66';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y - 40, 15, 0, Math.PI * 2);
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

  // Player shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(player.x + 10, player.y + PLAYER_SIZE, PLAYER_SIZE * 0.7, 10);

  // Invincible glow
  if (invincible) {
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 25;
  }
  ctx.drawImage(charImg, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  if (invincible) ctx.shadowBlur = 0;

  // Power banner
  if (powerTimer > 0 && powerType > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, canvas.height - 80, canvas.width - 20, 60);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(POWER_NAMES[powerType], canvas.width / 2, canvas.height - 35);
  }
}

function burst(x, y, color, count = 30) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      color,
      life: 30
    });
  }
}

function burstConfetti(x, y) {
  const colors = ['#ff0044', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#ff00ff'];
  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 7;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      color: colors[i % colors.length],
      life: 50
    });
  }
}

function gameLoop() {
  if (!gameRunning) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  gameRunning = false;

  const highScoreOld = parseInt(localStorage.getItem('game002_highscore') || '0');
  const isNewHigh = score > highScoreOld;

  if (isNewHigh) {
    localStorage.setItem('game002_highscore', Math.floor(score));
    burstConfetti(canvas.width / 2, canvas.height / 2);
  }

  // Update history
  let history = JSON.parse(localStorage.getItem('game002_history') || '[]');
  history.unshift(Math.floor(score));
  history = history.slice(0, 3);
  localStorage.setItem('game002_history', JSON.stringify(history));

  setTimeout(() => {
    const trivia = trivias[Math.floor(Math.random() * trivias.length)];
    alert(`Game Over!\nYour Score: ${Math.floor(score)}${isNewHigh ? ' (NEW HIGH SCORE!)' : ''}\n\nDid you know?\n${trivia}\n\nTap OK to play again!`);
    location.reload();
  }, isNewHigh ? 1000 : 100); // Longer delay for confetti
}
