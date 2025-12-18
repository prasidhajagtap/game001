const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loginScreen = document.getElementById('login-screen');
const pauseScreen = document.getElementById('pause-screen');
const scoreEl = document.getElementById('score');
const progressBar = document.getElementById('progress-bar');

let width, height, player, platforms, score = 0, gameActive = false, isPaused = false;
let highScore = 0;
let playerName = "";

const charImg = new Image(); charImg.src = 'character.png';
const plat1 = new Image(); plat1.src = 'block-1.jpg';
const plat2 = new Image(); plat2.src = 'block-2.jpg';

function checkUserSession() {
    const savedUser = localStorage.getItem('game001_user');
    const expiry = localStorage.getItem('game001_expiry');
    if (savedUser && expiry && new Date().getTime() < expiry) {
        const user = JSON.parse(savedUser);
        playerName = user.name;
        highScore = user.highScore || 0;
        loginScreen.style.display = 'none';
        initGame();
    }
}

document.getElementById('start-btn').onclick = function() {
    const nameInput = document.getElementById('username').value.trim();
    const pidInput = document.getElementById('poornataId').value.trim();

    if(/^[A-Za-z\s]+$/.test(nameInput) && /^[0-9]+$/.test(pidInput)) {
        playerName = nameInput;
        const user = { name: playerName, pid: pidInput, history: [], highScore: 0 };
        localStorage.setItem('game001_user', JSON.stringify(user));
        localStorage.setItem('game001_expiry', new Date().getTime() + (90 * 24 * 60 * 60 * 1000));
        loginScreen.style.display = 'none';
        initGame();
    } else {
        alert("Please enter a valid Name (Alphabets) and Poornata ID (Numbers)");
    }
};

function resize() {
    const container = document.getElementById('game-container');
    width = container.clientWidth;
    height = container.clientHeight - document.getElementById('game-header').offsetHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

function initGame() {
    score = 0;
    // Scaled player size for better visibility
    player = { x: width/2 - 25, y: height - 150, w: 55, h: 55, vx: 0, vy: 0 };
    platforms = [];
    platforms.push({ x: width/2 - 60, y: height - 80, w: 120, h: 40, img: plat1, speed: 0 });

    for(let i=1; i<7; i++) {
        addPlatform(height - (i * 160) - 80);
    }
    gameActive = true;
    animate();
}

function addPlatform(yPos) {
    let speed = score > 300 ? (Math.random() - 0.5) * (score / 200) : 0;
    platforms.push({
        x: Math.random() * (width - 100),
        y: yPos,
        w: 100, h: 45,
        img: Math.random() > 0.5 ? plat1 : plat2,
        speed: speed
    });
}

// Pause Controls
document.getElementById('pause-btn').onclick = () => {
    isPaused = true;
    pauseScreen.style.display = 'flex';
};
document.getElementById('resume-btn').onclick = () => {
    isPaused = false;
    pauseScreen.style.display = 'none';
    requestAnimationFrame(animate);
};

function handleInput(e) {
    if (isPaused || !gameActive) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    player.vx = clientX < width / 2 ? -7 : 7;
}

window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, {passive: false});
window.addEventListener('mouseup', () => player.vx = 0);
window.addEventListener('touchend', () => player.vx = 0);

function update() {
    if(!gameActive || isPaused) return;

    player.vy += 0.4; // Gravity
    player.y += player.vy;
    player.x += player.vx;

    if (player.x > width) player.x = -player.w;
    if (player.x < -player.w) player.x = width;

    platforms.forEach(p => {
        p.x += p.speed;
        if(p.x <= 0 || p.x + p.w >= width) p.speed *= -1;

        if (player.vy > 0 && 
            player.x + 15 < p.x + p.w && player.x + player.w - 15 > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + 15) {
            player.vy = -13; // Jump Strength
        }
    });

    if (player.y < height / 2) {
        let diff = height / 2 - player.y;
        player.y = height / 2;
        score += 1;
        scoreEl.innerText = score;

        if(highScore > 0) {
            progressBar.style.width = Math.min((score / highScore) * 100, 100) + "%";
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
    platforms.forEach(p => ctx.drawImage(p.img, p.x, p.y, p.w, p.h));
    ctx.drawImage(charImg, player.x, player.y, player.w, player.h);
}

function animate() {
    if(isPaused || !gameActive) return;
    update();
    draw();
    requestAnimationFrame(animate);
}

function endGame() {
    gameActive = false;
    let user = JSON.parse(localStorage.getItem('game001_user'));
    if (score > user.highScore) user.highScore = score;
    localStorage.setItem('game001_user', JSON.stringify(user));

    // Styled Alert
    alert(`GAME OVER, ${playerName}!\nScore: ${score}\nHigh Score: ${user.highScore}`);
    location.reload();
}

checkUserSession();
