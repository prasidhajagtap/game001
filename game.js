const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loginScreen = document.getElementById('login-screen');
const scoreEl = document.getElementById('score');
const graffiti = document.getElementById('graffiti');

// Game Constants
let width, height, player, platforms, score, gameActive = false;
const gravity = 0.4;
const jumpStrength = -12;

// Asset Loading
const charImg = new Image(); charImg.src = 'character.png';
const platPlain = new Image(); platPlain.src = 'platform-plain.png';
const platGrass = new Image(); platGrass.src = 'platform-grass.png';

function resize() {
    width = window.innerWidth > 600 ? 600 : window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.onload = () => {
    // All your existing game.js code goes here
    console.log("Game assets loaded and ready!");
};
window.addEventListener('resize', resize);
resize();

document.getElementById('start-btn').onclick = () => {
    const name = document.getElementById('username').value;
    const pid = document.getElementById('poornataId').value;
    if(name && pid) {
        saveUser(name, pid);
        loginScreen.style.display = 'none';
        initGame();
    }
};

function saveUser(name, id) {
    const userData = {
        name: name,
        pid: id,
        lastPlayed: new Date().getTime(),
        scores: JSON.parse(localStorage.getItem('scores') || '[]'),
        totalTime: Number(localStorage.getItem('totalTime') || 0)
    };
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('expiry', new Date().getTime() + (90 * 24 * 60 * 60 * 1000));
}

function initGame() {
    score = 0;
    player = { x: width/2, y: height - 150, w: 50, h: 50, vx: 0, vy: 0 };
    platforms = [];
    for(let i=0; i<7; i++) {
        platforms.push({
            x: Math.random() * (width - 70),
            y: height - (i * 120),
            w: 80, h: 40,
            type: Math.random() > 0.5 ? platGrass : platPlain
        });
    }
    gameActive = true;
    animate();
}

function showGraffiti(text) {
    graffiti.innerText = text;
    graffiti.classList.add('pop-anim');
    setTimeout(() => graffiti.classList.remove('pop-anim'), 800);
}

function update() {
    if(!gameActive) return;

    player.vy += gravity;
    player.y += player.vy;

    // Movement (Tilt or Keyboard)
    player.x += player.vx;
    if (player.x > width) player.x = 0;
    if (player.x < 0) player.x = width;

    // Platform Collision
    platforms.forEach(p => {
        if (player.vy > 0 && 
            player.x + 15 < p.x + p.w && player.x + player.w - 15 > p.x &&
            player.y + player.h > p.y && player.y + player.h < p.y + 20) {
            player.vy = jumpStrength;
            if(score % 500 === 0 && score > 0) showGraffiti("AWESOME!");
        }
    });

    // Camera follow and Score
    if (player.y < height / 2) {
        let diff = height / 2 - player.y;
        player.y = height / 2;
        score += Math.floor(diff);
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
    // Draw platforms as green boxes
    platforms.forEach(p => {
        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y, p.w, p.h);
    });
    // Draw player as a red box
    ctx.fillStyle = "red";
    ctx.fillRect(player.x, player.y, player.w, player.h);
}

function animate() {
    update();
    draw();
    if(gameActive) requestAnimationFrame(animate);
}

function endGame() {
    gameActive = false;
    const user = JSON.parse(localStorage.getItem('currentUser'));
    user.scores.push(score);
    user.scores.sort((a,b) => b-a);
    user.scores = user.scores.slice(0, 3);
    localStorage.setItem('currentUser', JSON.stringify(user));
    alert("Game Over! Score: " + score);
    location.reload();
}

// Input control
window.onkeydown = (e) => {
    if(e.key === "ArrowLeft") player.vx = -5;
    if(e.key === "ArrowRight") player.vx = 5;
};
window.onkeyup = () => player.vx = 0;
// Support mobile touch
window.ontouchstart = (e) => {
    const touchX = e.touches[0].clientX;
    player.vx = touchX < width/2 ? -5 : 5;
};
window.ontouchend = () => player.vx = 0;
