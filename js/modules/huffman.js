/**
 * Motor de Codificación de Huffman Real
 */

export function buildHuffmanTree(symbols) {
    if (!symbols || symbols.length === 0) return { codes: {}, table: [], stream: "" };

    // 1. Calcular frecuencias absolutas
    const freqs = {};
    symbols.forEach(sym => {
        freqs[sym] = (freqs[sym] || 0) + 1;
    });

    // 2. Crear nodos hoja
    let nodes = Object.keys(freqs).map(sym => ({
        symbol: sym,
        freq: freqs[sym],
        left: null,
        right: null
    }));

    // 3. Construir el árbol de Huffman (Bottom-Up)
    while (nodes.length > 1) {
        // Ordenar de menor a mayor frecuencia
        nodes.sort((a, b) => a.freq - b.freq);
        
        const left = nodes.shift();
        const right = nodes.shift();
        
        // Crear nodo padre
        nodes.push({
            symbol: null,
            freq: left.freq + right.freq,
            left: left,
            right: right
        });
    }

    // 4. Recorrer el árbol para asignar códigos binarios
    const codes = {};
    function traverse(node, currentCode) {
        if (node.symbol !== null) {
            // Si solo hay 1 símbolo en todo el bloque, asignamos '0' por defecto
            codes[node.symbol] = currentCode === "" ? "0" : currentCode;
        } else {
            if (node.left) traverse(node.left, currentCode + "0");
            if (node.right) traverse(node.right, currentCode + "1");
        }
    }
    
    if (nodes.length > 0) traverse(nodes[0], "");

    // 5. Preparar tabla ordenada para la UI (mayor frecuencia primero)
    const table = Object.keys(freqs).map(sym => ({
        symbol: sym,
        freq: freqs[sym],
        prob: ((freqs[sym] / symbols.length) * 100).toFixed(1),
        code: codes[sym]
    }));
    table.sort((a, b) => b.freq - a.freq);

    // 6. Generar el flujo binario final concatenado
    let stream = "";
    symbols.forEach(sym => {
        stream += codes[sym];
    });

    return { codes, table, stream };
}