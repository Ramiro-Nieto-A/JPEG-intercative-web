export function renderMatrixGrid(containerId, blockData, type, hoverCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < 64; i++) {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const span = document.createElement('span');
        const val = blockData[i];
        
        span.textContent = Math.round(val);
        
        // Estilos según el tipo de matriz
        if (type === 'spatial') {
            // Mapeo a grises. Rango depende si hubo level shift
            const intensity = val < 0 ? Math.min(255, Math.abs(val + 128)) : Math.min(255, val);
            span.style.backgroundColor = `rgb(${intensity}, ${intensity}, ${intensity})`;
            span.style.color = intensity < 128 ? 'white' : 'black';
        } else if (type === 'quantization') {
            // Tonos rojizos/naranjas para matriz de cuantización
            const alpha = Math.min(1, val / 150);
            span.style.backgroundColor = `rgba(255, 102, 0, ${alpha * 0.4})`;
            span.style.color = '#333';
        } else {
            // Frecuencia
            if (val === 0) {
                span.style.color = '#cccccc';
                span.style.backgroundColor = '#f9f9f9';
            } else {
                const alpha = Math.min(1, Math.abs(val) / 50);
                span.style.backgroundColor = `rgba(0, 51, 102, ${alpha * 0.4})`;
                span.style.color = '#000';
                span.style.fontWeight = 'bold';
            }
        }

        // Lógica de HOVER EDUCATIVO (Sección 1, 3 y 4 del PDF)
        span.addEventListener('mouseenter', () => {
            if (!hoverCallback) return;
            let explanation = `<strong>Posición (Fila ${row}, Col ${col}):</strong> `;
            
            if (type === 'spatial') {
                explanation += `Píxel en el dominio espacial. Valor numérico: ${Math.round(val)}. Representa la intensidad luminosa (luminancia) en esa zona del bloque de 8x8.`;
            } else if (type === 'quantization') {
                explanation += `El coeficiente de frecuencia en esta misma posición se dividirá por <strong>${Math.round(val)}</strong>. Mientras más alto es el número, más información se descarta (cuantización).`;
            } else if (type === 'frequency') {
                if (row === 0 && col === 0) {
                    explanation += `<strong>Coeficiente DC.</strong> Valor: ${Math.round(val)}. Representa la energía media o brillo promedio de todo el bloque 8x8.`;
                } else if (val === 0) {
                    explanation += `<strong>Coeficiente AC.</strong> Fue reducido a 0 tras la cuantización. Esto aporta a la <em>esparsidad</em>, permitiendo comprimir secuencias largas con la codificación RLE.`;
                } else {
                    explanation += `<strong>Coeficiente AC.</strong> Valor: ${Math.round(val)}. Contiene información de detalles ${row + col > 7 ? 'de alta frecuencia (bordes)' : 'de baja/media frecuencia'}.`;
                }
            }
            hoverCallback(explanation);
        });

        span.addEventListener('mouseleave', () => {
            if (hoverCallback) hoverCallback("Pasa el mouse sobre cualquier valor de las matrices de abajo para inspeccionar su significado.");
        });

        container.appendChild(span);
    }
}

// Simulador actualizado
export function generateMockBlock(type, transformType = 'DCT', quality = 50, isLevelShifted = true) {
    const data = new Float64Array(64);
    if (type === 'spatial') {
        for (let i = 0; i < 64; i++) {
            // Si está level shifted, oscila entre -128 y 127. Si no, entre 0 y 255.
            data[i] = isLevelShifted ? Math.floor(Math.random() * 255) - 128 : Math.floor(Math.random() * 255);
        }
    } else {
        data[0] = transformType === 'DCT' ? 120 : 85; 
        const sparsenessThreshold = quality / 100; 
        for (let i = 1; i < 64; i++) {
            if (Math.random() < sparsenessThreshold && i < (10 + quality/3)) {
                data[i] = Math.floor(Math.random() * 20) - 10;
            } else {
                data[i] = 0; 
            }
        }
    }
    return data;
}