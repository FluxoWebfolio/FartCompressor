import { CAPA_URL } from '../config.js';

// ============================================================
//  Capa mensal — carrega a imagem do topo a partir do site.
// ============================================================
//
//  Comportamento:
//   - Ao abrir a app, tenta carregar a capa mais recente (capa.png) do site.
//   - Usa "cache-busting" (?t=timestamp) para ir sempre buscar a versão do mês,
//     mesmo que o browser tenha guardado uma antiga em cache.
//   - Se falhar (sem internet / site em baixo), MANTÉM a imagem embutida na app.
//     Nunca deixa a app sem capa.
//
export function setupRemoteHeader() {
  const img = document.getElementById('headerImage');
  if (!img) return;

  // Guarda a imagem embutida original como fallback.
  const fallbackSrc = img.getAttribute('src');

  const remoteUrl = `${CAPA_URL}?t=${Date.now()}`;

  // Pré-carrega numa imagem "invisível": só troca a capa visível se carregar bem.
  const probe = new Image();
  probe.onload = () => {
    img.src = remoteUrl;
  };
  probe.onerror = () => {
    // Site indisponível — fica a imagem embutida (já é a que está no src).
    console.warn('[capa] Capa remota indisponível, a usar a imagem embutida.');
    if (img.getAttribute('src') !== fallbackSrc) {
      img.src = fallbackSrc;
    }
  };
  probe.src = remoteUrl;
}
