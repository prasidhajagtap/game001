// script.js (Game Entry)

// This represents your actual game logic
let score = 0;

function increaseScore(points) {
    score += points;
    // Update the Admin UI score element
    const scoreElement = document.getElementById('live-score-val');
    if (scoreElement) scoreElement.innerText = score;
}

// Example: Simulating points being added when playing
console.log("Game Loaded. Targeting #game-container");
