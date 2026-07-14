/**
 * Motor Matemático Real para Transformadas y Métricas
 */

const N = 8;

function alpha(k) {
    return k === 0 ? 1 / Math.sqrt(2) : 1;
}

// Transformada Discreta del Coseno 2D (DCT-II)
export function computeDCT2D(block) {
    const output = new Float64Array(64);
    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            let sum = 0;
            for (let x = 0; x < N; x++) {
                for (let y = 0; y < N; y++) {
                    sum += block[x * N + y] * Math.cos(((2 * x + 1) * u * Math.PI) / 16) * Math.cos(((2 * y + 1) * v * Math.PI) / 16);
                }
            }
            output[u * N + v] = 0.25 * alpha(u) * alpha(v) * sum;
        }
    }
    return output;
}

// Transformada Inversa (IDCT-II)
export function computeIDCT2D(block) {
    const output = new Float64Array(64);
    for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
            let sum = 0;
            for (let u = 0; u < N; u++) {
                for (let v = 0; v < N; v++) {
                    sum += alpha(u) * alpha(v) * block[u * N + v] * Math.cos(((2 * x + 1) * u * Math.PI) / 16) * Math.cos(((2 * y + 1) * v * Math.PI) / 16);
                }
            }
            output[x * N + y] = 0.25 * sum;
        }
    }
    return output;
}

// Cuantización Real
export function quantizeBlock(dctBlock, quantMatrix) {
    const output = new Float64Array(64);
    for (let i = 0; i < 64; i++) {
        output[i] = Math.round(dctBlock[i] / quantMatrix[i]);
    }
    return output;
}

// De-cuantización Real
export function dequantizeBlock(quantizedBlock, quantMatrix) {
    const output = new Float64Array(64);
    for (let i = 0; i < 64; i++) {
        output[i] = quantizedBlock[i] * quantMatrix[i];
    }
    return output;
}

// Cálculo Analítico Real de Métricas (MSE y PSNR)
export function calculateMetrics(originalBlock, reconstructedBlock) {
    let mse = 0;
    for (let i = 0; i < 64; i++) {
        const diff = originalBlock[i] - reconstructedBlock[i];
        mse += diff * diff;
    }
    mse = mse / 64;

    // Si son exactamente iguales, el PSNR tiende a infinito. Lo limitamos a 99 dB.
    let psnr = 99.99; 
    if (mse > 0) {
        psnr = 10 * Math.log10((255 * 255) / mse);
    }

    return { mse, psnr };
}