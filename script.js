document.getElementById('shareNowBtn').addEventListener('click', function() {
    // 1. Capture the data from the UI
    const score = document.getElementById('user-actual-score').innerText;
    const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });

    // 2. Map data to the hidden capture template
    document.getElementById('score-display').innerText = score;
    document.getElementById('date-display').innerText = today;

    const captureArea = document.getElementById('capture-container');

    // 3. Generate the Image
    html2canvas(captureArea, {
        useCORS: true,
        allowTaint: true,
        scale: 2 // Higher quality
    }).then(canvas => {
        canvas.toBlob(blob => {
            const file = new File([blob], "poornata-daily-score.png", { type: "image/png" });

            // 4. Share Sheet Logic
            if (navigator.share && navigator.canShare({ files: [file] })) {
                navigator.share({
                    title: 'My Poornata Daily Score',
                    text: `I just achieved a score of ${score} on Poornata! Can you beat me?`,
                    files: [file]
                })
                .then(() => console.log('Share successful'))
                .catch((error) => console.log('Sharing failed', error));
            } else {
                // Fallback: Just download for PC users
                const link = document.createElement('a');
                link.download = `poornata-score-${today}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
                alert("Scorecard downloaded! Share it with your friends.");
            }
        });
    });
});
