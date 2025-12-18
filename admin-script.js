// admin-script.js
document.addEventListener('DOMContentLoaded', () => {
    const shareBtn = document.getElementById('shareNowBtn');
    
    shareBtn.addEventListener('click', async () => {
        // 1. Get Score and Date
        const currentScore = document.getElementById('user-actual-score').innerText;
        const today = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });

        // 2. Prepare the Capture Template
        document.getElementById('score-display').innerText = currentScore;
        document.getElementById('date-display').innerText = today;

        const captureArea = document.getElementById('capture-container');

        // 3. Take Screenshot
        try {
            const canvas = await html2canvas(captureArea, { useCORS: true });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], 'poornata_score.png', { type: 'image/png' });

            // 4. Share or Download
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My Poornata Daily Score',
                    text: `I scored ${currentScore} today! Can you beat me?`
                });
            } else {
                // Fallback for PC
                const link = document.createElement('a');
                link.download = 'my-score.png';
                link.href = canvas.toDataURL();
                link.click();
            }
        } catch (err) {
            console.error("Capture failed:", err);
        }
    });
});
