/**
 * Módulo de Espacio de Color y Submuestreo
 */
export function renderColorChannels(sourceCanvas, canvasY, canvasCb, canvasCr, subsamplingMode) {
    if (!sourceCanvas || !canvasY || !canvasCb || !canvasCr) return;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    [canvasY, canvasCb, canvasCr].forEach(c => { c.width = width; c.height = height; });

    const ctxSource = sourceCanvas.getContext('2d');
    const imgData = ctxSource.getImageData(0, 0, width, height);
    const data = imgData.data;

    const dataY = new Uint8ClampedArray(data.length);
    const dataCb = new Uint8ClampedArray(data.length);
    const dataCr = new Uint8ClampedArray(data.length);

    // 1. Conversión RGB a YCbCr
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const y =  0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        dataY[i] = dataY[i+1] = dataY[i+2] = y; dataY[i+3] = 255;
        dataCb[i] = 128; dataCb[i+1] = 128; dataCb[i+2] = cb; dataCb[i+3] = 255;
        dataCr[i] = cr; dataCr[i+1] = 128; dataCr[i+2] = 128; dataCr[i+3] = 255;
    }

    // 2. Aplicar Submuestreo 4:2:0 si se selecciona
    if (subsamplingMode === '420') {
        for (let y = 0; y < height; y += 2) {
            for (let x = 0; x < width; x += 2) {
                // Filtro promedio 2x2 para Anti-Aliasing de Crominancia
                let sumCb = 0, sumCr = 0, count = 0;
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        if (x + dx < width && y + dy < height) {
                            let idx = ((y + dy) * width + (x + dx)) * 4;
                            sumCb += dataCb[idx + 2];
                            sumCr += dataCr[idx];
                            count++;
                        }
                    }
                }
                const avgCb = sumCb / count;
                const avgCr = sumCr / count;

                // Re-asignar el valor promediado al bloque 2x2 (Upsampling por repetición para mostrar)
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        if (x + dx < width && y + dy < height) {
                            let idx = ((y + dy) * width + (x + dx)) * 4;
                            dataCb[idx + 2] = avgCb;
                            dataCr[idx] = avgCr;
                        }
                    }
                }
            }
        }
    }

    canvasY.getContext('2d').putImageData(new ImageData(dataY, width, height), 0, 0);
    canvasCb.getContext('2d').putImageData(new ImageData(dataCb, width, height), 0, 0);
    canvasCr.getContext('2d').putImageData(new ImageData(dataCr, width, height), 0, 0);
}