const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loginScreen = document.getElementById('login-screen');
const pauseScreen = document.getElementById('pause-screen');
const scoreEl = document.getElementById('score');
const progressBar = document.getElementById('progress-bar');

let width, height, player, platforms, score = 0, gameActive = false, isPaused = false;
let highScore = 0;
const gravity = 0.4;
const jumpStrength = -13; // Increased jump slightly for larger scale

const charImg = new Image(); charImg.src = 'character.png';
const plat1 = new Image(); plat1.src = 'block-1.png';
const plat2 = new Image(); plat2.src = 'block-2.png';

// Validation & 90-Day Persistence
function checkUserSession() {
    const savedUser = localStorage.getItem('game001_user');
    const expiry = localStorage.getItem('game001_expiry');
    if (savedUser && expiry && new Date().getTime() < expiry) {
        const user = JSON.parse(savedUser);
        highScore = user.highScore || 0;
        loginScreen.style.display = 'none';
        initGame();
    }
}

document.getElementById('start-btn').onclick = function() {
    const nameInput = document.getElementById('username').value;
    const pidInput = document.getElementById('poornataId').value;
    if(/^[A-Za-z\s]+$/.test(nameInput) && /^[0-9]+$/.test(pidInput)) {
        const user = { name: nameInput, pid: pidInput, history: [], highScore: 0 };
        localStorage.setItem('game001_user', JSON.stringify(user));
        localStorage.setItem('game001_expiry', new Date().getTime() + (90 * 24 * 60 * 60 * 1000));
        loginScreen.style.display = 'none';
        initGame();
    } else {
        alert("Invalid Name (Alphabets only) or ID (Numbers only)");
    }
};

// Scale Increase Logic
function resize() {
    // Increased total game width to 600 for better engagement
    width = window.innerWidth > 600 ? 600 : window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

function initGame() {
    score = 0;
    player = { x: width/2 - 30, y: height - 160, w: 60, h: 60, vx: 0, vy: 0 };
    platforms = [];
    
    // Starter platform
    platforms.push({ x: width/2 - 60, y: height - 80, w: 120, h: 35, img: plat1, speed: 0 });

    for(let i=1; i<8; i++) {
        addPlatform(height - (i * 150) - 80);
    }
    gameActive = true;
    animate();
}

function addPlatform(yPos) {
    // Option A: Difficulty - Speed increases with score
    let speed = score > 200 ? (Math.random() - 0.5) * (score / 150) : 0;
    platforms.push({
        x: Math.random() * (width - 100),
        y: yPos,
        w: score > 1000 ? 80 : 100, // Platforms shrink as you go higher
        h: 30,
        img: Math.random() > 0.5 ? plat1 : plat2,
        speed: speed
    });
}

// Option C: Pause Logic
document.getElementById('pause-btn').onclick = () => {
    isPaused = true;
    pauseScreen.style.display = 'flex';
};
document.getElementById('resume-btn').onclick = () => {
    isPaused = false;
    pauseScreen.style.display = 'none';
    animate();
};

function handleInput(e) {
    if (isPaused) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    player.vx = clientX < width / 2 ? -8 : 8;
}
window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, {passive: false});
window.addEventListener('mouseup', () => player.vx = 0);
window.addEventListener('touchend', () => player.vx = 0);

function update() {
    if(!gameActive || isPaused) return;

    player.vy += gravity;
    player.y += player.vy;
    player.x += player.vx;

    if (player.x > width) player.x = -player.w;
    if (player.x < -player.w) player.x = width;

    platforms.forEach(p => {
        // Move platform (Option A)
        p.x += p.speed;
        if(p.x <= 0 || p.x + p.w >= width) p.speed *= -1;

        // Collision
        if (player.vy > 0 && 
            player.x + 20 < p.x + p.w && player.x + player.w - 20 > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + 20) {
            player.vy = jumpStrength;
        }
    });

    if (player.y < height / 2) {
        let diff = height / 2 - player.y;
        player.y = height / 2;
        score += 1;
        scoreEl.innerText = score;

        // Progress Bar (Option C)
        if(highScore > 0) {
            let progress = Math.min((score / highScore) * 100, 100);
            progressBar.style.width = progress + "%";
        }

        platforms.forEach(p => {
            p.y += diff;
            if (p.y > height) {
                platforms.splice(platforms.indexOf(p), 1);
                addPlatform(0);
            }
        });
    }
    if (player.y > height) endGame();
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Option B: Subtle Background Parallax (Sky color shift)
    let skyColor = Math.max(250 - score/20, 200);
    canvas.style.backgroundColor = `rgb(${skyColor}, ${skyColor + 5}, 255)`;

    platforms.forEach(p => ctx.drawImage(p.img, p.x, p.y, p.w, p.h));
    ctx.drawImage(charImg, player.x, player.y, player.w, player.h);
}

function animate() {
    if(isPaused) return;
    update();
    draw();
    if(gameActive) requestAnimationFrame(animate);
}

function endGame() {
    gameActive = false;
    let user = JSON.parse(localStorage.getItem('game001_user'));
    user.history.unshift(score);
    user.history = user.history.slice(0, 3);
    if (score > user.highScore) user.highScore = score;
    localStorage.setItem('game001_user', JSON.stringify(user));
    alert(`GAME OVER\nScore: ${score}\nHigh Score: ${user.highScore}`);
    location.reload();
}

checkUserSession();
