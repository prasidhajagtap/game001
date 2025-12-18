// script.js

// This script simulates your Game Engine (Phaser/Unity/etc.)
console.log("Game Engine Loaded.");

let gameScore = 0;
const gameArea = document.getElementById('game-container');
const uiScoreDisplay = document.getElementById('ui-score');

// === TEST INTERACTION ===
// Click anywhere on the black screen (in Play Mode) to simulate scoring
gameArea.addEventListener('click', () => {
    console.log("Game Click Detected!");
    
    // 1. Logic: Increase Score
    gameScore += 100;
    
    // 2. Visual: Change background color slightly to prove interaction works
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    gameArea.style.backgroundColor = randomColor;

    // 3. Callback: Update the Admin UI Score
    if (uiScoreDisplay) {
        uiScoreDisplay.innerText = gameScore.toLocaleString();
    }
});
