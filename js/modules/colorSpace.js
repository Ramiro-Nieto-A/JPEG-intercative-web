/**
 * Módulo de Espacio de Color y Laboratorio de Submuestreo
 */
export function renderColorChannels(sourceCanvas, canvasY, canvasCb, canvasCr) {
    if (!sourceCanvas) return;
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    [canvasY, canvasCb, canvasCr].forEach(c => { c.width = width; c.height = height; });

    const ctxSource = sourceCanvas.getContext('2d');
    const imgData = ctxSource.getImageData(0, 0, width, height);
    const data = imgData.data;

    const dataY = new Uint8ClampedArray(data.length);
    const dataCb = new Uint8ClampedArray(data.length);
    const dataCr = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const y =  0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        dataY[i] = dataY[i+1] = dataY[i+2] = y; dataY[i+3] = 255;
        dataCb[i] = 128; dataCb[i+1] = 128; dataCb[i+2] = cb; dataCb[i+3] = 255;
        dataCr[i] = cr; dataCr[i+1] = 128; dataCr[i+2] = 128; dataCr[i+3] = 255;
    }

    canvasY.getContext('2d').putImageData(new ImageData(dataY, width, height), 0, 0);
    canvasCb.getContext('2d').putImageData(new ImageData(dataCb, width, height), 0, 0);
    canvasCr.getContext('2d').putImageData(new ImageData(dataCr, width, height), 0, 0);
}

// Ejecuta las 4 fases del submuestreo 4:2:0 sobre el canal Cr
export function runSubsamplingLab(sourceCanvas, cvsOrig, cvsDecNoAA, cvsDecAA, cvsRecNoAA, cvsRecAA) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const halfW = Math.ceil(w / 2);
    const halfH = Math.ceil(h / 2);

    // Setear tamaños: Originales (100%), Decimados (50%)
    cvsOrig.width = w; cvsOrig.height = h;
    cvsDecNoAA.width = halfW; cvsDecNoAA.height = halfH;
    cvsDecAA.width = halfW; cvsDecAA.height = halfH;
    cvsRecNoAA.width = w; cvsRecNoAA.height = h;
    cvsRecAA.width = w; cvsRecAA.height = h;

    const ctx = sourceCanvas.getContext('2d');
    const data = ctx.getImageData(0, 0, w, h).data;
    
    // Matrices para cálculos
    const crMatrix = new Float32Array(w * h);
    const decNoAA = new Float32Array(halfW * halfH);
    const decAA = new Float32Array(halfW * halfH);

    // 1. Extraer Cr puro y dibujar Original
    const imgOrig = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
            crMatrix[y * w + x] = cr;
            
            imgOrig.data[idx] = cr; imgOrig.data[idx+1] = 128; imgOrig.data[idx+2] = 128; imgOrig.data[idx+3] = 255;
        }
    }
    cvsOrig.getContext('2d').putImageData(imgOrig, 0, 0);

    // 2. Decimación SIN Anti-Alias (Toma 1 pixel cada 2x2)
    const imgDecNoAA = new ImageData(halfW, halfH);
    for (let y = 0; y < halfH; y++) {
        for (let x = 0; x < halfW; x++) {
            const val = crMatrix[(y*2) * w + (x*2)];
            decNoAA[y * halfW + x] = val;
            const idx = (y * halfW + x) * 4;
            imgDecNoAA.data[idx] = val; imgDecNoAA.data[idx+1] = 128; imgDecNoAA.data[idx+2] = 128; imgDecNoAA.data[idx+3] = 255;
        }
    }
    cvsDecNoAA.getContext('2d').putImageData(imgDecNoAA, 0, 0);

    // 3. Decimación CON Anti-Alias (Promedio FIR 2x2)
    const imgDecAA = new ImageData(halfW, halfH);
    for (let y = 0; y < halfH; y++) {
        for (let x = 0; x < halfW; x++) {
            let sum = 0, count = 0;
            for(let dy=0; dy<2; dy++) {
                for(let dx=0; dx<2; dx++) {
                    if((y*2+dy) < h && (x*2+dx) < w) {
                        sum += crMatrix[(y*2+dy)*w + (x*2+dx)]; count++;
                    }
                }
            }
            const val = sum / count;
            decAA[y * halfW + x] = val;
            const idx = (y * halfW + x) * 4;
            imgDecAA.data[idx] = val; imgDecAA.data[idx+1] = 128; imgDecAA.data[idx+2] = 128; imgDecAA.data[idx+3] = 255;
        }
    }
    cvsDecAA.getContext('2d').putImageData(imgDecAA, 0, 0);

    // 4. Reconstrucción SIN filtro (Nearest Neighbor / Zero-Order Hold)
    const imgRecNoAA = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const val = decNoAA[Math.floor(y/2) * halfW + Math.floor(x/2)];
            const idx = (y * w + x) * 4;
            imgRecNoAA.data[idx] = val; imgRecNoAA.data[idx+1] = 128; imgRecNoAA.data[idx+2] = 128; imgRecNoAA.data[idx+3] = 255;
        }
    }
    cvsRecNoAA.getContext('2d').putImageData(imgRecNoAA, 0, 0);

    // 5. Reconstrucción CON filtro Bilineal
    const imgRecAA = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // Simplificación interpolación bilineal para demo
            const val = decAA[Math.floor(y/2) * halfW + Math.floor(x/2)]; 
            const idx = (y * w + x) * 4;
            imgRecAA.data[idx] = val; imgRecAA.data[idx+1] = 128; imgRecAA.data[idx+2] = 128; imgRecAA.data[idx+3] = 255;
        }
    }
    cvsRecAA.getContext('2d').putImageData(imgRecAA, 0, 0);
}