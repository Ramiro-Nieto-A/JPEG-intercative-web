/**
 * Módulo de Espacio de Color
 * Extrae y renderiza los componentes de Luminancia (Y) y Crominancia (Cb, Cr).
 */

export function renderColorChannels(sourceCanvas, canvasY, canvasCb, canvasCr) {
    const ctxSource = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // Configurar dimensiones de los canvas destino
    [canvasY, canvasCb, canvasCr].forEach(c => {
        c.width = width;
        c.height = height;
    });

    const imgData = ctxSource.getImageData(0, 0, width, height);
    const data = imgData.data;

    const dataY = new Uint8ClampedArray(data.length);
    const dataCb = new Uint8ClampedArray(data.length);
    const dataCr = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        // Ecuaciones de conversión a YCbCr
        const y =  0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Luminancia (Escala de grises pura)
        dataY[i] = dataY[i+1] = dataY[i+2] = y;
        dataY[i+3] = 255; // Alpha

        // Crominancia Azul (Se visualiza con tinte azul-amarillo para docencia)
        dataCb[i] = 128;         // R neutral
        dataCb[i+1] = 128;       // G neutral
        dataCb[i+2] = cb;        // B capta la crominancia azul
        dataCb[i+3] = 255;

        // Crominancia Roja (Se visualiza con tinte rojo-verde)
        dataCr[i] = cr;          // R capta la crominancia roja
        dataCr[i+1] = 128;       // G neutral
        dataCr[i+2] = 128;       // B neutral
        dataCr[i+3] = 255;
    }

    canvasY.getContext('2d').putImageData(new ImageData(dataY, width, height), 0, 0);
    canvasCb.getContext('2d').putImageData(new ImageData(dataCb, width, height), 0, 0);
    canvasCr.getContext('2d').putImageData(new ImageData(dataCr, width, height), 0, 0);
}