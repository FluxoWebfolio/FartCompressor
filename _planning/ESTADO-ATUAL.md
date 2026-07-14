# Estado atual da app (baseline)

Análise da FartCompressor tal como está hoje, para servir de ponto de partida aos upgrades.

## O que a app faz

App desktop de **compressão de imagens e vídeos** ("Leve como 1 Peido"), com:
- Drag & drop de ficheiros (+ botão de upload como fallback)
- Slider de qualidade
- Toggles: modo **True Tone** (JPEG/mozjpeg) vs **AVIF**, e "Guardar em origem" / auto-comprimir
- Redimensionamento opcional por largura (mantém rácio, Lanczos3)
- Compressão de vídeo via FFmpeg

## Stack tecnológica

| Camada | Tecnologia | Ficheiros |
|--------|-----------|-----------|
| Shell desktop | **Tauri v2** | `src-tauri/` |
| Backend | **Rust** | `src-tauri/src/lib.rs`, `main.rs` |
| Frontend | Vanilla JS + **Vite** | `src/`, `index.html`, `vite.config.js` |
| Estilos | **Tailwind CSS** | `tailwind.config.js`, `src/styles.css` |
| Compressão de imagem | **`@jsquash`** (WASM, no cliente) | `src/ui/compression.js` |
| Compressão de vídeo | **FFmpeg** (sidecar binário) | `src-tauri/binaries/` |

## Fluxo de compressão

**Imagens** (100% no cliente, WASM):
1. `read_file_to_bytes` (Rust) lê os bytes do ficheiro
2. Descodifica para pixels via Canvas do browser
3. Redimensiona se pedido (`@jsquash/resize`, Lanczos3)
4. Codifica: `@jsquash/jpeg` (mozjpeg, quality 1–100) **ou** `@jsquash/avif` (cqLevel 0–63)
5. `save_compressed_file` (Rust) grava `<nome>_compressed.<ext>` ao lado do original

**Vídeos** (backend):
- `compress_video_ffmpeg` (Rust) invoca o sidecar FFmpeg:
  `ffmpeg -i <in> -c:v libx264 -preset fast -crf 23 -c:a copy <nome>_compressed.mkv`

## Comandos Rust expostos (`src-tauri/src/lib.rs`)

- `get_file_info(path)` → nome, tamanho, formato
- `read_file_to_bytes(path)` → bytes do ficheiro
- `save_compressed_file(path, bytes, extension)` → grava e devolve tamanhos
- `compress_video_ffmpeg(app, path)` → comprime vídeo, devolve tamanhos

## Módulos de UI (`src/ui/`)

- `drag-drop.js` — zona de arrastar/largar
- `file-list.js` — lista de ficheiros e atualização de linhas/progresso
- `compression.js` — orquestra toda a compressão
- `slider-component.js` — slider SVG de qualidade
- `toggle-component.js` — toggles SVG

## Configuração relevante

- **`src-tauri/tauri.conf.json`** — janela 600×800 (min 380), `dragDropEnabled`, `targets: "all"`,
  sidecar `binaries/ffmpeg`, identifier `com.rad.fartcompressor`, versão `0.1.0`
- **`src-tauri/capabilities/default.json`** — permissões, incluindo executar o sidecar FFmpeg
- **`.gitignore`** — ignora o binário FFmpeg de macOS x86_64 (baixado no CI)

## Estado multiplataforma (já iniciado)

- ✅ Binário FFmpeg de Windows presente: `src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe`
- ✅ Workflow GitHub Actions `.github/workflows/windows-build.yml` — compila `.msi` e `.exe` na cloud
- ✅ Binários FFmpeg de macOS (aarch64 + x86_64) presentes
- ⚠️ Ainda **não validado/afinado** — objetivo é primeiro deixar o macOS como pretendido,
  depois tratar do Windows

## Observações / pontos de atenção para os upgrades

- Nomes de comandos e a UI misturam PT/EN e há um toggle rotulado no código como
  `overwriteToggle` mas usado para "True Tone" — vale a pena clarificar a semântica.
- A app grava sempre em `<nome>_compressed.<ext>` ao lado do original; o toggle
  "Guardar em origem"/overwrite ainda não altera este comportamento no backend.
- Vídeo sai sempre em `.mkv` — pode não ser o formato desejado por defeito.
- O progresso por ficheiro é **simulado** (não é progresso real de FFmpeg/WASM).
