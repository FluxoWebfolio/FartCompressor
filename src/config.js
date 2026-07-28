// ============================================================
//  Configuração do "site" remoto (capa mensal + verificação de versão)
// ============================================================
//
//  >>> ÚNICO SÍTIO A MUDAR PARA PRODUÇÃO <<<
//
//  DEV (servidor local):   http://localhost:4599
//  PRODUÇÃO (o teu site):  https://ricardosequeira.eu/fartcompressor
//                          (ou o subdomínio que decidires, ex.: https://app.ricardosequeira.eu)
//
//  Quando o site real estiver pronto, troca apenas a linha BASE_URL abaixo,
//  recompila e distribui a app.
//
// Capa mensal + config da app: alojados no Cloudflare R2 (bucket público).
// Todos os meses substituis o ficheiro capa.png no R2, na pasta fartcompressor/.
const R2_BASE = 'https://pub-e9766256f2b3492784acc970a0529eaa.r2.dev/fartcompressor';

// Imagem do topo — nome FIXO.
export const CAPA_URL = `${R2_BASE}/capa.png`;

// Ficheiro de configuração — versão mais recente + link de download.
export const CONFIG_URL = `${R2_BASE}/config.json`;

// Galeria das capas/skins anteriores — página no site (aberta pelo modal ao
// clicar na imagem do topo). Cria esta página quando quiseres mostrar o histórico.
export const SKINS_URL = 'https://www.ricardosequeira.eu/fartcompressor/skins/';
