# FartCompressor — Espaço de trabalho de Upgrade

Esta pasta (`/Users/fluxo/Documents/FartCompressor`) é a **cópia de trabalho** para
desenvolver os upgrades à app. Foi copiada a partir do projeto original em:

```
/Volumes/Macintosh HD/Users/RAD/Documentos HD/Peido App/1-Versão Beta/BetaFinal/FartCompressor
```

O histórico Git veio junto e continua ligado ao GitHub (remotes `origin` e `newaccount`),
por isso podes commitar e fazer push a partir daqui normalmente.

## O que NÃO foi copiado (regenerável)

| Excluído | Como recuperar |
|----------|----------------|
| `node_modules/` (104 MB) | `npm install` |
| `src-tauri/target/` (7 GB — build Rust) | Gera-se ao correr `npm run tauri dev`/`build` |
| `dist/` (build do frontend) | `npm run build` |
| Imagens de teste (`test*.jpg`, etc.) | Descartáveis; estão no histórico git |
| App já compilada (`Leve como 1 Peido.app`) | Recompila com `tauri build` |

> Nota: `git status` mostra estas imagens de teste como "deleted". É esperado — foram
> excluídas da cópia. Faz `git checkout .` se as quiseres de volta, ou ignora.

## Arranque rápido (primeira vez nesta pasta)

```bash
cd /Users/fluxo/Documents/FartCompressor
npm install            # reinstala dependências do frontend
npm run tauri dev      # corre a app em modo desenvolvimento (macOS)
```

Para compilar a app final de macOS:
```bash
npm run tauri build
```

## Documentos deste espaço de planeamento

- **[ESTADO-ATUAL.md](ESTADO-ATUAL.md)** — como a app está construída hoje (arquitetura, ficheiros-chave)
- **[ROADMAP.md](ROADMAP.md)** — backlog de upgrades a decidir juntos + plano Mac→Windows

## Pré-requisitos de ambiente (verificar antes de começar)

- **Node.js** (o CI usa v20) + npm
- **Rust** + Cargo (toolchain estável) — necessário para o Tauri
- **Xcode Command Line Tools** (macOS)
- Para builds Windows: já existe um workflow de **GitHub Actions** que compila na cloud,
  por isso não precisas de uma máquina Windows para gerar o `.exe`/`.msi` (ver ROADMAP).
