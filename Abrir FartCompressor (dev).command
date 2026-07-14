#!/bin/bash
# Atalho para arrancar a app FartCompressor em modo desenvolvimento.
# Basta duplo-clique neste ficheiro no Finder.

set -e
cd "$(dirname "$0")"

# Rust está instalado em ~/.cargo/bin — garantir que está no PATH
if [ -f "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
fi

# Servidor local (imita o site com capa.png + config.json) na porta 4599 — se ainda não estiver a correr
if ! curl -sf http://localhost:4599/config.json >/dev/null 2>&1; then
  echo "▶ A arrancar servidor local (capa/config) na porta 4599..."
  (cd _dev-server && python3 -m http.server 4599 >/tmp/fartcompressor-devserver.log 2>&1 &)
  sleep 1
fi

echo "▶ A arrancar FartCompressor (Vite + app)..."
echo "  (Fecha esta janela para parar a app.)"
echo
exec npm run tauri dev
