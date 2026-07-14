import { drawAllBases } from './modules/frequencyBases.js';
import { animateZigzag } from './modules/zigzagAnimator.js';
import { renderMatrixGrid, generateMockBlock } from './modules/heatmapRenderer.js';

document.addEventListener('DOMContentLoaded', () => {
    const selectTransform = document.getElementById('select-transform');
    const canvasBases = document.getElementById('canvas-bases');
    const canvasZigzag = document.getElementById('canvas-zigzag');
    const terminal = document.getElementById('rle-stream-output');

    // 1. Inicializar el canvas de bases (DCT por defecto)
    if (canvasBases && selectTransform) {
        drawAllBases(canvasBases, selectTransform.value);
        
        selectTransform.addEventListener('change', () => {
            drawAllBases(canvasBases, selectTransform.value);
            // Al cambiar transformada, actualizamos los datos de prueba numéricos
            updateInteractiveMatrices(selectTransform.value);
        });
    }

    // 2. Inicializar la animación Zig-Zag
    if (canvasZigzag) {
        animateZigzag(canvasZigzag);
    }

    // 3. Inicializar las matrices numéricas con datos de prueba
    updateInteractiveMatrices('DCT');
});

// Función para simular y renderizar los datos del bloque (Espacial y Frecuencial)
function updateInteractiveMatrices(transformType) {
    const spatialData = generateMockBlock('spatial');
    const frequencyData = generateMockBlock('frequency', transformType);

    renderMatrixGrid('matrix-spatial', spatialData, 'spatial');
    renderMatrixGrid('matrix-frequency', frequencyData, 'frequency');
    updateRleTerminal(frequencyData);
}

// Genera la cadena RLE para la consola
function updateRleTerminal(quantizedBlock) {
    const terminal = document.getElementById('rle-stream-output');
    if (!terminal) return;

    let outputText = `ITBA ASSD - Compresor JPEG\n`;
    outputText += `Procesando Bloque...\n\n`;
    outputText += `[DC COEFF: ${Math.round(quantizedBlock[0])}]\n`;
    
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
    
    if (zeroCount > 0) {
        acSymbols.push('[EOB]');
    }

    outputText += acSymbols.length > 0 ? acSymbols.join(' -> ') : '[BLOQUE NULO] -> [EOB]';
    terminal.textContent = outputText;
}