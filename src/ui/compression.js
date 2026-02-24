import { invoke } from '@tauri-apps/api/core';
import { initSlider } from './slider-component.js';

let currentQuality = 75;

export function setupCompression() {
    const compressBtn = document.getElementById('compressBtn');
    if (compressBtn) {
        compressBtn.addEventListener('click', startCompression);
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
            // Read True Tone state from the Right Toggle ("MÁX COMP | TRUE TONE")
            const trueToneToggle = document.getElementById('overwriteToggle');
            const isTrueTone = trueToneToggle ? trueToneToggle.getAttribute('data-state') === 'on' : false;

            const result = await invoke('compress_single_file', {
                path: file.path,
                quality: quality,
                trueTone: isTrueTone
            });

            // Stop timer and show final state
            if (progressTimer) clearInterval(progressTimer);
            updateFileRow(result.path, result);
            if (result.success) successCount++;
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
