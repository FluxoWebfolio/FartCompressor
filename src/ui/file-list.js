import { invoke } from '@tauri-apps/api/core';

let files = [];

export function getFiles() {
    return files;
}

export function clearFiles() {
    files = [];
    const container = document.getElementById('filesList');
    if (container) container.innerHTML = '';
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.classList.remove('hidden');
    updateTotals();
}

export function hasErrors() {
    const container = document.getElementById('filesList');
    if (!container) return false;
    return container.querySelector('[data-compressed="true"] .text-red-500') !== null;
}

export function clearSuccessfulFiles() {
    const container = document.getElementById('filesList');
    if (!container) return;

    // Remove rows that are compressed successfully (have green text, no red)
    const rows = Array.from(container.querySelectorAll('[data-compressed="true"]'));
    rows.forEach(row => {
        const hasError = row.querySelector('.text-red-500');
        if (!hasError) {
            // Remove from files array
            const rowId = row.id; // file-row-SAFEID
            const safeId = rowId.replace('file-row-', '');
            files = files.filter(f => sanitizeId(f.path) !== safeId);
            row.remove();
        }
    });

    // Uncompressed files (pending) are preserved, allowing additive drops.

    if (container.children.length === 0) {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.classList.remove('hidden');
    }

    updateTotals();
}

export function updateFileRow(path, result) {
    console.log('🔄 updateFileRow called:', { path, result });

    const safeId = sanitizeId(path);
    const row = document.getElementById(`file-row-${safeId}`);
    console.log('   Sanitized ID:', safeId);
    console.log('   Looking for elements:', `compressed-size-${safeId}`, `savings-${safeId}`);

    let compressedSizeEl = document.getElementById(`compressed-size-${safeId}`);
    let savingsEl = document.getElementById(`savings-${safeId}`);

    // If not found, try to find by checking all file rows
    if (!compressedSizeEl || !savingsEl) {
        console.log('   ⚠️ Elements not found by ID, searching through all rows...');
        const fileRow = document.getElementById(`file-row-${safeId}`);
        if (fileRow) {
            console.log('   ✅ Found file row:', fileRow);
            compressedSizeEl = fileRow.querySelector(`#compressed-size-${safeId}`);
            savingsEl = fileRow.querySelector(`#savings-${safeId}`);
        } else {
            console.log('   ❌ File row not found either. All file rows:');
            const allRows = document.querySelectorAll('[id^="file-row-"]');
            allRows.forEach(row => console.log('      -', row.id));
        }
    }

    console.log('   Elements found:', {
        compressedSizeEl: !!compressedSizeEl,
        savingsEl: !!savingsEl
    });

    if (result.success) {
        const savings = ((result.original_size - result.compressed_size) / result.original_size) * 100;
        const percent = Math.round(savings);

        console.log('   Updating values:', { percent, compressed_size: result.compressed_size });

        // Update compressed size
        if (compressedSizeEl) {
            compressedSizeEl.innerHTML = `<span class="text-green-600 font-bold">${formatBytes(result.compressed_size)}</span>`;
        } else {
            console.error('   ❌ compressedSizeEl not found!');
        }

        // Update savings percentage
        if (savingsEl) {
            savingsEl.innerHTML = `<span class="text-green-600 font-bold">-${percent}%</span>`;
        } else {
            console.error('   ❌ savingsEl not found!');
        }

        // Update internal state
        const file = files.find(f => f.path === path);
        if (file) {
            file.compressed_size = result.compressed_size;
            file.compression_percent = percent;
        }
        // Mark row as compressed
        if (row) {
            row.dataset.compressed = 'true';
            const progressEl = document.getElementById(`progress-${safeId}`);
            if (progressEl) progressEl.innerHTML = `<span class="text-green-600 font-bold">✓</span>`;
        }
    } else {
        if (compressedSizeEl) {
            compressedSizeEl.innerHTML = `<span class="text-red-500 text-[9px]">Error</span>`;
        }
        if (row) {
            row.dataset.compressed = 'true';
            const progressEl = document.getElementById(`progress-${safeId}`);
            if (progressEl) progressEl.innerHTML = `<span class="text-red-500 font-bold">✗</span>`;
        }
    }

    updateTotals();
}

export async function addFiles(items, isObject = false) {
    console.log('📁 addFiles called with:', items.length, 'items');
    const emptyState = document.getElementById('emptyState');
    const container = document.getElementById('filesList');

    if (items.length > 0) {
        emptyState.classList.add('hidden');
    }

    for (const item of items) {
        let fileData;

        if (isObject) {
            fileData = {
                name: item.name,
                size: item.size,
                path: item.path
            };
        } else {
            try {
                const info = await invoke('get_file_info', { path: item });
                fileData = {
                    name: info.name,
                    size: info.size,
                    path: info.path
                };
            } catch (e) {
                console.error('Failed to get file info:', e);
                fileData = {
                    name: item.split('/').pop(),
                    size: 0,
                    path: item
                };
            }
        }

        if (!files.some(f => f.path === fileData.path)) {
            files.push(fileData);
            const row = createFileRow(fileData);
            console.log('   Created row for:', fileData.name);
            container.appendChild(row);
        }
    }

    // Move compressed files to the bottom of the list
    const rows = Array.from(container.children);
    const compressed = rows.filter(r => r.dataset.compressed === 'true');
    compressed.forEach(r => container.appendChild(r));

    updateTotals();
}

function createFileRow(file) {
    const safeId = sanitizeId(file.path);
    const row = document.createElement('div');
    row.id = `file-row-${safeId}`;
    row.className = 'grid grid-cols-12 gap-2 p-3 border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors text-[13px]';

    row.innerHTML = `
        <!-- File Name -->
        <div class="col-span-5 truncate font-medium text-gray-800" title="${file.name}">
            ${file.name}
        </div>

        <!-- Progress -->
        <div class="col-span-1 text-right text-gray-400 text-[11px]" id="progress-${safeId}">
            --
        </div>

        <!-- Original Size -->
        <div class="col-span-2 text-right text-gray-600">
            ${formatBytes(file.size)}
        </div>

        <!-- Compressed Size -->
        <div class="col-span-2 text-right text-gray-600" id="compressed-size-${safeId}">
            <span class="text-gray-400">--</span>
        </div>

        <!-- Compression % -->
        <div class="col-span-2 text-right font-bold" id="savings-${safeId}">
            <span class="text-gray-400">--</span>
        </div>
    `;

    return row;
}

function sanitizeId(path) {
    return path.replace(/[^a-zA-Z0-9]/g, '_');
}

function updateTotals() {
    const totalOriginalEl = document.getElementById('totalOriginalSize');
    const totalCompressedEl = document.getElementById('totalCompressedSize');
    const totalSavingsEl = document.getElementById('totalSavings');

    if (!totalOriginalEl || !totalCompressedEl || !totalSavingsEl) return;

    let totalOriginal = 0;
    let totalCompressed = 0;
    let processedOriginal = 0;

    files.forEach(f => {
        totalOriginal += f.size || 0;
        if (f.compressed_size) {
            totalCompressed += f.compressed_size;
            processedOriginal += f.size || 0;
        }
    });

    totalOriginalEl.innerText = formatBytes(totalOriginal);

    if (processedOriginal > 0) {
        totalCompressedEl.innerText = formatBytes(totalCompressed);

        // Calculate total savings percentage based on PROCESSED files only
        const savings = processedOriginal - totalCompressed;
        const percent = Math.round((savings / processedOriginal) * 100);

        totalSavingsEl.innerText = `${percent}%`;
    } else {
        totalCompressedEl.innerText = '--';
        totalSavingsEl.innerText = '--';
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);

    if (sizes[i] === 'KB') {
        return Math.round(value) + ' KB';
    } else if (sizes[i] === 'MB') {
        return value.toFixed(1) + ' MB';
    } else {
        return Math.round(value * 100) / 100 + ' ' + sizes[i];
    }
}
