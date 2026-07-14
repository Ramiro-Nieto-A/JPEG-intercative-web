import { drawAllBases } from './modules/frequencyBases.js';
import { animateZigzag } from './modules/zigzagAnimator.js';
import { renderMatrixGrid } from './modules/heatmapRenderer.js';
import { getScaledQuantizationMatrix } from './modules/quantization.js';
import { renderColorChannels } from './modules/colorSpace.js';
import { computeDCT2D, computeIDCT2D, quantizeBlock, dequantizeBlock, calculateMetrics } from './modules/dctEngine.js';

let isLevelShifted = true;
let currentSelectedX = 0;
let currentSelectedY = 0;
let hasImage = false;

document.addEventListener('DOMContentLoaded', () => {
    try {
        const selectTransform = document.getElementById('select-transform');
        const sliderQ = document.getElementById('slider-q');
        const qValueDisplay = document.getElementById('q-value');
        const btnToggleShift = document.getElementById('btn-toggle-shift');
        
        const canvasBases = document.getElementById('canvas-bases');
        const canvasZigzag = document.getElementById('canvas-zigzag');
        const imageLoader = document.getElementById('image-loader');
        const canvasOriginal = document.getElementById('canvas-original');
        
        const canvasY = document.getElementById('canvas-y');
        const canvasCb = document.getElementById('canvas-cb');
        const canvasCr = document.getElementById('canvas-cr');
        const emptyState = document.getElementById('empty-state');

        // 1. Iniciar Bases
        if (canvasBases && selectTransform) {
            drawAllBases(canvasBases, selectTransform.value);
            selectTransform.addEventListener('change', () => {
                drawAllBases(canvasBases, selectTransform.value);
                updatePipeline(canvasOriginal);
            });
        }

        // 2. Iniciar Animación Zig-Zag
        if (canvasZigzag) animateZigzag(canvasZigzag);

        // 3. Eventos de la UI
        if (sliderQ && qValueDisplay) {
            sliderQ.addEventListener('input', (e) => {
                qValueDisplay.textContent = e.target.value;
                updatePipeline(canvasOriginal);
            });
        }

        if (btnToggleShift) {
            btnToggleShift.addEventListener('click', () => {
                isLevelShifted = !isLevelShifted;
                btnToggleShift.textContent = isLevelShifted 
                    ? "Ver: Píxeles Originales [0, 255]" 
                    : "Ver: Corrimiento Nivel [-128, 127]";
                updatePipeline(canvasOriginal);
            });
        }

        // 4. Lógica de Carga de Imagen (Robusta)
        if (imageLoader && canvasOriginal) {
            // Quitamos el willReadFrequently para maximizar compatibilidad con navegadores viejos
            const ctx = canvasOriginal.getContext('2d'); 
            
            imageLoader.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            if (emptyState) emptyState.style.display = 'none';
                            canvasOriginal.style.display = 'block';
                            canvasOriginal.width = img.width;
                            canvasOriginal.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            
                            hasImage = true;
                            currentSelectedX = Math.floor(img.width / 2);
                            currentSelectedY = Math.floor(img.height / 2);

                            renderColorChannels(canvasOriginal, canvasY, canvasCb, canvasCr);
                            updatePipeline(canvasOriginal);
                        } catch (err) {
                            console.error("Error al procesar la imagen:", err);
                            alert("Hubo un error al dibujar la imagen. Revisa la consola.");
                        }
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });

            canvasOriginal.addEventListener('click', (e) => {
                if (!hasImage) return;
                const rect = canvasOriginal.getBoundingClientRect();
                const scaleX = canvasOriginal.width / rect.width;
                const scaleY = canvasOriginal.height / rect.height;
                
                currentSelectedX = Math.floor((e.clientX - rect.left) * scaleX);
                currentSelectedY = Math.floor((e.clientY - rect.top) * scaleY);

                updatePipeline(canvasOriginal);
                
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillRect(currentSelectedX - 4, currentSelectedY - 4, 8, 8);
                setTimeout(() => {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0);
                    img.src = canvasOriginal.toDataURL();
                }, 300);
            });
        }
    } catch (globalError) {
        console.error("Error crítico en la inicialización:", globalError);
    }
});

function onCellHover(text) {
    const hoverInfo = document.getElementById('hover-info');
    if (hoverInfo) hoverInfo.innerHTML = text;
}

function extract8x8Block(canvas, startX, startY) {
    const block = new Float64Array(64);
    if (!hasImage) return block;

    const ctx = canvas.getContext('2d');
    
    let x = startX;
    let y = startY;
    if (x + 8 > canvas.width) x = canvas.width - 8;
    if (y + 8 > canvas.height) y = canvas.height - 8;
    if (x < 0) x = 0;
    if (y < 0) y = 0;

    const imgData = ctx.getImageData(x, y, 8, 8).data;
    
    for (let i = 0; i < 64; i++) {
        const r = imgData[i * 4];
        const g = imgData[i * 4 + 1];
        const b = imgData[i * 4 + 2];
        block[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return block;
}

function updatePipeline(canvasOriginal) {
    if (!hasImage || !canvasOriginal) return;

    try {
        const sliderQ = document.getElementById('slider-q');
        const quality = sliderQ ? parseInt(sliderQ.value) : 50;
        
        const quantMatrix = getScaledQuantizationMatrix(quality);
        const rawPixels = extract8x8Block(canvasOriginal, currentSelectedX, currentSelectedY);
        
        const shiftedBlock = new Float64Array(64);
        for (let i = 0; i < 64; i++) {
            shiftedBlock[i] = rawPixels[i] - 128;
        }

        const displaySpatial = isLevelShifted ? shiftedBlock : rawPixels;
        const dctCoeffs = computeDCT2D(shiftedBlock);
        const quantizedCoeffs = quantizeBlock(dctCoeffs, quantMatrix);
        
        const dequantizedCoeffs = dequantizeBlock(quantizedCoeffs, quantMatrix);
        const reconstructedShifted = computeIDCT2D(dequantizedCoeffs);
        
        const reconstructedPixels = new Float64Array(64);
        for (let i = 0; i < 64; i++) {
            reconstructedPixels[i] = reconstructedShifted[i] + 128;
        }

        const metrics = calculateMetrics(rawPixels, reconstructedPixels);

        renderMatrixGrid('matrix-spatial', displaySpatial, 'spatial', onCellHover);
        renderMatrixGrid('matrix-quantization', quantMatrix, 'quantization', onCellHover);
        renderMatrixGrid('matrix-frequency', quantizedCoeffs, 'frequency', onCellHover);
        
        updateRleTerminal(quantizedCoeffs);
        updateMetricsUI(metrics.mse, metrics.psnr, quantizedCoeffs);
    } catch (pipelineError) {
        console.error("Error en el cálculo matemático:", pipelineError);
    }
}

function updateRleTerminal(quantizedBlock) {
    const terminal = document.getElementById('rle-stream-output');
    if (!terminal) return;

    let outputText = `Compresión Real en Proceso...\n\n`;
    outputText += `[COEFICIENTE DC: ${Math.round(quantizedBlock[0])}]\n`;
    
    let zeroCount = 0;
    let acSymbols = [];
    for (let i = 1; i < 64; i++) {
        if (quantizedBlock[i] === 0) {
            zeroCount++;
        } else {
            acSymbols.push(`(${zeroCount}, ${Math.round(quantizedBlock[i])})`);
            zeroCount = 0;
        }
    }
    
    if (zeroCount > 0) acSymbols.push('[EOB]');
    outputText += acSymbols.length > 0 ? acSymbols.join(' -> ') : '[BLOQUE NULO] -> [EOB]';
    terminal.textContent = outputText;
}

function updateMetricsUI(mse, psnr, quantizedBlock) {
    const psnrElement = document.getElementById('metric-psnr');
    const mseElement = document.getElementById('metric-mse');
    const ratioElement = document.getElementById('metric-ratio');
    if (!psnrElement || !mseElement || !ratioElement) return;

    let zeroCount = 0;
    for (let i = 0; i < 64; i++) {
        if (quantizedBlock[i] === 0) zeroCount++;
    }
    const realCompressionRatio = (64 / (64 - zeroCount + 0.1)).toFixed(1);

    mseElement.textContent = mse.toFixed(2);
    psnrElement.textContent = `${psnr.toFixed(2)} dB`;
    ratioElement.textContent = `${realCompressionRatio} : 1`;
}