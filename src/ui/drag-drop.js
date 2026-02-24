import { listen } from '@tauri-apps/api/event';
import { addFiles, clearFiles, hasErrors, clearSuccessfulFiles } from './file-list.js';
import { startCompression } from './compression.js';

/**
 * Setup drag and drop using Tauri's native events (v2 API)
 * Note: This requires dragDropEnabled: true in tauri.conf.json
 */
export async function setupDragDrop() {
    console.log('🎯 Setting up Tauri v2 Drag & Drop...');

    const overlay = document.getElementById('dropOverlay');
    if (!overlay) {
        console.error('Drop overlay not found!');
        return;
    }

    try {
        // Tauri v2 uses "tauri://drag-drop" not "tauri://file-drop"
        await listen('tauri://drag-drop', async (event) => {
            console.log('✅ Files dropped!', event.payload);
            overlay.style.opacity = '0';

            if (event.payload && event.payload.paths && Array.isArray(event.payload.paths)) {
                console.log('📁 Processing', event.payload.paths.length, 'files...');

                // Always sweep successfully compressed files (keeping errors and uncompressed pending files)
                console.log('🧹 Sweeping previously successful files before adding new ones...');
                clearSuccessfulFiles();

                await addFiles(event.payload.paths);

                const autoToggle = document.getElementById('autoCompressToggle');
                const isAutoOn = autoToggle && autoToggle.dataset.state === 'on';

                if (isAutoOn) {
                    console.log('⚡ Auto-compress triggered!');
                    startCompression();
                }
            }
        });

        await listen('tauri://drag-hover', (event) => {
            console.log('👋 Drag hovering...');
            overlay.style.opacity = '1';
        });

        await listen('tauri://drag-cancelled', () => {
            console.log('❌ Drag cancelled');
            overlay.style.opacity = '0';
        });

        console.log('✨ Drag & Drop listeners registered successfully!');
    } catch (error) {
        console.error('❌ Failed to setup drag & drop:', error);
    }
}
