/**
 * Matriz de cuantización de Luminancia estándar de JPEG (Recomendación T.81).
 * Representa la sensibilidad del ojo humano a distintas frecuencias espaciales.
 */
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

/**
 * Escala la matriz estándar según el Factor de Calidad (Q) [1-100].
 */
export function getScaledQuantizationMatrix(quality) {
    let S;
    if (quality < 50) {
        S = 5000 / quality;
    } else {
        S = 200 - 2 * quality;
    }

    const scaledMatrix = new Float64Array(64);
    for (let i = 0; i < 64; i++) {
        let val = Math.floor((STANDARD_LUMINANCE_QUANT_MATRIX[i] * S + 50) / 100);
        
        // Evitar división por 0, el valor mínimo de cuantización es 1
        if (val < 1) val = 1;
        // Evitar desbordamientos, truncar a 255 (8 bits)
        if (val > 255) val = 255;
        
        scaledMatrix[i] = val;
    }
    return scaledMatrix;
}