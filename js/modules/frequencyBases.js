const N = 8;

function alpha(k) {
    return k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
}

function hadamardKernel(size) {
    if (size === 1) return [[1]];
    const half = size / 2;
    const sub = hadamardKernel(half);
    const H = Array(size).fill(0).map(() => Array(size).fill(0));
    for (let i = 0; i < half; i++) {
        for (let j = 0; j < half; j++) {
            H[i][j] = sub[i][j];
            H[i][j + half] = sub[i][j];
            H[i + half][j] = sub[i][j];
            H[i + half][j + half] = -sub[i][j];
        }
    }
    return H;
}

function getSequencyHadamard() {
    const H = hadamardKernel(N);
    const rowCrossings = H.map((row, idx) => {
        let crossings = 0;
        for (let i = 0; i < N - 1; i++) {
            if (row[i] !== row[i + 1]) crossings++;
        }
        return { index: idx, crossings: crossings };
    });
    rowCrossings.sort((a, b) => a.crossings - b.crossings);
    
    const sortedH = new Float64Array(N * N);
    const norm = 1 / Math.sqrt(N);
    for (let i = 0; i < N; i++) {
        const originalRow = H[rowCrossings[i].index];
        for (let j = 0; j < N; j++) {
            sortedH[i * N + j] = originalRow[j] * norm;
        }
    }
    return sortedH;
}

const sequencyHadamardMatrix = getSequencyHadamard();

export function drawAllBases(canvas, mode) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const subBlockW = w / N;
    const subBlockH = h / N;
    const pixelW = subBlockW / N;
    const pixelH = subBlockH / N;

    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            const startX = v * subBlockW;
            const startY = u * subBlockH;

            for (let x = 0; x < N; x++) {
                for (let y = 0; y < N; y++) {
                    let val = 0;
                    if (mode === 'DCT') {
                        val = alpha(u) * alpha(v) * Math.cos((Math.PI / N) * (x + 0.5) * u) * Math.cos((Math.PI / N) * (y + 0.5) * v);
                        val = ((val + 0.25) / 0.5) * 255;
                    } else { 
                        val = sequencyHadamardMatrix[u * N + x] * sequencyHadamardMatrix[v * N + y];
                        val = ((val + 0.125) / 0.25) * 255;
                    }

                    val = Math.max(0, Math.min(255, Math.floor(val)));
                    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
                    ctx.fillRect(startX + x * pixelW, startY + y * pixelH, pixelW + 0.5, pixelH + 0.5);
                }
            }
            ctx.strokeStyle = '#cccccc';
            ctx.strokeRect(startX, startY, subBlockW, subBlockH);
        }
    }
}