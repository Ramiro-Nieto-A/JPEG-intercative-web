import { drawAllBases } from './modules/frequencyBases.js';
import { animateZigzag } from './modules/zigzagAnimator.js';
import { renderMatrixGrid, generateMockBlock } from './modules/heatmapRenderer.js';

document.addEventListener('DOMContentLoaded', () => {
    const selectTransform = document.getElementById('select-transform');
    const canvasBases = document.getElementById('canvas-bases');
    const canvasZigzag = document.getElementById('canvas-zigzag');
    const imageLoader = document.getElementById('image-loader');
    
    const canvasOriginal = document.getElementById('canvas-original');
    const emptyState = document.getElementById('empty-state');

    // 1. Inicializar Bases Frecuenciales
    if (canvasBases && selectTransform) {
        drawAllBases(canvasBases, selectTransform.value);
        selectTransform.addEventListener('change', () => {
            drawAllBases(canvasBases, selectTransform.value);
            updateInteractiveMatrices(selectTransform.value);
        });
    }

    // 2. Inicializar Animación Zig-Zag
    if (canvasZigzag) {
        animateZigzag(canvasZigzag);
    }

    // 3. Cargador de Imágenes robusto
    if (imageLoader && canvasOriginal) {
        const ctx = canvasOriginal.getContext('2d');
        
        imageLoader.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Ocultar texto, mostrar canvas
                    emptyState.style.display = 'none';
                    canvasOriginal.style.display = 'block';

                    // Asignar tamaño interno real de la imagen
                    canvasOriginal.width = img.width;
                    canvasOriginal.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    updateInteractiveMatrices(selectTransform.value);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        // 4. Calcular clic con precisión (mapeando tamaño visual vs interno)
        canvasOriginal.addEventListener('click', (e) => {
            const rect = canvasOriginal.getBoundingClientRect();
            
            // Factor de escala (tamaño real / tamaño visual)
            const scaleX = canvasOriginal.width / rect.width;
            const scaleY = canvasOriginal.height / rect.height;

            // Coordenadas internas del Canvas
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            updateInteractiveMatrices(selectTransform.value);
            
            // Efecto de feedback visual (Punto rojo sutil)
            ctx.fillStyle = 'rgba(255, 59, 48, 0.8)'; // Rojo Apple
            ctx.fillRect(x - 4, y - 4, 8, 8);
            
            setTimeout(() => {
                // Restaurar borrando el punto
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = canvasOriginal.toDataURL();
            }, 300);
        });
    }

    // Matrices vacías iniciales
    updateInteractiveMatrices('DCT');
});

function updateInteractiveMatrices(transformType) {
    const spatialData = generateMockBlock('spatial');
    const frequencyData = generateMockBlock('frequency', transformType);

    renderMatrixGrid('matrix-spatial', spatialData, 'spatial');
    renderMatrixGrid('matrix-frequency', frequencyData, 'frequency');
    updateRleTerminal(frequencyData);
}

function updateRleTerminal(quantizedBlock) {
    const terminal = document.getElementById('rle-stream-output');
    if (!terminal) return;

    let outputText = `Procesando Bloque...\n\n[DC: ${Math.round(quantizedBlock[0])}]\n`;
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
    outputText += acSymbols.length > 0 ? acSymbols.join(' -> ') : '[NULO] -> [EOB]';
    terminal.textContent = outputText;
}