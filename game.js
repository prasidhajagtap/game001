const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loginScreen = document.getElementById('login-screen');
const scoreEl = document.getElementById('score');

let width, height, player, platforms, score = 0, gameActive = false;
const gravity = 0.4;
const jumpStrength = -12;

// Load Images with backup
const charImg = new Image(); charImg.src = 'character.png';
const plat1 = new Image(); plat1.src = 'block-1.jpg';
const plat2 = new Image(); plat2.src = 'block-2.jpg';

// Persistent Login Check (90 Days)
function checkUserSession() {
    const savedUser = localStorage.getItem('game001_user');
    const expiry = localStorage.getItem('game001_expiry');
    if (savedUser && expiry && new Date().getTime() < expiry) {
        loginScreen.style.display = 'none';
        initGame();
    }
}

document.getElementById('start-btn').onclick = function() {
    const name = document.getElementById('username').value;
    const pid = document.getElementById('poornataId').value;
    if(name && pid) {
        const user = { name, pid, history: [], highScore: 0 };
        localStorage.setItem('game001_user', JSON.stringify(user));
        localStorage.setItem('game001_expiry', new Date().getTime() + (90 * 24 * 60 * 60 * 1000));
        loginScreen.style.display = 'none';
        initGame();
    }
};

function resize() {
    width = window.innerWidth > 500 ? 500 : window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

function initGame() {
    score = 0;
    player = { x: width/2 - 25, y: height - 150, w: 50, h: 50, vx: 0, vy: 0 };
    platforms = [];
    for(let i=0; i<8; i++) {
        platforms.push({
            x: Math.random() * (width - 70),
            y: height - (i * 120),
            w: 80, h: 20,
            img: Math.random() > 0.5 ? plat1 : plat2,
            color: Math.random() > 0.5 ? '#F2622E' : '#969696'
        });
    }
    gameActive = true;
    animate();
}

// Controls: Tap/Click left to go left, right to go right
const move = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    player.vx = clientX < width / 2 ? -7 : 7;
};
const stop = () => player.vx = 0;

window.addEventListener('mousedown', move);
window.addEventListener('touchstart', move);
window.addEventListener('mouseup', stop);
window.addEventListener('touchend', stop);

function update() {
    if(!gameActive) return;
    player.vy += gravity;
    player.y += player.vy;
    player.x += player.vx;

    if (player.x > width) player.x = -player.w;
    if (player.x < -player.w) player.x = width;

    platforms.forEach(p => {
        if (player.vy > 0 && 
            player.x + 15 < p.x + p.w && player.x + player.w - 15 > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + 15) {
            player.vy = jumpStrength;
        }
    });

    if (player.y < height / 2) {
        let diff = height / 2 - player.y;
        player.y = height / 2;
        score += 1;
        scoreEl.innerText = score;
        platforms.forEach(p => {
            p.y += diff;
            if (p.y > height) {
                p.y = 0;
                p.x = Math.random() * (width - 70);
            }
        });
    }
    if (player.y > height) endGame();
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    // Draw Platforms
    platforms.forEach(p => {
        try {
            ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
        } catch(e) {
            ctx.fillStyle = p.color; // Fallback if image fails
            ctx.fillRect(p.x, p.y, p.w, p.h);
        }
    });
    // Draw Player
    try {
        ctx.drawImage(charImg, player.x, player.y, player.w, player.h);
    } catch(e) {
        ctx.fillStyle = "#F2622E"; // Fallback
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }
}

function animate() {
    update();
    draw();
    if(gameActive) requestAnimationFrame(animate);
}

function endGame() {
    gameActive = false;
    let user = JSON.parse(localStorage.getItem('game001_user'));
    user.history.unshift({ score: score, date: new Date().toLocaleDateString() });
    user.history = user.history.slice(0, 3);
    if (score > user.highScore) user.highScore = score;
    localStorage.setItem('game001_user', JSON.stringify(user));
    alert("Game Over! Score: " + score);
    location.reload();
}

checkUserSession();
