import { openUrl } from '@tauri-apps/plugin-opener';
import { SKINS_URL } from '../config.js';

// ============================================================
//  Modal "Ver as skins anteriores?"
// ============================================================
//
//  Ao clicar na imagem do topo abre um modal a perguntar se o utilizador
//  quer ver as capas/skins anteriores. Se confirmar, abre a galeria no
//  browser externo (SKINS_URL, definido em config.js).
//

export function setupSkinsModal() {
  const trigger = document.getElementById('headerImageBtn');
  const modal = document.getElementById('skinsModal');
  const cancelBtn = document.getElementById('skinsCancelBtn');
  const viewBtn = document.getElementById('skinsViewBtn');
  if (!trigger || !modal) return;

  const open = () => {
    modal.classList.remove('hidden');
    // força reflow para a transição de opacidade correr
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
  };

  const close = () => {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 200);
  };

  trigger.addEventListener('click', open);
  if (cancelBtn) cancelBtn.addEventListener('click', close);

  // Clicar no fundo escuro (fora da caixa) também fecha.
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // Esc fecha.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });

  if (viewBtn) {
    viewBtn.addEventListener('click', async () => {
      close();
      try {
        await openUrl(SKINS_URL);
      } catch (e) {
        console.error('Não foi possível abrir a galeria de skins:', e);
      }
    });
  }
}
