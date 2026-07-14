import { drawAllBases } from './modules/frequencyBases.js';
import { animateZigzag } from './modules/zigzagAnimator.js';
import { renderMatrixGrid, generateMockBlock } from './modules/heatmapRenderer.js';

document.addEventListener('DOMContentLoaded', () => {
    const selectTransform = document.getElementById('select-transform');
    const canvasBases = document.getElementById('canvas-bases');
    const canvasZigzag = document.getElementById('canvas-zigzag');
    const imageLoader = document.getElementById('image-loader');
    const canvasOriginal = document.getElementById('canvas-original');

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

    // 3. Lógica para cargar imagen en el Canvas Original
    if (imageLoader && canvasOriginal) {
        const ctx = canvasOriginal.getContext('2d');
        
        imageLoader.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Ajustar el canvas a las dimensiones de la imagen
                    canvasOriginal.width = img.width;
                    canvasOriginal.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    // Actualizar matrices con datos simulados al cargar
                    updateInteractiveMatrices(selectTransform.value);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        // Evento de clic sobre la imagen para inspeccionar bloque
        canvasOriginal.addEventListener('click', (e) => {
            // Aquí puedes conectar tu lógica real de extracción de bloques.
            // Por ahora, actualiza las gráficas reactivamente para mostrar interacción.
            updateInteractiveMatrices(selectTransform.value);
            
            // Efecto visual rápido de clic
            const rect = canvasOriginal.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(x - 4, y - 4, 8, 8);
            setTimeout(() => {
                // Redibujar imagen para limpiar el cuadradito rojo
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = canvasOriginal.toDataURL();
            }, 300);
        });
    }

    // Inicializar matrices vacías/mock al inicio
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

    let outputText = `ITBA ASSD - Compresor JPEG\n`;
    outputText += `Procesando Bloque de 8x8...\n\n`;
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
    
    if (zeroCount > 0) acSymbols.push('[EOB]');

    outputText += acSymbols.length > 0 ? acSymbols.join(' -> ') : '[BLOQUE NULO] -> [EOB]';
    terminal.textContent = outputText;
}