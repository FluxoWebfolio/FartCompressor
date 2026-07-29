# Third-Party Notices

FartCompressor é distribuído com componentes de terceiros. Cada um mantém a sua
própria licença — abaixo ficam os créditos e as ligações ao código-fonte, como
exigido por essas licenças.

O código da própria aplicação FartCompressor é licenciado sob
[PolyForm Noncommercial 1.0.0](LICENSE). Os componentes abaixo **não** estão
cobertos por essa licença; regem-se pelas suas.

---

## Programas invocados como binários externos (sidecars)

Estes programas são executáveis independentes, chamados pela app por linha de
comando (não estão ligados ao código da app).

### Ghostscript
- **Uso:** compressão de PDF.
- **Licença:** GNU Affero General Public License v3.0 (AGPL-3.0).
- **Código-fonte:** https://ghostscript.com/releases/gsdnld.html · https://git.ghostscript.com/
- Binários distribuídos sem modificações a partir das versões oficiais.
- © Artifex Software, Inc.

### FFmpeg (com libx264)
- **Uso:** compressão de vídeo.
- **Licença:** GNU General Public License (GPL) — o build inclui libx264 (GPL).
- **Código-fonte:** https://ffmpeg.org/download.html · https://code.videolan.org/videolan/x264
- Binários de Windows obtidos de builds oficiais (BtbN/FFmpeg-Builds).

---

## Bibliotecas (frontend)

Todas sob licenças permissivas (MIT / Apache-2.0):

- **@jsquash/avif, @jsquash/jpeg, @jsquash/webp, @jsquash/png, @jsquash/oxipng, @jsquash/resize** — codecs WASM de imagem (baseados no projeto Squoosh, Google) — Apache-2.0.
- **upng-js** — quantização de PNG — MIT.
- **ag-psd** — leitura de ficheiros PSD — MIT.
- **Tauri** (`@tauri-apps/*`, plugins) — framework da aplicação — MIT / Apache-2.0.
- **Vite, Tailwind CSS, PostCSS, Autoprefixer** — ferramentas de build — MIT.

As licenças completas de cada dependência estão nos respetivos pacotes em
`node_modules/`, e o texto de cada projeto está disponível nos seus repositórios.
