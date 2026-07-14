import { drawAllBases } from './modules/frequencyBases.js';
import { animateZigzag } from './modules/zigzagAnimator.js';
import { renderMatrixGrid } from './modules/heatmapRenderer.js';
import { getScaledQuantizationMatrix } from './modules/quantization.js';
import { renderColorChannels, runSubsamplingLab } from './modules/colorSpace.js';
import { computeDCT2D, computeIDCT2D, quantizeBlock, dequantizeBlock, calculateMetrics } from './modules/dctEngine.js';
import { buildHuffmanTree } from './modules/huffman.js';

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

    // Inicializar Bases
    if (canvasBases && selectTransform) {
        drawAllBases(canvasBases, selectTransform.value);
        selectTransform.addEventListener('change', () => {
            drawAllBases(canvasBases, selectTransform.value);
            updatePipeline();
        });
    }

    if (canvasZigzag) animateZigzag(canvasZigzag);

    // Eventos de controles
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

    // Cargador de Imágenes
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
                    
                    // Mostrar panel de submuestreo
                    const subsamplingPanel = document.getElementById('subsampling-panel');
                    if (subsamplingPanel) subsamplingPanel.style.display = 'block';
                    
                    // Ajustar el canvas al tamaño real de la imagen
                    canvasOriginal.width = img.width;
                    canvasOriginal.height = img.height;
                    imgWidth = img.width;
                    imgHeight = img.height;
                    
                    ctx.drawImage(img, 0, 0);
                    // Guardar los datos en memoria
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

        // Click en la imagen original para extraer bloque
        canvasOriginal.addEventListener('click', (e) => {
            if (!hasImage) return;
            const rect = canvasOriginal.getBoundingClientRect();
            const scaleX = canvasOriginal.width / rect.width;
            const scaleY = canvasOriginal.height / rect.height;
            
            currentSelectedX = Math.floor((e.clientX - rect.left) * scaleX);
            currentSelectedY = Math.floor((e.clientY - rect.top) * scaleY);

            updatePipeline();
            
            // Punto rojo indicador
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
        // Procesar canales base
        renderColorChannels(canvasOriginal, canvasY, canvasCb, canvasCr);
        
        // Ejecutar laboratorio visual de submuestreo
        const cvsOrig = document.getElementById('cvs-cr-orig');
        const cvsDecNoAA = document.getElementById('cvs-cr-dec-noaa');
        const cvsDecAA = document.getElementById('cvs-cr-dec-aa');
        const cvsRecNoAA = document.getElementById('cvs-cr-rec-noaa');
        const cvsRecAA = document.getElementById('cvs-cr-rec-aa');
        
        if (cvsOrig && cvsDecNoAA) {
            runSubsamplingLab(canvasOriginal, cvsOrig, cvsDecNoAA, cvsDecAA, cvsRecNoAA, cvsRecAA);
        }
    }
});

// Helper de hover
function onCellHover(text) {
    const hoverInfo = document.getElementById('hover-info');
    if (hoverInfo) hoverInfo.innerHTML = text;
}

// Extracción limpia desde memoria
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

// ORQUESTADOR MATEMÁTICO PRINCIPAL
function updatePipeline() {
    if (!hasImage) return;

    const quality = parseInt(document.getElementById('slider-q').value);
    const isAdaptive = document.getElementById('check-adaptive').checked;
    
    // 1. Extraer píxeles
    const rawPixels = extract8x8Block(currentSelectedX, currentSelectedY);
    
    // 2. Obtener Matriz de Cuantización Adaptativa (Exporta varianza y clasificación)
    const { matrix: quantMatrix, classification, variance, multiplier } = getScaledQuantizationMatrix(quality, rawPixels, isAdaptive);
    
    // Actualizar panel de info
    const varLabel = document.getElementById('block-variance-label');
    const classLabel = document.getElementById('block-class-label');
    const multLabel = document.getElementById('block-mult-label');
    
    if(varLabel) varLabel.textContent = `Varianza: ${variance.toFixed(2)}`;
    if(classLabel) classLabel.textContent = `Clasificación: ${classification}`;
    if(multLabel) multLabel.textContent = `Multiplicador Matriz: x${multiplier}`;

    // 3. Corrimiento de Nivel
    const shiftedBlock = new Float64Array(64);
    for (let i = 0; i < 64; i++) shiftedBlock[i] = rawPixels[i] - 128;

    const displaySpatial = isLevelShifted ? shiftedBlock : rawPixels;
    
    // 4. Transformada y Cuantización
    const dctCoeffs = computeDCT2D(shiftedBlock);
    const quantizedCoeffs = quantizeBlock(dctCoeffs, quantMatrix);
    
    // 5. Reconstrucción y Cálculo de Métricas
    const dequantizedCoeffs = dequantizeBlock(quantizedCoeffs, quantMatrix);
    const reconstructedShifted = computeIDCT2D(dequantizedCoeffs);
    
    const reconstructedPixels = new Float64Array(64);
    for (let i = 0; i < 64; i++) reconstructedPixels[i] = reconstructedShifted[i] + 128;

    const metrics = calculateMetrics(rawPixels, reconstructedPixels);

    // Renderizar Rejillas visuales
    renderMatrixGrid('matrix-spatial', displaySpatial, 'spatial', onCellHover);
    renderMatrixGrid('matrix-quantization', quantMatrix, 'quantization', onCellHover);
    renderMatrixGrid('matrix-frequency', quantizedCoeffs, 'frequency', onCellHover);
    
    // Actualizar Entropía y Métricas
    updateEntropyTerminal(quantizedCoeffs);
    updateMetricsUI(metrics.mse, metrics.psnr, quantizedCoeffs);
}

// CONSTRUCTOR DE ENTROPÍA (RLE + HUFFMAN)
function updateEntropyTerminal(quantizedBlock) {
    let zeroCount = 0;
    let rleSymbols = [];
    
    // 1. Generar Vector RLE
    rleSymbols.push(`DC(${Math.round(quantizedBlock[0])})`);
    for (let i = 1; i < 64; i++) {
        if (quantizedBlock[i] === 0) {
            zeroCount++;
        } else {
            rleSymbols.push(`(${zeroCount}, ${Math.round(quantizedBlock[i])})`);
            zeroCount = 0;
        }
    }
    if (zeroCount > 0) rleSymbols.push('EOB');

    // 2. Construir Diccionario y Árbol Huffman real
    const huffmanData = buildHuffmanTree(rleSymbols);
    
    // 3. Inyectar datos en la Tabla HTML
    const tbody = document.getElementById('huffman-tbody');
    if (tbody) {
        tbody.innerHTML = '';
        huffmanData.table.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.symbol}</td>
                <td>${row.freq}</td>
                <td>${row.prob}%</td>
                <td class="huffman-code-cell">${row.code}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 4. Mostrar el flujo binario final
    const streamContainer = document.getElementById('huffman-stream');
    if (streamContainer) {
        streamContainer.textContent = huffmanData.stream;
    }
}

function updateMetricsUI(mse, psnr, quantizedBlock) {
    let zeroCount = 0;
    for (let i = 0; i < 64; i++) if (quantizedBlock[i] === 0) zeroCount++;
    const realCompressionRatio = (64 / (64 - zeroCount + 0.1)).toFixed(1);

    const mseEl = document.getElementById('metric-mse');
    const psnrEl = document.getElementById('metric-psnr');
    const ratioEl = document.getElementById('metric-ratio');

    if(mseEl) mseEl.textContent = mse.toFixed(2);
    if(psnrEl) psnrEl.textContent = `${psnr.toFixed(2)} dB`;
    if(ratioEl) ratioEl.textContent = `${realCompressionRatio} : 1`;
}