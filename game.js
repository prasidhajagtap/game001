/* game.js - FINAL VERSION (All fixes applied)
   Key Changes in this version:
   - Sizes increased + dynamic scaling for better visibility on all screens (no "zoomed out" feel)
   - Platforms avoid edges (safe margins) → less frustrating randomness, no overlap issues
   - Power-ups: Larger pulsing gold orb (very visible), massive particle burst on collect
   - Trivia: ONLY on game over (with random Aditya Birla Group fact)
   - Confetti/Particles: Normal particles reduced, colourful confetti burst ONLY on new high score at death
   - Player positioned lower on screen for better landing visibility & upcoming platform planning
   - Easier & more engaging overall
*/

const CANVAS_MAX_WIDTH = 450;
const GRAVITY = 0.35;
const JUMP_STRENGTH = -13.5;
const EXPIRY_MS = 7776000000;
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
  document.getElementById('start-btn')?.addEventListener('click', handleLogin);

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
}

function handleInput(e) {
  e.preventDefault();
  if (!player) return;

  if (!gameRunning) {
    resetGame();
    gameRunning = true;
    requestAnimationFrame(gameLoop);
    return;
  }

  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  const midPoint = canvas.width / 2;
  player.vx = (clientX < midPoint ? -8 : 8) * vxMult;
}

// --- SIZES (Dynamic for visibility) ---
function getSizes() {
  const scale = canvas.width / 400;
  return {
    playerSize: Math.max(60 * scale, 50),
    platformWidth: Math.max(110 * scale, 90),
    wideWidth: Math.max(170 * scale, 140),
    platformHeight: 30 * scale,
    orbRadius: 18 * scale,
    spacing: 105 * scale
  };
}

// --- RESET ---
function resetGame() {
  const s = getSizes();
  player = {
    x: canvas.width / 2 - s.playerSize / 2,
    y: canvas.height - 200,
    vx: 0,
    vy: 0
  };
  platforms = [];
  clouds = [];
  particles = [];
  score = 0;
  powerType = 0;
  powerTime = 0;
  powerName = '';
  currentJumpStrength = JUMP_STRENGTH;
  vxMult = 1;
  invincible = false;
  scoreMult = 1;
  document.getElementById('score-display').innerText = `Score: ${score}`;

  // Starter wide platform
  platforms.push({ x: canvas.width / 2 - s.wideWidth / 2, y: canvas.height - 50, type: 0, width: s.wideWidth });

  // Initial platforms
  for (let i = 0; i < 9; i++) {
    spawnPlatform(canvas.height - 180 - i * s.spacing);
  }

  // Clouds
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * (canvas.width + 200) - 100,
        y: 100 + layer * 140,
        size: 30 + Math.random() * 40,
        speed: 0.2 + layer * 0.15
      });
    }
  }
}

function spawnPlatform(y) {
  const s = getSizes();
  const margin = 50;
  const maxX = canvas.width - s.platformWidth - margin;
  const minX = margin;
  const x = minX + Math.random() * (maxX - minX);

  const rand = Math.random();
  let type, width = s.platformWidth;
  if (rand < 0.15) { type = 0; width = s.wideWidth; } // 15% wide safe
  else if (rand < 0.30) { type = 3; } // 15% power-up (more visible/rewarding)
  else { type = Math.random() > 0.5 ? 1 : 2; }

  platforms.push({ x, y, type, width });
}

// --- UPDATE ---
function update() {
  const s = getSizes();

  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;
  player.vx *= 0.9;

  if (player.x + s.playerSize < 0) player.x = canvas.width;
  if (player.x > canvas.width) player.x = -s.playerSize;

  // Collision
  if (player.vy > 0) {
    for (const p of platforms) {
      if (
        player.x < p.x + p.width &&
        player.x + s.playerSize > p.x &&
        player.y + s.playerSize > p.y &&
        player.y + s.playerSize < p.y + s.platformHeight
      ) {
        player.vy = currentJumpStrength;
        burst(player.x + s.playerSize / 2, player.y + s.playerSize, '#4CAF50', 10);
        if (p.type === 3) {
          burst(p.x + p.width / 2, p.y, '#FFD700', 30); // BIG collection effect
          activatePower();
          p.type = 1;
        }
        break;
      }
    }
  }

  // Light jump trail
  if (player.vy < -3) {
    addParticle(player.x + s.playerSize / 2, player.y + s.playerSize, (Math.random() - 0.5) * 2, 1, 'rgba(255,255,255,0.5)', 4);
  }

  // Scroll - player lower on screen for better visibility
  const playerTargetY = canvas.height * 0.65; // Lower = more space above for planning
  if (player.y < playerTargetY) {
    const scrollAmount = playerTargetY - player.y;
    player.y = playerTargetY;
    score += Math.floor(scrollAmount * scoreMult);
    document.getElementById('score-display').innerText = `Score: ${score}`;

    platforms.forEach(p => {
      p.y += scrollAmount;
      if (p.y > canvas.height) {
        spawnPlatform(-s.platformHeight); // Reuse slot with new platform
      }
    });
  }

  // Clouds
  clouds.forEach(c => {
    c.x -= c.speed;
    if (c.x < -150) c.x = canvas.width + 100;
  });

  // Particles
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life--;
    return p.life > 0;
  });

  // Power timer
  if (powerTime > 0) {
    powerTime--;
    if (powerTime <= 0) deactivatePower();
  }

  if (player.y > canvas.height && !invincible) gameOver();
}

// --- POWER UPS ---
function activatePower() {
  powerType = Math.floor(Math.random() * 4) + 1;
  powerTime = POWER_DURATION;
  switch (powerType) {
    case 1: powerName = 'SUPER JUMP!'; currentJumpStrength = -17; break;
    case 2: powerName = 'SPEED BOOST!'; vxMult = 1.6; break;
    case 3: powerName = 'SHIELD!'; invincible = true; break;
    case 4: powerName = 'x2 SCORE!'; scoreMult = 2; break;
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
  const s = getSizes();

  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(1, '#B0E0FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  clouds.forEach(c => drawCloud(c.x, c.y, c.size));

  // Platforms
  platforms.forEach(p => {
    if (p.type === 3) {
      // Pulsing power orb
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 25 + Math.sin(Date.now() / 150) * 15;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + s.platformHeight / 2, s.orbRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === 0) {
      // Wide
      ctx.drawImage(block1Img, p.x, p.y, p.width / 2, s.platformHeight);
      ctx.drawImage(block1Img, p.x + p.width / 2, p.y, p.width / 2, s.platformHeight);
    } else {
      const img = p.type === 1 ? block1Img : block2Img;
      ctx.drawImage(img, p.x, p.y, p.width, s.platformHeight);
    }
  });

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  });

  // Player shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(player.x + 10, player.y + s.playerSize, s.playerSize * 0.8, 12);

  // Invincible glow
  if (invincible) {
    ctx.save();
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 30;
  }
  ctx.drawImage(charImg, player.x, player.y, s.playerSize, s.playerSize);
  if (invincible) ctx.restore();

  // Score
  ctx.fillStyle = 'white';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${score}`, 20, 50);
  if (scoreMult > 1) {
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`x${scoreMult}`, canvas.width - 100, 50);
  }

  // Power banner
  if (powerName) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, canvas.height - 90, canvas.width - 20, 70);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(powerName, canvas.width / 2, canvas.height - 40);
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x - size * 0.6, y, size * 0.8, 0, Math.PI * 2);
  ctx.arc(x + size * 0.6, y, size * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function addParticle(x, y, vx, vy, color, size) {
  particles.push({ x, y, vx, vy, color, size, life: 30 });
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 3 + Math.random() * 4;
    addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed * -0.8, color, 5);
  }
}

function burstConfetti(x, y) {
  const colors = ['#ff0044', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#ff00ff'];
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 6;
    addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed * -1, colors[i % 6], 6);
  }
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

  const randomTrivia = trivias[Math.floor(Math.random() * trivias.length)];
  const highScore = parseInt(localStorage.getItem('game002_highscore')) || 0;
  const isNewHigh = score > highScore;

  if (isNewHigh) burstConfetti(canvas.width / 2, canvas.height / 2);

  setTimeout(() => {
    alert(
      `Game Over!\nYour Score: ${score}${isNewHigh ? ' (NEW HIGH SCORE!)' : ''}\n\n` +
      `Did you know?\n${randomTrivia}\n\nTap OK to play again!`
    );
    location.reload();
  }, isNewHigh ? 800 : 100); // Delay for confetti visibility
}

function updateHistory(newScore) {
  let history = JSON.parse(localStorage.getItem('game002_history')) || [];
  let highScore = parseInt(localStorage.getItem('game002_highscore')) || 0;
  if (newScore > highScore) localStorage.setItem('game002_highscore', newScore);
  history.unshift(newScore);
  if (history.length > 3) history.pop();
  localStorage.setItem('game002_history', JSON.stringify(history));
}
