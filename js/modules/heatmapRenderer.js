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
        
        if (type === 'spatial') {
            const intensity = val < 0 ? Math.min(255, Math.abs(val + 128)) : Math.min(255, val);
            span.style.backgroundColor = `rgb(${intensity}, ${intensity}, ${intensity})`;
            span.style.color = intensity < 128 ? 'white' : 'black';
        } else if (type === 'quantization') {
            const alpha = Math.min(1, val / 150);
            span.style.backgroundColor = `rgba(255, 102, 0, ${alpha * 0.4})`;
            span.style.color = '#333';
        } else {
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

        // Hover Educativo Profesional
        span.addEventListener('mouseenter', () => {
            if (!hoverCallback) return;
            let explanation = `<strong>Coordenada (${row}, ${col}):</strong> `;
            
            if (type === 'spatial') {
                explanation += `Valor en el dominio espacial (${Math.round(val)}). Representa la intensidad o nivel de luminancia del píxel antes de ser transformado al dominio de la frecuencia.`;
            } else if (type === 'quantization') {
                explanation += `Paso de cuantización (${Math.round(val)}). Durante la compresión, la amplitud de la frecuencia correspondiente se divide por este valor, descartando información visualmente redundante.`;
            } else if (type === 'frequency') {
                if (row === 0 && col === 0) {
                    explanation += `<strong>Coeficiente DC.</strong> Valor: ${Math.round(val)}. Concentra la energía media del bloque (promedio de iluminación). En JPEG se codifica diferencialmente respecto al bloque anterior.`;
                } else if (val === 0) {
                    explanation += `<strong>Coeficiente AC Nulo.</strong> La cuantización eliminó este detalle. Esto incrementa la esparsidad matricial, permitiendo que la codificación RLE comprima el bloque eficientemente.`;
                } else {
                    explanation += `<strong>Coeficiente AC.</strong> Valor: ${Math.round(val)}. Detalle residual de ${row + col > 7 ? 'alta frecuencia (bordes agudos o ruido)' : 'baja/media frecuencia (transiciones suaves)'}.`;
                }
            }
            hoverCallback(explanation);
        });

        span.addEventListener('mouseleave', () => {
            if (hoverCallback) hoverCallback("Interactúa con el flujo de datos numéricos para comprender la matemática de la compresión.");
        });

        container.appendChild(span);
    }
}

export function generateMockBlock(type, transformType = 'DCT', quality = 50, isLevelShifted = true) {
    const data = new Float64Array(64);
    if (type === 'spatial') {
        for (let i = 0; i < 64; i++) {
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