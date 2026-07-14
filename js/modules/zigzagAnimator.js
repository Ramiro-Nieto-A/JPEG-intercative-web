const zigzagOrder = [
    0,  1,  5,  6, 14, 15, 27, 28,
    2,  4,  7, 13, 16, 26, 29, 42,
    3,  8, 12, 17, 25, 30, 41, 43,
    9, 11, 18, 24, 31, 40, 44, 53,
   10, 19, 23, 32, 39, 45, 52, 54,
   20, 22, 33, 38, 46, 51, 55, 60,
   21, 34, 37, 47, 50, 56, 59, 61,
   35, 36, 48, 49, 57, 58, 62, 63
];

const indexToCoords = new Array(64);
for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
        const linearIdx = zigzagOrder[r * 8 + c];
        indexToCoords[linearIdx] = { r, c };
    }
}

let animationId = null;

export function animateZigzag(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const stepX = w / 8;
    const stepY = h / 8;
    let currentStep = 0;
    
    if (animationId) cancelAnimationFrame(animationId);

    function drawFrame() {
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        for (let i = 1; i < 8; i++) {
            ctx.beginPath(); ctx.moveTo(i * stepX, 0); ctx.lineTo(i * stepX, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * stepY); ctx.lineTo(w, i * stepY); ctx.stroke();
        }

        ctx.strokeStyle = '#003366'; /* Color ITBA */
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        let first = indexToCoords[0];
        ctx.moveTo(first.c * stepX + stepX / 2, first.r * stepY + stepY / 2);

        for (let i = 1; i <= currentStep; i++) {
            let pt = indexToCoords[i];
            ctx.lineTo(pt.c * stepX + stepX / 2, pt.r * stepY + stepY / 2);
        }
        ctx.stroke();

        let head = indexToCoords[currentStep];
        let headX = head.c * stepX + stepX / 2;
        let headY = head.r * stepY + stepY / 2;

        ctx.fillStyle = '#0055a4';
        ctx.beginPath();
        ctx.arc(headX, headY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        currentStep = (currentStep + 1) % 64;
        
        setTimeout(() => {
            animationId = requestAnimationFrame(drawFrame);
        }, 80);
    }
    drawFrame();
}