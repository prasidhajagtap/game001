// admin-script.js

// 1. Toggle between Management and Play
const modeToggle = document.getElementById('modeToggle');
const body = document.body;

modeToggle.addEventListener('click', () => {
    if (body.classList.contains('play-view')) {
        body.classList.remove('play-view');
        modeToggle.innerText = "SWITCH TO PLAY MODE";
    } else {
        body.classList.add('play-view');
        modeToggle.innerText = "OPEN ADMIN PANEL";
    }
});

// 2. Score Sharing Functionality
document.getElementById('shareNowBtn').addEventListener('click', async () => {
    const score = document.getElementById('live-score-val').innerText;
    const dateStr = new Date().toLocaleDateString('en-US', { 
        month: 'long', day: 'numeric', year: 'numeric' 
    });

    // Populate the hidden capture template
    document.getElementById('cap-score-display').innerText = score;
    document.getElementById('cap-date-display').innerText = dateStr;

    const captureArea = document.getElementById('capture-container');

    try {
        const canvas = await html2canvas(captureArea, { useCORS: true });
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const file = new File([blob], 'poornata_today.png', { type: 'image/png' });

        if (navigator.share) {
            await navigator.share({
                files: [file],
                title: 'My Poornata Daily Progress',
                text: `I scored ${score} today! Check my island progress.`
            });
        } else {
            // PC Download Fallback
            const link = document.createElement('a');
            link.download = 'poornata_score.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    } catch (err) {
        alert("Could not generate share image. Check console for details.");
        console.error(err);
    }
});
