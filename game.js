const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loginScreen = document.getElementById('login-screen');
const scoreEl = document.getElementById('score');

let width, height, player, platforms, score = 0, gameActive = false;
const gravity = 0.45;
const jumpStrength = -13;

// Assets
const charImg = new Image(); charImg.src = 'character.png';
const plat1 = new Image(); plat1.src = 'block-1.jpg';
const plat2 = new Image(); plat2.src = 'block-2.jpg';

function checkUserSession() {
    const savedUser = localStorage.getItem('game001_user');
    const expiry = localStorage.getItem('game001_expiry');
    if (savedUser && expiry && new Date().getTime() < expiry) {
        loginScreen.style.display = 'none';
        initGame();
    }
}

document.getElementById('start-btn').onclick = function() {
    const name = document.getElementById('username').value.trim();
    const pid = document.getElementById('poornataId').value.trim();
    if(name && pid) {
        const user = { name, pid, history: [], highScore: 0 };
        localStorage.setItem('game001_user', JSON.stringify(user));
        localStorage.setItem('game001_expiry', new Date().getTime() + (90 * 24 * 60 * 60 * 1000));
        loginScreen.style.display = 'none';
        initGame();
    } else {
        alert("Please fill in both fields correctly.");
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
    // Position player exactly above the start platform
    player = { x: width/2 - 25, y: height - 160, w: 60, h: 60, vx: 0, vy: 0 };
    platforms = [];

    // BUG FIX 2: Create a SOLID START PLATFORM so game doesn't end immediately
    platforms.push({ x: width/2 - 50, y: height - 100, w: 100, h: 30, img: plat1 });

    // Generate random floating platforms
    for(let i=1; i<7; i++) {
        platforms.push({
            x: Math.random() * (width - 100),
            y: height - (i * 130) - 100,
            w: 90, h: 35, // BUG FIX 4: Increased height so they aren't just bars
            img: Math.random() > 0.5 ? plat1 : plat2
        });
    }

    const user = JSON.parse(localStorage.getItem('game001_user'));
    if(user) document.getElementById('high-score-display').innerText = "Personal High: " + user.highScore;

    gameActive = true;
    animate();
}

// BUG FIX 3: Robust Input for Web (Click) and Mobile (Touch)
function handleMove(e) {
    if(!gameActive) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const canvasRect = canvas.getBoundingClientRect();
    const relativeX = clientX - canvasRect.left;
    
    player.vx = relativeX < width / 2 ? -8 : 8;
}

function stopMove() { player.vx = 0; }

window.addEventListener('mousedown', handleMove);
window.addEventListener('touchstart', handleMove, {passive: false});
window.addEventListener('mouseup', stopMove);
window.addEventListener('touchend', stopMove);

function update() {
    if(!gameActive) return;
    player.vy += gravity;
    player.y += player.vy;
    player.x += player.vx;

    if (player.x > width) player.x = -player.w;
    if (player.x < -player.w) player.x = width;

    // Better Collision Detection
    platforms.forEach(p => {
        if (player.vy > 0 && 
            player.x + 20 < p.x + p.w && player.x + player.w - 20 > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + 25) {
            player.vy = jumpStrength;
        }
    });

    if (player.y < height / 2) {
        let diff = height / 2 - player.y;
        player.y = height / 2;
        score += Math.floor(diff/10);
        scoreEl.innerText = score;
        platforms.forEach(p => {
            p.y += diff;
            if (p.y > height) {
                p.y = -20;
                p.x = Math.random() * (width - 100);
                p.img = Math.random() > 0.5 ? plat1 : plat2;
            }
        });
    }
    if (player.y > height) endGame();
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    platforms.forEach(p => {
        ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
    });
    ctx.drawImage(charImg, player.x, player.y, player.w, player.h);
}

function animate() {
    update();
    draw();
    if(gameActive) requestAnimationFrame(animate);
}

// BUG FIX 5: Show history and high score on Death
function endGame() {
    gameActive = false;
    let user = JSON.parse(localStorage.getItem('game001_user'));
    
    user.history.unshift({ score: score, date: new Date().toLocaleTimeString() });
    user.history = user.history.slice(0, 3);
    if (score > user.highScore) user.highScore = score;
    
    localStorage.setItem('game001_user', JSON.stringify(user));

    const historyText = user.history.map((g, i) => `${i+1}. ${g.score} (${g.date})`).join('\n');
    alert(`GAME OVER\nScore: ${score}\n\n🏆 High Score: ${user.highScore}\n\nLast 3 Games:\n${historyText}`);
    
    location.reload();
}

checkUserSession();
