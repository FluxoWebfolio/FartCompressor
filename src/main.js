import './styles.css';
import { setupDragDrop } from './ui/drag-drop.js';
import { setupCompression } from './ui/compression.js';
import { addFiles, clearFiles } from './ui/file-list.js';
import { initToggle } from './ui/toggle-component.js';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupDragDrop();
  setupCompression();

  // Clear list button
  const clearBtn = document.getElementById('clearListBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => clearFiles());
  }

  // Click to upload (fallback for Drag & Drop)
  const emptyState = document.getElementById('emptyState');
  const fileInput = document.getElementById('fileInput');

  if (emptyState && fileInput) {
    emptyState.style.pointerEvents = 'auto';
    emptyState.style.cursor = 'pointer';

    emptyState.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const fileList = Array.from(e.target.files).map(f => ({
          name: f.name,
          size: f.size,
          path: f.name
        }));
        addFiles(fileList, true);
      }
    });
  }

  // SVG Toggle buttons — uses inline SVG states
  initToggle('autoCompressToggle', false, (isOn) => {
    console.log('Comprimir Auto:', isOn);
  });

  initToggle('overwriteToggle', false, (isOn) => {
    console.log('Guardar em Origem:', isOn);
  });
});

