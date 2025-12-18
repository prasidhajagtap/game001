// admin-script.js

document.addEventListener('DOMContentLoaded', () => {
    // References to DOM elements
    const body = document.body;
    const toggleBtn = document.getElementById('mainToggleBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    // 1. TOGGLE LOGIC
    toggleBtn.addEventListener('click', () => {
        // Toggle the class that hides/shows the dashboard
        if (body.classList.contains('play-active')) {
            // GOING TO ADMIN MODE
            body.classList.remove('play-active');
            toggleBtn.innerText = "PLAY GAME";
        } else {
            // GOING TO PLAY MODE
            body.classList.add('play-active');
            toggleBtn.innerText = "SHOW ADMIN";
        }
    });

    // 2. SHARE SCREENSHOT LOGIC
    shareBtn.addEventListener('click', async () => {
        // Get current values
        const currentScore = document.getElementById('ui-score').innerText;
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Update the hidden capture template
        document.getElementById('cap-score').innerText = currentScore;
        document.getElementById('cap-date').innerText = currentDate;

        const captureElement = document.getElementById('capture-area');

        try {
            // Generate Canvas
            const canvas = await html2canvas(captureElement, {
                useCORS: true, // Important for loading images
                scale: 2       // High resolution
            });

            // Convert to Blob
            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'poornata_daily_score.png', { type: 'image/png' });

                // Try Mobile Native Share first
                if (navigator.share) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Poornata Score',
                            text: `I scored ${currentScore} on Poornata today!`
                        });
                    } catch (shareError) {
                        console.log('Share canceled or failed', shareError);
                    }
                } else {
                    // Desktop Fallback: Download the file
                    const link = document.createElement('a');
                    link.download = 'poornata_score.png';
                    link.href = canvas.toDataURL();
                    link.click();
                }
            });
        } catch (err) {
            console.error("Error generating screenshot:", err);
            alert("Could not create screenshot. Check console for details.");
        }
    });
});
