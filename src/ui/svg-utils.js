// ============================================================
//  Utilitários de SVG inline
// ============================================================
//
//  PORQUÊ ISTO EXISTE
//  Os SVGs exportados do Illustrator trazem quase todos ids genéricos
//  ("linear-gradient", "linear-gradient-2"...). Como injetamos vários SVGs no
//  MESMO documento (toggles, slider, botão de comprimir), esses ids ficam
//  repetidos. O Chromium (WebView2 / Windows) resolve `url(#id)` para o PRIMEIRO
//  elemento com esse id no documento — o que fazia o botão COMPRIMIR ficar
//  cinzento (apanhava o gradiente do toggle) em vez de azul. O WebKit (macOS)
//  resolvia de outra forma e por isso no Mac parecia bem.
//
//  A função abaixo prefixa os ids de "paint servers" (gradientes, filtros,
//  clip-paths...) com um valor único por injeção, e atualiza as referências.
//  Só mexe em ids que são REFERENCIADOS por url(#…) ou href="#…" — os ids
//  usados pelo JS (ex.: #slider-thumb) ficam intactos.

let counter = 0;

export function namespaceSvgIds(markup) {
    const prefix = `svg${++counter}-`;

    // Ids realmente referenciados dentro deste SVG (gradientes, filtros, etc.)
    const referenced = new Set();
    for (const m of markup.matchAll(/url\(#([^)"']+)\)/g)) referenced.add(m[1]);
    for (const m of markup.matchAll(/(?:xlink:)?href="#([^"]+)"/g)) referenced.add(m[1]);

    let out = markup;
    for (const id of referenced) {
        const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out
            .replace(new RegExp(`id="${esc}"`, 'g'), `id="${prefix}${id}"`)
            .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${prefix}${id})`)
            .replace(new RegExp(`((?:xlink:)?href)="#${esc}"`, 'g'), `$1="#${prefix}${id}"`);
    }
    return out;
}
