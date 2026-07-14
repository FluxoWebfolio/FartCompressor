import { fetch } from '@tauri-apps/plugin-http';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getVersion } from '@tauri-apps/api/app';
import { CONFIG_URL } from '../config.js';

// ============================================================
//  Verificação de nova versão.
// ============================================================
//
//  Comportamento:
//   - Ao abrir, lê config.json do site.
//   - Compara "versao_mais_recente" com a versão instalada (de tauri.conf.json).
//   - Se houver uma versão mais recente, mostra um aviso com um botão que abre
//     a "pagina_download" no browser externo. NÃO instala nada automaticamente.
//   - Se estiver offline ou o site falhar, não mostra nada e não bloqueia a app.
//
//  O pedido é feito via plugin-http (passa pelo backend Rust), o que evita
//  problemas de CORS quando o site real não enviar cabeçalhos CORS.
//

// Compara duas versões "a.b.c". Retorna true se `remote` for mais recente que `current`.
function isNewer(remote, current) {
  const r = String(remote).split('.').map((n) => parseInt(n, 10) || 0);
  const c = String(current).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(r.length, c.length);
  for (let i = 0; i < len; i++) {
    const rv = r[i] || 0;
    const cv = c[i] || 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return false;
}

export async function setupUpdateCheck() {
  try {
    const currentVersion = await getVersion();

    const res = await fetch(`${CONFIG_URL}?t=${Date.now()}`, { method: 'GET' });
    if (!res.ok) return;

    const cfg = await res.json();
    if (!cfg || !cfg.versao_mais_recente) return;

    if (isNewer(cfg.versao_mais_recente, currentVersion)) {
      showUpdateBanner(cfg);
    }
  } catch (e) {
    // Offline / site indisponível — silencioso, não bloqueia a app.
    console.warn('[update] Verificação de atualização falhou:', e);
  }
}

function showUpdateBanner(cfg) {
  const banner = document.getElementById('updateBanner');
  if (!banner) return;

  const label = document.getElementById('updateBannerText');
  const btn = document.getElementById('updateBannerBtn');

  if (label) {
    label.textContent = `Nova versão ${cfg.versao_mais_recente} disponível`;
  }
  if (btn && cfg.pagina_download) {
    btn.onclick = () => openUrl(cfg.pagina_download);
    if (cfg.novidades) btn.title = cfg.novidades;
  }

  banner.classList.remove('hidden');
}
