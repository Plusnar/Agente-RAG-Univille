# Assistente Univille

Assistente RAG com interface React animada e API Python (FastAPI). Responde perguntas de alunos com base em documentos oficiais da Univille (editais, calendário, regulamentos).

## Estrutura

```text
.
├── api/index.py          # handler serverless (Vercel)
├── app.py                # API FastAPI
├── rag.py / ingest.py    # pipeline RAG
├── config.py / prompts.py
├── frontend/             # interface React (Vite)
├── data/                 # PDFs e TXTs
├── chroma_db/            # indice vetorial
├── vercel.json
├── requirements.txt
└── requirements-dev.txt  # embeddings locais (dev)
```

## Variaveis de ambiente

Copie `.env.example` para `.env` (local):

```bash
copy .env.example .env
```

Producao (Vercel): configure no painel **Settings → Environment Variables**:

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| `COHERE_API_KEY` | Sim | Chave Cohere (LLM + embeddings) |
| `EMBEDDING_PROVIDER` | Sim | Use `cohere` na Vercel |
| `LLM_PROVIDER` | Sim | Use `cohere` |
| `ADMIN_USERNAME` | Nao | Apenas dev local |
| `ADMIN_PASSWORD` | Nao | Apenas dev local |
| `EMBEDDING_TOKENS_PER_MINUTE` | Nao | Controle de ritmo da indexacao; use `90000` para chaves trial Cohere com limite de 100000 tokens/min |

## Desenvolvimento local

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt

copy .env.example .env
# edite .env com suas chaves

cd frontend && npm install && npm run build && cd ..
python -m uvicorn app:app --host 127.0.0.1 --port 8501
```

Ou frontend com hot-reload:

```bash
cd frontend && npm run dev
```

## Indexar documentos (local)

1. Coloque PDFs/TXTs em `data/`
2. Rode `python ingest.py`
3. O indice e salvo em `chroma_db/`

O indexador respeita `EMBEDDING_TOKENS_PER_MINUTE` e espera automaticamente
quando necessario, sem pular chunks. Para Cohere trial, mantenha o valor abaixo
do limite informado pela API.

Na interface local, tambem e possivel usar o painel **Documentos** (admin).

## Deploy na Vercel (sem Git)

Na raiz do projeto, com a Vercel CLI logada (`npx vercel login`):

```bash
npm run deploy
```

Ou manualmente:

```bash
npx vercel link --yes --scope plusnar
npx vercel --prod --yes
```

O deploy envia os arquivos locais direto (inclui `chroma_db/` e `data/`). Nao precisa de repositorio Git.

URL de producao: configurada no projeto `assistente-univille` na Vercel.

O build gera o frontend em `frontend/dist`. A API roda como serverless Python em `/api/*`.

**Limitacoes em producao (Vercel):**
- Upload/indexacao de documentos desativados (filesystem somente leitura)
- Atualize documentos localmente, reindexe e faca redeploy com `chroma_db/` atualizado
- Use embeddings Cohere (nao use `local` — sentence-transformers e pesado demais para serverless)

## Pipeline RAG

1. `ingest.py` le PDFs e TXTs
2. Textos divididos em chunks e vetorizados no ChromaDB
3. `rag.py` busca os chunks mais relevantes
4. Cohere gera a resposta somente com base nesse contexto
