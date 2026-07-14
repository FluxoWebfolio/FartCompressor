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
export const BASE_URL = 'http://localhost:4599';

// Imagem do topo — nome FIXO. Todos os meses substituis o ficheiro capa.png no site.
export const CAPA_URL = `${BASE_URL}/capa.png`;

// Ficheiro de configuração — versão mais recente + link de download.
export const CONFIG_URL = `${BASE_URL}/config.json`;
