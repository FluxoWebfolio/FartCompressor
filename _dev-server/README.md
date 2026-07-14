# Servidor local (imita o teu site)

Esta pasta simula o que, mais tarde, vai estar alojado em `ricardosequeira.eu`
(ou num subdomínio). Serve para desenvolver e testar as funcionalidades de:
- **Capa mensal** → `capa.png` (nome fixo; substituis todos os meses)
- **Verificação de nova versão** → `config.json`

## Como correr o servidor local

Numa janela de terminal à parte:

```bash
cd /Users/fluxo/Documents/FartCompressor/_dev-server
python3 -m http.server 4599
```

Fica disponível em `http://localhost:4599/` — com:
- `http://localhost:4599/capa.png`
- `http://localhost:4599/config.json`

A app (em modo dev) vai ler destes URLs. O URL base está definido **num único sítio**
no código, por isso quando o site real estiver pronto muda-se só essa linha.

## Passar para produção (mais tarde)

1. Decidir o local em `ricardosequeira.eu` (ex.: subdomínio `app.ricardosequeira.eu`
   ou pasta `ricardosequeira.eu/fartcompressor/`).
2. Fazer upload de `capa.png` e `config.json` para lá.
3. Mudar o URL base no código para esse endereço.
4. Recompilar e distribuir a app.

## Rotina mensal (capa)

Substituir `capa.png` no site. Feito. (A app usa "cache-busting" para ir sempre
buscar a versão mais recente.)

## Quando lanças nova versão da app

Editar `config.json`:
- `versao_mais_recente` → o novo número (ex.: "0.2.0")
- `pagina_download` → link da página onde está o download
- `novidades` → texto curto do que mudou
