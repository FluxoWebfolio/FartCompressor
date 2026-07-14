# Roadmap de Upgrade

Documento vivo. A fase 1 (afinar macOS) é para preencher **juntos** — abaixo está a
estrutura e alguns candidatos que saltaram à vista na análise. A fase 2 (Windows) já
tem um plano concreto porque é um objetivo declarado.

---

## Fase 1 — Afinar o macOS (deixar a app como pretendes)

> Preenche aqui o que queres mudar. Cada item: o que é, porquê, e "feito quando…".

### Backlog a decidir (candidatos da análise — nada disto está confirmado)

- [ ] **Toggle "Guardar em origem" ligado ao backend** — hoje grava sempre `_compressed`
      ao lado do original; decidir se deve substituir o ficheiro ou permitir escolher pasta.
- [ ] **Formato de saída de vídeo** — hoje é sempre `.mkv`; oferecer `.mp4` (compatibilidade)?
- [ ] **Progresso real** — o progresso por ficheiro é simulado; ligar ao progresso real
      do FFmpeg (parsing do stderr) e/ou dos passos WASM.
- [ ] **Clarificar semântica dos toggles/labels** — `overwriteToggle` é usado como "True Tone".
- [ ] **Mais formatos de saída de imagem** — WebP? PNG otimizado?
- [ ] **Presets de qualidade** (ex.: "Web", "Máxima", "Mínimo tamanho").
- [ ] **Definições persistentes** (última qualidade/formato usados).

### Confirmado / Feito

- [x] **Capa mensal remota** (2026-07-14) — a imagem do topo é carregada de `<site>/capa.png`
      ao abrir (nome fixo, substituis todos os meses). Fallback para a imagem embutida se
      estiver offline. Ficheiros: `src/config.js`, `src/ui/remote-header.js`.
- [x] **Aviso de nova versão** (2026-07-14) — lê `<site>/config.json` ao abrir; se a versão
      for mais recente, mostra banner com botão que abre a página de download no browser.
      Ficheiros: `src/ui/update-check.js`, plugin `tauri-plugin-http`.
      *Em dev usa `http://localhost:4599` (`_dev-server/`); mudar `BASE_URL` em
      `src/config.js` quando o site real existir.*
- [x] **Seletor de formato de output** (2026-07-14) — dropdown AVIF/WEBP/JPEG/PNG
      (substituiu o toggle True Tone). Novos pacotes `@jsquash/webp` e `@jsquash/png`.
- [x] **Compressão de PDF via Ghostscript** (2026-07-14) — sidecar `gs` reaproveitado da
      app antiga instalada (binário + `gs_resources` + `libs_x86`, ~83 MB, no .gitignore).
      Comando Rust `compress_pdf_ghostscript`; qualidade segue o slider:
      0-35 → /screen 100dpi · 36-70 → /ebook 150dpi · 71-90 → /printer 225dpi · 91-100 → /prepress 300dpi.
      Texto/vetores ficam intactos; só as imagens são reamostradas (Bicubic).

### Notas técnicas (PDF/Ghostscript)

- Os binários gs NÃO vão para o git (32 MB) — em macOS local vieram de
  `/Applications/fartcompressor.app`; no CI Windows são descarregados via choco.
- Modo dev: as dylibs do gs têm de existir em `src-tauri/target/Resources/MacOS/libs_x86`
  (o binário procura-as em `@executable_path/../Resources/...`). Se fizeres `cargo clean`,
  volta a copiar essa pasta de `src-tauri/binaries/libs_x86`.
- Build macOS: `tauri.macos.conf.json` bundla `gs_resources` e `libs_x86` no sítio certo.
- Windows: workflow copia `gswin64c.exe` + `gsdll64.dll` (⚠️ ainda não validado; os builds
  oficiais Windows têm os recursos embutidos, por isso GS_LIB pode nem ser preciso).
- Futuro Mac ARM (Apple Silicon): falta `gs-aarch64-apple-darwin` + dylibs arm64
  (a app antiga tinha uma pasta `libs` além de `libs_x86` — possivelmente para isso).

---

## Fase 2 — Suporte a Windows

A base já existe; falta validar e afinar.

### O que já está feito
- Binário `ffmpeg-x86_64-pc-windows-msvc.exe` em `src-tauri/binaries/`
- Workflow `.github/workflows/windows-build.yml` que, em cada push para `main`:
  1. Instala Node 20 + Rust (target `x86_64-pc-windows-msvc`)
  2. Baixa o FFmpeg de Windows
  3. Corre `npm install` + `npx tauri build`
  4. Publica artefactos `.msi` (WiX) e `.exe` (NSIS)

> Vantagem: **não precisas de uma máquina Windows** — o `.exe`/`.msi` é gerado na cloud
> pelo GitHub Actions. Descarregas os artefactos da aba "Actions" do repositório.

### Checklist para validar/afinar Windows
- [ ] Correr o workflow (push para `main` ou "Run workflow" manual) e confirmar que compila
      sem erros até ao fim.
- [ ] Descarregar o `.msi`/`.exe` e **testar numa máquina/VM Windows real**:
  - [ ] App abre e a janela aparece corretamente
  - [ ] Drag & drop de ficheiros funciona
  - [ ] Compressão de **imagem** (AVIF/JPEG) funciona
  - [ ] Compressão de **vídeo** funciona (sidecar FFmpeg resolve o caminho no Windows)
  - [ ] Ficheiros de saída são gravados no sítio certo
- [ ] Verificar caminhos de ficheiros: Windows usa `\` e drive letters — confirmar que
      `save_compressed_file` / `compress_video_ffmpeg` lidam bem (usam `std::path`, deve estar ok).
- [ ] Ícone da app no Windows (`icons/icon.ico`) — confirmar que existe e está correto.
- [ ] Identificador/assinatura: builds sem assinatura dão aviso do SmartScreen no Windows.
      Decidir se vale a pena assinar (certificado pago) ou aceitar o aviso por agora.
- [ ] Testar o instalador NSIS e o MSI (escolher qual distribuir).

### Riscos conhecidos Mac→Windows
- **Caminhos com carateres especiais/espaços** — o código usa `std::path`, o que ajuda,
  mas convém testar com nomes reais.
- **FFmpeg**: no macOS há binários aarch64 + x86_64; no Windows só x86_64. Confirmar que o
  Tauri escolhe o binário certo por plataforma (naming `-<target-triple>` está correto).
- **Permissões/capabilities**: `capabilities/default.json` deve aplicar-se a ambas as
  plataformas — reconfirmar após primeiro build Windows.

---

## Como registamos o progresso

- Cada mudança confirmada vira um item em "Confirmado (a fazer)" e depois um commit.
- Manter esta pasta `_planning/` fora do código da app (não afeta o build).
- Quando quiseres, decidimos se `_planning/` entra no git (por agora está untracked).
