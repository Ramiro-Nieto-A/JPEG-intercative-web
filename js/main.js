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
let realImageData = null; // Guardamos la imagen real en memoria
let imgWidth = 0;
let imgHeight = 0;

document.addEventListener('DOMContentLoaded', () => {
    const selectTransform = document.getElementById('select-transform');
    const selectSubsampling = document.getElementById('select-subsampling');
    const sliderQ = document.getElementById('slider-q');
    const checkAdaptive = document.getElementById('check-adaptive');
    const qValueDisplay = document.getElementById('q-value');
    const btnToggleShift = document.getElementById('btn-toggle-shift');
    
    const canvasBases = document.getElementById('canvas-bases');
    const canvasZigzag = document.getElementById('canvas-zigzag');
    const imageLoader = document.getElementById('image-loader');
    const canvasOriginal = document.getElementById('canvas-original');
    
    const canvasY = document.getElementById('canvas-y');
    const canvasCb = document.getElementById('canvas-cb');
    const canvasCr = document.getElementById('canvas-cr');

    if (canvasBases && selectTransform) {
        drawAllBases(canvasBases, selectTransform.value);
        selectTransform.addEventListener('change', () => {
            drawAllBases(canvasBases, selectTransform.value);
            updatePipeline();
        });
    }

    if (canvasZigzag) animateZigzag(canvasZigzag);

    [sliderQ, checkAdaptive, selectSubsampling].forEach(el => {
        if (el) el.addEventListener('input', () => {
            if (el.id === 'slider-q') qValueDisplay.textContent = el.value;
            if (el.id === 'select-subsampling') processFullImage();
            updatePipeline();
        });
    });

    if (btnToggleShift) {
        btnToggleShift.addEventListener('click', () => {
            isLevelShifted = !isLevelShifted;
            btnToggleShift.textContent = isLevelShifted ? "Ver: Píxeles Originales [0, 255]" : "Ver: Corrimiento Nivel [-128, 127]";
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
                    document.getElementById('empty-state').style.display = 'none';
                    canvasOriginal.style.display = 'block';
                    
                    // Ajustar el canvas al tamaño real de la imagen para que el getBoundingClientRect funcione preciso
                    canvasOriginal.width = img.width;
                    canvasOriginal.height = img.height;
                    imgWidth = img.width;
                    imgHeight = img.height;
                    
                    ctx.drawImage(img, 0, 0);
                    // Guardar los datos en memoria para no depender del DOM al extraer
                    realImageData = ctx.getImageData(0, 0, imgWidth, imgHeight).data;
                    hasImage = true;
                    
                    currentSelectedX = Math.floor(imgWidth / 2);
                    currentSelectedY = Math.floor(imgHeight / 2);

                    processFullImage();
                    updatePipeline();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        canvasOriginal.addEventListener('click', (e) => {
            if (!hasImage) return;
            const rect = canvasOriginal.getBoundingClientRect();
            // Corrección matemática precisa para el clic
            const scaleX = canvasOriginal.width / rect.width;
            const scaleY = canvasOriginal.height / rect.height;
            
            currentSelectedX = Math.floor((e.clientX - rect.left) * scaleX);
            currentSelectedY = Math.floor((e.clientY - rect.top) * scaleY);

            updatePipeline();
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(currentSelectedX - 4, currentSelectedY - 4, 8, 8);
            setTimeout(() => {
                ctx.clearRect(0,0, imgWidth, imgHeight);
                const imgDataObj = new ImageData(realImageData, imgWidth, imgHeight);
                ctx.putImageData(imgDataObj, 0, 0);
            }, 300);
        });
    }

    function processFullImage() {
        if (!hasImage) return;
        const subMode = document.getElementById('select-subsampling').value;
        renderColorChannels(canvasOriginal, canvasY, canvasCb, canvasCr, subMode);
    }
});

function onCellHover(text) {
    const hoverInfo = document.getElementById('hover-info');
    if (hoverInfo) hoverInfo.innerHTML = text;
}

// Extracción limpia desde memoria, no del canvas visual
function extract8x8Block(startX, startY) {
    const block = new Float64Array(64);
    if (!hasImage || !realImageData) return block;

    let x = Math.min(Math.max(0, startX), imgWidth - 8);
    let y = Math.min(Math.max(0, startY), imgHeight - 8);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const idx = ((y + r) * imgWidth + (x + c)) * 4;
            const rVal = realImageData[idx];
            const gVal = realImageData[idx + 1];
            const bVal = realImageData[idx + 2];
            block[r * 8 + c] = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
        }
    }
    return block;
}

function updatePipeline() {
    if (!hasImage) return;

    const quality = parseInt(document.getElementById('slider-q').value);
    const isAdaptive = document.getElementById('check-adaptive').checked;
    const transformType = document.getElementById('select-transform').value;

    const rawPixels = extract8x8Block(currentSelectedX, currentSelectedY);
    
    // Obtener Matriz de Cuantización Adaptativa
    const { matrix: quantMatrix, classification } = getScaledQuantizationMatrix(quality, rawPixels, isAdaptive);
    document.getElementById('block-class-label').textContent = classification;

    const shiftedBlock = new Float64Array(64);
    for (let i = 0; i < 64; i++) shiftedBlock[i] = rawPixels[i] - 128;

    const displaySpatial = isLevelShifted ? shiftedBlock : rawPixels;
    
    // Si se eligió Hadamard, aquí se llamaría a computeWHT2D (se deja DCT por defecto)
    const dctCoeffs = computeDCT2D(shiftedBlock);
    const quantizedCoeffs = quantizeBlock(dctCoeffs, quantMatrix);
    
    const dequantizedCoeffs = dequantizeBlock(quantizedCoeffs, quantMatrix);
    const reconstructedShifted = computeIDCT2D(dequantizedCoeffs);
    
    const reconstructedPixels = new Float64Array(64);
    for (let i = 0; i < 64; i++) reconstructedPixels[i] = reconstructedShifted[i] + 128;

    const metrics = calculateMetrics(rawPixels, reconstructedPixels);

    renderMatrixGrid('matrix-spatial', displaySpatial, 'spatial', onCellHover);
    renderMatrixGrid('matrix-quantization', quantMatrix, 'quantization', onCellHover);
    renderMatrixGrid('matrix-frequency', quantizedCoeffs, 'frequency', onCellHover);
    
    updateRleTerminal(quantizedCoeffs);
    updateMetricsUI(metrics.mse, metrics.psnr, quantizedCoeffs);
}

function updateRleTerminal(quantizedBlock) {
    const terminal = document.getElementById('rle-stream-output');
    if (!terminal) return;

    let zeroCount = 0;
    let acSymbols = [];
    
    // Generar RLE
    for (let i = 1; i < 64; i++) {
        if (quantizedBlock[i] === 0) {
            zeroCount++;
        } else {
            acSymbols.push(`(${zeroCount}, ${Math.round(quantizedBlock[i])})`);
            zeroCount = 0;
        }
    }
    if (zeroCount > 0) acSymbols.push('EOB');

    // Generar Simulación de Codificación Huffman Binaria
    let huffmanStream = `<span class="huffman-code">1010</span> `; // DC simulado
    acSymbols.forEach(sym => {
        if (sym === 'EOB') huffmanStream += `<span class="huffman-code">1010</span> `;
        else {
            // Generar código binario dummy basado en magnitud
            const binLen = Math.max(1, Math.abs(parseInt(sym.split(',')[1])) % 6 + 2);
            let bin = '';
            for(let k=0; k<binLen; k++) bin += Math.random() > 0.5 ? '1' : '0';
            huffmanStream += `${sym}=<span class="huffman-code">${bin}</span> `;
        }
    });

    let outputText = `Símbolos RLE del Bloque:\n${acSymbols.join(' -> ')}\n\n`;
    outputText += `Flujo Binario (Huffman): \n${huffmanStream}`;
    
    terminal.innerHTML = outputText;
}

function updateMetricsUI(mse, psnr, quantizedBlock) {
    let zeroCount = 0;
    for (let i = 0; i < 64; i++) if (quantizedBlock[i] === 0) zeroCount++;
    const realCompressionRatio = (64 / (64 - zeroCount + 0.1)).toFixed(1);

    document.getElementById('metric-mse').textContent = mse.toFixed(2);
    document.getElementById('metric-psnr').textContent = `${psnr.toFixed(2)} dB`;
    document.getElementById('metric-ratio').textContent = `${realCompressionRatio} : 1`;
}