export function renderMatrixGrid(containerId, blockData, type = 'spatial') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < 64; i++) {
        const span = document.createElement('span');
        const val = blockData[i];
        
        span.textContent = Math.round(val);
        
        if (type === 'spatial') {
            const intensity = Math.min(255, Math.abs(val + 128));
            span.style.backgroundColor = `rgb(${intensity}, ${intensity}, ${intensity})`;
            span.style.color = intensity < 128 ? 'white' : 'black';
        } else {
            if (val === 0) {
                span.style.color = '#cccccc';
                span.style.backgroundColor = '#f9f9f9';
            } else {
                const alpha = Math.min(1, Math.abs(val) / 50);
                span.style.backgroundColor = `rgba(0, 51, 102, ${alpha * 0.4})`; /* ITBA blue overlay */
                span.style.color = '#000';
                span.style.fontWeight = 'bold';
            }
        }
        container.appendChild(span);
    }
}

// Función auxiliar para generar datos falsos y que no se vea en blanco
export function generateMockBlock(type, transformType = 'DCT') {
    const data = new Float64Array(64);
    if (type === 'spatial') {
        for (let i = 0; i < 64; i++) {
            // Simulamos datos centrados en 0 (después del level shift)
            data[i] = Math.floor(Math.random() * 255) - 128;
        }
    } else {
        // Simulamos esparsidad: mucha energía en el DC (índice 0), y ceros en el resto
        data[0] = transformType === 'DCT' ? 120 : 85; 
        for (let i = 1; i < 64; i++) {
            if (Math.random() > 0.75 && i < 15) {
                data[i] = Math.floor(Math.random() * 20) - 10;
            } else {
                data[i] = 0;
            }
        }
    }
    return data;
}