const STANDARD_LUMINANCE_QUANT_MATRIX = new Float64Array([
    16,  11,  10,  16,  24,  40,  51,  61,
    12,  12,  14,  19,  26,  58,  60,  55,
    14,  13,  16,  24,  40,  57,  69,  56,
    14,  17,  22,  29,  51,  87,  80,  62,
    18,  22,  37,  56,  68, 109, 103,  77,
    24,  35,  55,  64,  81, 104, 113,  92,
    49,  64,  78,  87, 103, 121, 120, 101,
    72,  92,  95,  98, 112, 100, 103,  99
]);

export function getScaledQuantizationMatrix(quality, spatialBlock, isAdaptive) {
    let S = quality < 50 ? 5000 / quality : 200 - 2 * quality;
    let adaptiveMultiplier = 1.0;
    let classification = "Estándar";

    // Clasificación por Varianza (Filtrado Adaptativo)
    if (isAdaptive && spatialBlock) {
        let mean = 0;
        for (let i = 0; i < 64; i++) mean += spatialBlock[i];
        mean /= 64;
        
        let variance = 0;
        for (let i = 0; i < 64; i++) variance += Math.pow(spatialBlock[i] - mean, 2);
        variance /= 64;

        if (variance < 50) {
            classification = "Plano (Varianza Baja)";
            adaptiveMultiplier = 0.5; // Menor cuantización (ojo muy sensible)
        } else if (variance > 1000) {
            classification = "Textura (Varianza Alta)";
            adaptiveMultiplier = 1.5; // Mayor cuantización (el ojo no nota el error)
        } else {
            classification = "Borde (Varianza Media)";
            adaptiveMultiplier = 1.0; 
        }
    }

    const scaledMatrix = new Float64Array(64);
    for (let i = 0; i < 64; i++) {
        let val = Math.floor((STANDARD_LUMINANCE_QUANT_MATRIX[i] * S * adaptiveMultiplier + 50) / 100);
        if (val < 1) val = 1;
        if (val > 255) val = 255;
        scaledMatrix[i] = val;
    }
    return { matrix: scaledMatrix, classification };
}