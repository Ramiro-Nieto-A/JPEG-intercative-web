import { drawAllBases } from './modules/frequencyBases.js';
import { animateZigzag } from './modules/zigzagAnimator.js';
import { renderMatrixGrid, generateMockBlock } from './modules/heatmapRenderer.js';
import { getScaledQuantizationMatrix } from './modules/quantization.js';
import { renderColorChannels } from './modules/colorSpace.js'; // NUEVA IMPORTACIÓN

let isLevelShifted = true;

document.addEventListener('DOMContentLoaded', () => {
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

    if (canvasBases && selectTransform) {
        drawAllBases(canvasBases, selectTransform.value);
        selectTransform.addEventListener('change', () => {
            drawAllBases(canvasBases, selectTransform.value);
            updatePipeline();
        });
    }

    if (canvasZigzag) animateZigzag(canvasZigzag);

    if (sliderQ) {
        sliderQ.addEventListener('input', (e) => {
            qValueDisplay.textContent = e.target.value;
            updatePipeline();
        });
    }

    if (btnToggleShift) {
        btnToggleShift.addEventListener('click', () => {
            isLevelShifted = !isLevelShifted;
            btnToggleShift.textContent = isLevelShifted 
                ? "Ver: Píxeles Originales [0, 255]" 
                : "Ver: Corrimiento Nivel [-128, 127]";
            updatePipeline();
        });
    }

    if (imageLoader && canvasOriginal) {
        const ctx = canvasOriginal.getContext('2d');
        imageLoader.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    emptyState.style.display = 'none';
                    canvasOriginal.style.display = 'block';
                    canvasOriginal.width = img.width;
                    canvasOriginal.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    // Procesar y separar YCbCr
                    renderColorChannels(canvasOriginal, canvasY, canvasCb, canvasCr);
                    updatePipeline();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        canvasOriginal.addEventListener('click', (e) => {
            const rect = canvasOriginal.getBoundingClientRect();
            const scaleX = canvasOriginal.width / rect.width;
            const scaleY = canvasOriginal.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            updatePipeline();
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(x - 4, y - 4, 8, 8);
            setTimeout(() => {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = canvasOriginal.toDataURL();
            }, 300);
        });
    }

    updatePipeline();
});

function onCellHover(text) {
    const hoverInfo = document.getElementById('hover-info');
    if (hoverInfo) hoverInfo.innerHTML = text;
}

function updatePipeline() {
    const transformType = document.getElementById('select-transform').value;
    const quality = parseInt(document.getElementById('slider-q').value);

    const spatialData = generateMockBlock('spatial', transformType, quality, isLevelShifted);
    const quantMatrix = getScaledQuantizationMatrix(quality);
    const frequencyData = generateMockBlock('frequency', transformType, quality);

    renderMatrixGrid('matrix-spatial', spatialData, 'spatial', onCellHover);
    renderMatrixGrid('matrix-quantization', quantMatrix, 'quantization', onCellHover);
    renderMatrixGrid('matrix-frequency', frequencyData, 'frequency', onCellHover);
    
    updateRleTerminal(frequencyData);
    updateMetrics(quality);
}

function updateRleTerminal(quantizedBlock) {
    const terminal = document.getElementById('rle-stream-output');
    if (!terminal) return;

    let outputText = `Construcción de Paquetes Huffman...\n\n`;
    outputText += `[DIFERENCIAL DC: ${Math.round(quantizedBlock[0])}]\n`;
    
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

function updateMetrics(quality) {
    const psnrElement = document.getElementById('metric-psnr');
    const mseElement = document.getElementById('metric-mse');
    const ratioElement = document.getElementById('metric-ratio');
    if (!psnrElement) return;

    const mse = Math.max(1, 100 - quality) * 1.8; 
    const psnr = 10 * Math.log10((255 * 255) / mse);
    const compRatio = Math.max(2, 50 - (quality * 0.45));

    mseElement.textContent = mse.toFixed(2);
    psnrElement.textContent = `${psnr.toFixed(2)} dB`;
    ratioElement.textContent = `${compRatio.toFixed(1)} : 1`;
}