export function renderColorChannels(sourceCanvas, canvasY, canvasCb, canvasCr) {
    if (!sourceCanvas || !canvasY || !canvasCb || !canvasCr) return;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    [canvasY, canvasCb, canvasCr].forEach(c => {
        c.width = width;
        c.height = height;
    });

    try {
        const ctxSource = sourceCanvas.getContext('2d');
        const imgData = ctxSource.getImageData(0, 0, width, height);
        const data = imgData.data;

        const dataY = new Uint8ClampedArray(data.length);
        const dataCb = new Uint8ClampedArray(data.length);
        const dataCr = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            const y =  0.299 * r + 0.587 * g + 0.114 * b;
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            dataY[i] = dataY[i+1] = dataY[i+2] = y;
            dataY[i+3] = 255;

            dataCb[i] = 128;
            dataCb[i+1] = 128;
            dataCb[i+2] = cb;
            dataCb[i+3] = 255;

            dataCr[i] = cr;
            dataCr[i+1] = 128;
            dataCr[i+2] = 128;
            dataCr[i+3] = 255;
        }

        canvasY.getContext('2d').putImageData(new ImageData(dataY, width, height), 0, 0);
        canvasCb.getContext('2d').putImageData(new ImageData(dataCb, width, height), 0, 0);
        canvasCr.getContext('2d').putImageData(new ImageData(dataCr, width, height), 0, 0);

    } catch (error) {
        console.error("Error al procesar canales de color:", error);
    }
}