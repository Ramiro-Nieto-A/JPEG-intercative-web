import { rgbToYCbCr, yCbCrToRGB } from './modules/colorSpace.js';

const sourceCanvas = document.getElementById('source-canvas');
const outputCanvas = document.getElementById('output-canvas');
const ctxSrc = sourceCanvas.getContext('2d');
const ctxOut = outputCanvas.getContext('2d');
const sampleSelect = document.getElementById('sample-select');
const qualityRange = document.getElementById('quality-range');
const compressBtn = document.getElementById('compress-btn');
const metricsDiv = document.getElementById('metrics-output');

// Populate sample selector (placeholder list)
const samples = [
  // Add sample filenames here (e.g., 'samples/img1.jpg')
];
function populateSamples() {
  samples.forEach((src) => {
    const opt = document.createElement('option');
    opt.value = src;
    opt.textContent = src.split('/').pop();
    sampleSelect.appendChild(opt);
  });
}
populateSamples();

function loadImage(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctxSrc.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    ctxSrc.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
    ctxOut.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    ctxOut.drawImage(img, 0, 0, outputCanvas.width, outputCanvas.height);
  };
  img.src = src;
}

sampleSelect.addEventListener('change', (e) => {
  const src = e.target.value;
  if (src) loadImage(src);
});

compressBtn.addEventListener('click', () => {
  // Placeholder: just copy source to output (no compression yet)
  const imageData = ctxSrc.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  // Here you would send imageData to a Web Worker for JPEG pipeline.
  // For now we just copy.
  ctxOut.putImageData(imageData, 0, 0);
  // Update metrics (placeholder)
  metricsDiv.textContent = Calidad Q= (simulado);
});
