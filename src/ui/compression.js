import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import * as avif from '@jsquash/avif';
import * as jpeg from '@jsquash/jpeg';
import * as webp from '@jsquash/webp';
import * as png from '@jsquash/png';
import { optimise as oxipngOptimise } from '@jsquash/oxipng';
import UPNG from 'upng-js';
import resize from '@jsquash/resize';
import { readPsd } from 'ag-psd';
import { initSlider } from './slider-component.js';

let currentQuality = 75;
// Último ficheiro criado com sucesso — alvo do botão "Ir para".
let lastOutputPath = null;
// Pasta de destino escolhida no botão "Guardar".
// null = comportamento por defeito (grava ao lado do ficheiro original).
let outputDir = null;

export function setupCompression() {
    const compressBtn = document.getElementById('compressBtn');
    if (compressBtn) {
        compressBtn.addEventListener('click', startCompression);
    }

    // "Ir para" — revela o ficheiro comprimido no Finder / Explorador
    const revealBtn = document.getElementById('revealBtn');
    if (revealBtn) {
        revealBtn.addEventListener('click', async () => {
            if (!lastOutputPath) return;
            try {
                await revealItemInDir(lastOutputPath);
            } catch (e) {
                console.error('Não foi possível abrir a pasta:', e);
            }
        });
    }

    // "Guardar" — escolhe a pasta de destino dos ficheiros comprimidos
    const saveDirBtn = document.getElementById('saveDirBtn');
    if (saveDirBtn) {
        saveDirBtn.addEventListener('click', async () => {
            try {
                const chosen = await openDialog({
                    directory: true,
                    multiple: false,
                    title: 'Escolher pasta de destino',
                });
                if (!chosen) return; // cancelou — mantém o que estava

                outputDir = chosen;
                saveDirBtn.title = `A guardar em: ${chosen}`;

                const statusMsg = document.getElementById('statusMessage');
                if (statusMsg) {
                    statusMsg.textContent = `A guardar em: ${chosen}`;
                    setTimeout(() => { statusMsg.textContent = ''; }, 4000);
                }
            } catch (e) {
                console.error('Não foi possível escolher a pasta:', e);
            }
        });
    }

    // SVG Slider Initialization
    initSlider('qualitySliderContainer', currentQuality, (val) => {
        currentQuality = val;
    });
}

export async function startCompression() {
    const compressBtn = document.getElementById('compressBtn');
    // const qualitySlider = document.getElementById('qualitySlider'); // Removed
    const statusMsg = document.getElementById('statusMessage');
    const progressBar = document.getElementById('progressBar');

    const { getFiles, updateFileRow } = await import('./file-list.js');
    const files = getFiles();

    if (files.length === 0) {
        statusMsg.textContent = "Please add some files first!";
        statusMsg.classList.add('text-red-500');
        setTimeout(() => statusMsg.classList.remove('text-red-500'), 2000);
        return;
    }

    const quality = currentQuality;
    const total = files.length;
    let successCount = 0;

    compressBtn.disabled = true;

    // Show Loading State
    const btnSvg = compressBtn.querySelector('svg');
    const btnContent = document.getElementById('compressContent');
    const btnOverlay = document.getElementById('compressOverlay');

    if (btnSvg) btnSvg.classList.add('opacity-50');
    if (btnContent) btnContent.classList.add('opacity-0'); // Hide default text
    if (btnOverlay) {
        btnOverlay.classList.remove('opacity-0');
        btnOverlay.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            SQUEEZING...
        `;
    }

    // Helper to get sanitized ID (same logic as file-list.js)
    function sanitizeId(path) {
        return path.replace(/[^a-zA-Z0-9]/g, '_');
    }

    for (let i = 0; i < total; i++) {
        const file = files[i];
        const safeId = sanitizeId(file.path);
        const progressEl = document.getElementById(`progress-${safeId}`);

        // Start per-file progress simulation (0% → ~95%)
        let filePercent = 0;
        let progressTimer = null;
        if (progressEl) {
            progressEl.innerHTML = `<span class="text-blue-500 text-[10px] font-bold">0%</span>`;
            progressTimer = setInterval(() => {
                if (filePercent < 95) {
                    // Slow down as it approaches 95%
                    filePercent += Math.max(1, Math.floor((95 - filePercent) / 8));
                    if (filePercent > 95) filePercent = 95;
                    progressEl.innerHTML = `<span class="text-blue-500 text-[10px] animate-pulse font-bold">${filePercent}%</span>`;
                }
            }, 200);
        }

        // Update overall status
        statusMsg.textContent = `A comprimir ${i + 1}/${total}...`;
        if (progressBar) progressBar.style.width = `${Math.round((i / total) * 100)}%`;

        try {
            // Read selected output format from the dropdown (avif | webp | jpeg | png)
            const formatSelect = document.getElementById('outputFormat');
            const outputFormat = formatSelect ? formatSelect.value : 'avif';

            // Check if it's a video file based on common extensions
            const isVideo = /\.(mp4|mov|avi|mkv|webm|flv)$/i.test(file.path);
            const isPdf = /\.pdf$/i.test(file.path);
            const isPsd = /\.psd$/i.test(file.path);

            let result;

            if (isVideo) {
                // Video compression via backend FFmpeg Sidecar
                result = await invoke('compress_video_ffmpeg', { path: file.path, outputDir });
            } else if (isPdf) {
                // PDF compression via Ghostscript Sidecar — qualidade segue o slider
                result = await invoke('compress_pdf_ghostscript', { path: file.path, quality, outputDir });
            } else {
                // Decode original image (ou PSD aplanado) para pixels RGBA.
                const rawBytes = await invoke('read_file_to_bytes', { path: file.path });
                let imgData;

                if (isPsd) {
                    // PSD → composite (imagem final aplanada) via ag-psd.
                    // Perde as camadas — o resultado é a imagem que verias no Photoshop.
                    const bytes = new Uint8Array(rawBytes);
                    // ArrayBuffer isolado (evita partilhar memória com o Node/Tauri wrapper)
                    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                    const psd = readPsd(buffer, { useImageData: true });
                    if (psd.imageData) {
                        imgData = psd.imageData;
                    } else if (psd.canvas) {
                        const ctx = psd.canvas.getContext('2d');
                        imgData = ctx.getImageData(0, 0, psd.canvas.width, psd.canvas.height);
                    } else {
                        throw new Error('PSD sem composite legível (guardado sem "Maximize compatibility"?)');
                    }
                } else {
                    const blob = new Blob([new Uint8Array(rawBytes)]);
                    const bitmap = await createImageBitmap(blob);
                    const canvas = document.createElement('canvas');
                    canvas.width = bitmap.width;
                    canvas.height = bitmap.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(bitmap, 0, 0);
                    imgData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
                }

                // Check for resize input
                const resizeInput = document.getElementById('resizeWidth');
                const targetWidth = parseInt(resizeInput.value, 10);

                if (!isNaN(targetWidth) && targetWidth > 0 && targetWidth !== imgData.width) {
                    const aspectRatio = imgData.width / imgData.height;
                    const targetHeight = Math.max(1, Math.round(targetWidth / aspectRatio));

                    statusMsg.textContent = `A redimensionar (${targetWidth}x${targetHeight})...`;

                    try {
                        // Use highest quality Lanczos3 for downscaling
                        imgData = await resize(imgData, {
                            width: targetWidth,
                            height: targetHeight,
                            method: 'lanczos3'
                        });
                    } catch (err) {
                        console.error('Resize falhou, a usar o tamanho original:', err);
                        statusMsg.textContent = `Erro ao redimensionar...`;
                    }
                }

                // Image compression via client-side WASM — formato escolhido no dropdown
                let compressedBuffer;
                let ext;

                switch (outputFormat) {
                    case 'jpeg':
                        // mozjpeg expects quality 1-100
                        compressedBuffer = await jpeg.encode(imgData, { quality });
                        ext = "jpg";
                        break;
                    case 'webp':
                        // webp quality 0-100 (maior = melhor)
                        compressedBuffer = await webp.encode(imgData, { quality });
                        ext = "webp";
                        break;
                    case 'png': {
                        // PNG é sem perdas: guardar uma foto em PNG "cru" faz o ficheiro
                        // CRESCER face ao JPEG original. Para haver ganho real fazemos o
                        // mesmo que o TinyPNG: quantização (reduzir a paleta) + oxipng.
                        //
                        // Slider 95-100 -> sem perdas (paleta completa, cores exatas).
                        // Abaixo disso  -> paleta de 16 a 256 cores (imperceptível na maioria).
                        const colors = quality >= 95
                            ? 0
                            : Math.min(256, Math.max(16, Math.round(quality * 2.56)));

                        let pngBuffer;
                        try {
                            const rgba = new Uint8Array(imgData.data).buffer;
                            pngBuffer = UPNG.encode([rgba], imgData.width, imgData.height, colors);
                        } catch (err) {
                            console.warn('[png] Quantização falhou, a usar encode sem perdas:', err);
                            pngBuffer = await png.encode(imgData);
                        }

                        // Passagem final sem perdas — encolhe mais uns % sem tocar nos pixels.
                        try {
                            pngBuffer = await oxipngOptimise(pngBuffer, {
                                level: 3,
                                interlace: false,
                                optimiseAlpha: true,
                            });
                        } catch (err) {
                            console.warn('[png] oxipng falhou, a guardar sem otimização extra:', err);
                        }

                        compressedBuffer = pngBuffer;
                        ext = "png";
                        break;
                    }
                    case 'avif':
                    default: {
                        // avif CQ level: maior qualidade no slider = CQ mais baixo (melhor)
                        // Intervalo CQ: 0 (lossless) a 63 (pior). Default 33.
                        const cqLevel = Math.round(63 - (quality / 100) * 63);
                        compressedBuffer = await avif.encode(imgData, { cqLevel, speed: 6 });
                        ext = "avif";
                        break;
                    }
                }

                // Send raw binary to Tauri backend just to save to disk
                const bytesArray = Array.from(new Uint8Array(compressedBuffer));

                result = await invoke('save_compressed_file', {
                    path: file.path,
                    bytes: bytesArray,
                    extension: ext,
                    outputDir
                });
            }

            // Stop timer and show final state
            if (progressTimer) clearInterval(progressTimer);
            updateFileRow(result.path, result);
            if (result.success) {
                successCount++;
                // Guarda o alvo do "Ver pasta" e ativa o botão
                if (result.output_path) {
                    lastOutputPath = result.output_path;
                    const revealBtn = document.getElementById('revealBtn');
                    if (revealBtn) revealBtn.disabled = false;
                }
            }
        } catch (e) {
            if (progressTimer) clearInterval(progressTimer);
            updateFileRow(file.path, { success: false, error: String(e) });
        }
    }

    // Final progress
    if (progressBar) progressBar.style.width = '100%';
    statusMsg.textContent = `Concluído! ${successCount}/${total} ficheiros comprimidos.`;
    statusMsg.classList.add('text-green-500');

    compressBtn.disabled = false;

    // Restore Button State
    if (btnSvg) btnSvg.classList.remove('opacity-50');
    if (btnContent) btnContent.classList.remove('opacity-0');
    if (btnOverlay) {
        btnOverlay.classList.add('opacity-0');
        setTimeout(() => btnOverlay.innerHTML = '', 300); // Clear after fade out
    }

    setTimeout(() => {
        statusMsg.classList.remove('text-green-500', 'text-red-500');
        statusMsg.textContent = "";
        if (progressBar) progressBar.style.width = '0%';
    }, 3000);
}
