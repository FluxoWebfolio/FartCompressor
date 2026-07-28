// ============================================================
//  Sistema de idiomas (i18n) — EN por defeito + PT
// ============================================================
//
//  Como funciona:
//   - Textos estáticos no HTML usam data-attributes:
//       data-i18n="chave"            -> substitui o textContent
//       data-i18n-title="chave"      -> substitui o atributo title (tooltip)
//       data-i18n-placeholder="chave"-> substitui o placeholder
//   - Textos gerados por JS usam a função t('chave', ...args).
//   - A escolha do utilizador fica guardada em localStorage ('fc_lang').
//   - Idioma por defeito: EN.
//
//  Para adicionar/alterar textos: edita o dicionário DICT abaixo.
//

const STORAGE_KEY = 'fc_lang';
const DEFAULT_LANG = 'en';
const SUPPORTED = ['en', 'pt'];

// Dicionário. Cada chave tem { en, pt }. Os valores podem ser:
//   - string simples
//   - função (…args) => string  (para textos com variáveis)
const DICT = {
  // Overlay de drop
  drop_overlay:      { en: 'Drop your farts here!',      pt: 'Larga aqui os teus peidos!' },
  // Aviso de nova versão
  update_available:  { en: (v) => `New version ${v} available`, pt: (v) => `Nova versão ${v} disponível` },
  update_view:       { en: 'View',                       pt: 'Ver' },
  // Toggles / inputs
  auto_compress:     { en: 'Auto Compress',              pt: 'Comprimir Auto' },
  width_px:          { en: 'Width px',                   pt: 'Largura px' },
  width_placeholder: { en: 'Auto',                       pt: 'Auto' },
  format:            { en: 'Format',                     pt: 'Formato' },
  // Slider
  compression:       { en: 'Compression',                pt: 'Compressão' },
  compression_sub:   { en: 'Ultra-light fart!',          pt: 'Bufa ultra-leve!' },
  quality:           { en: 'Quality',                    pt: 'Qualidade' },
  quality_sub:       { en: 'Fart with class!',           pt: 'Bufa com classe!' },
  // Cabeçalho da lista
  clear_list:        { en: 'Clear list',                 pt: 'Limpar lista' },
  col_file:          { en: 'File',                       pt: 'Ficheiro' },
  col_before:        { en: 'Before',                     pt: 'Antes' },
  col_after:         { en: 'After',                      pt: 'Depois' },
  col_percent:       { en: '(%)',                        pt: '(%)' },
  empty_drop:        { en: 'Drop your files here',       pt: 'Larga os ficheiros aqui' },
  total:             { en: 'TOTAL',                      pt: 'TOTAL' },
  // Botões
  save:              { en: 'Save',                       pt: 'Guardar' },
  save_title:        { en: 'Choose where to save the compressed files', pt: 'Escolher a pasta onde guardar os ficheiros comprimidos' },
  compress:          { en: 'COMPRESS',                   pt: 'COMPRIMIR' },
  go_to:             { en: 'Go to',                      pt: 'Ir para' },
  go_to_title:       { en: 'Open the compressed file folder', pt: 'Abrir a pasta do ficheiro comprimido' },
  // Barra de estado
  status_idle:       { en: '0% compression...',          pt: '0% de compressão...' },
  // Mensagens dinâmicas (JS)
  choose_folder:     { en: 'Choose destination folder',  pt: 'Escolher pasta de destino' },
  saving_to:         { en: (d) => `Saving to: ${d}`,     pt: (d) => `A guardar em: ${d}` },
  add_files_first:   { en: 'Please add some files first!', pt: 'Adiciona ficheiros primeiro!' },
  compressing:       { en: (i, n) => `Compressing ${i}/${n}...`, pt: (i, n) => `A comprimir ${i}/${n}...` },
  resizing:          { en: (w, h) => `Resizing (${w}x${h})...`,  pt: (w, h) => `A redimensionar (${w}x${h})...` },
  resize_error:      { en: 'Resize error...',            pt: 'Erro ao redimensionar...' },
  squeezing:         { en: 'SQUEEZING...',               pt: 'A ESPREMER...' },
  done:              { en: (ok, n) => `Done! ${ok}/${n} files compressed.`, pt: (ok, n) => `Concluído! ${ok}/${n} ficheiros comprimidos.` },
  error_short:       { en: 'Error',                      pt: 'Erro' },
  // Tooltip do seletor de idioma
  lang_toggle_title: { en: 'Mudar para Português',       pt: 'Switch to English' },
  // Modal das skins / capas anteriores
  skins_question:    { en: 'View previous skins?',       pt: 'Ver as skins anteriores?' },
  skins_view:        { en: 'View',                       pt: 'Ver' },
  skins_cancel:      { en: 'Cancel',                     pt: 'Cancelar' },
  header_skins_title:{ en: 'View previous skins',        pt: 'Ver as skins anteriores' },
};

let currentLang = DEFAULT_LANG;

export function getLang() {
  return currentLang;
}

// Devolve o texto traduzido. Se a entrada for função, chama-a com os args.
export function t(key, ...args) {
  const entry = DICT[key];
  if (!entry) return key;
  const val = entry[currentLang] ?? entry[DEFAULT_LANG] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

// Aplica as traduções a todos os elementos com data-i18n* no DOM.
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });

  // Notifica o resto da app (ex.: barra de estado inativa, botão bandeira).
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
}

export function setLang(lang) {
  if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
  currentLang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
  document.documentElement.lang = lang;
  applyTranslations();
}

// Lê a preferência guardada (ou o defaut) e configura o botão da bandeira.
export function setupLanguage() {
  let saved = DEFAULT_LANG;
  try { saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch (_) {}
  currentLang = SUPPORTED.includes(saved) ? saved : DEFAULT_LANG;

  const btn = document.getElementById('langToggle');
  if (btn) {
    const render = () => {
      // Mostra o idioma ATIVO em texto (EN / PT) dentro do círculo branco.
      btn.textContent = currentLang.toUpperCase();
      btn.title = t('lang_toggle_title');
    };
    btn.addEventListener('click', () => {
      setLang(currentLang === 'en' ? 'pt' : 'en');
      render();
    });
    document.addEventListener('langchange', render);
    render();
  }

  document.documentElement.lang = currentLang;
  applyTranslations();
}
