# Assistente Univille

Assistente RAG em produção na [Vercel](https://vercel.com) para responder perguntas de alunos com base em documentos oficiais da Univille — editais, calendários, regulamentos, matrizes curriculares e demais PDFs/TXTs indexados.

O sistema combina uma interface React animada com uma API Python serverless (FastAPI). O aluno faz perguntas em linguagem natural; o assistente consulta os documentos, gera uma resposta fundamentada e exibe a fonte consultada.

## O que o assistente faz

- Responde perguntas **somente** com base nos documentos indexados no deploy.
- Mantém **memória curta** da conversa (até 6 mensagens recentes) para entender referências como "esse prazo" ou "essa disciplina".
- Exibe a **fonte consultada** em um modal separado, com trecho do documento e link para abrir o PDF.
- Possui personalidade universitária e leve, sem comprometer a precisão em assuntos acadêmicos e burocráticos.
- Recusa perguntas fora do escopo dos documentos ou de conhecimento geral, com mensagens claras ao aluno.

## Arquitetura em produção

```text
Aluno (navegador)
       │
       ▼
┌──────────────────────────────────────┐
│  Vercel — frontend estático (React)  │
│  frontend/dist                       │
└──────────────────────────────────────┘
       │  POST /api/chat
       ▼
┌──────────────────────────────────────┐
│  Vercel — função serverless Python   │
│  api/index.py → FastAPI (app.py)     │
│  Memória: 2048 MB · Timeout: 60 s    │
└──────────────────────────────────────┘
       │
       ├── ChromaDB (índice em /tmp, copiado do deploy)
       ├── data/ (PDFs e TXTs embutidos no deploy)
       └── Cohere API (embeddings + LLM + rerank)
```

Na Vercel, o frontend é servido como site estático. As rotas `/api/*` e `/documents/*` são encaminhadas para a função Python. O índice vetorial (`chroma_db/`) e os documentos (`data/`) vão junto no deploy e são copiados para `/tmp` em cada cold start, pois o filesystem da Vercel é somente leitura.

## Estrutura do repositório

```text
.
├── api/index.py          # Handler serverless (Mangum + FastAPI)
├── app.py                # API REST
├── rag.py                # Busca vetorial, rerank e geração de resposta
├── ingest.py             # Pipeline de indexação (usado antes do deploy)
├── config.py             # Configuração e providers de IA
├── prompts.py            # Instruções do assistente
├── frontend/             # Interface React (Vite)
├── data/                 # Documentos oficiais (PDF/TXT)
├── chroma_db/            # Índice vetorial pré-gerado
├── vercel.json           # Configuração de build e rewrites
└── requirements.txt      # Dependências Python de produção
```

## Interface

A interface de produção oferece:

- Chat com personagem animado que reage ao estado da conversa (ouvindo, pensando, respondendo).
- Efeito de digitação nas respostas do assistente.
- Botão **Consultar fonte** com nome do arquivo, página, linhas e trecho utilizado.
- Link para abrir o PDF ou TXT original em `/documents/{arquivo}`.
- Persistência da conversa na sessão do navegador (`sessionStorage`).
- Modo apresentação para uso em telas maiores.

O painel de administração de documentos **não está disponível** em produção (`VITE_ADMIN_ENABLED=false`).

## Pipeline RAG

Fluxo de cada pergunta em produção:

1. **Pré-processamento** — saudações curtas ("oi", "bom dia") recebem resposta fixa sem consultar o índice.
2. **Busca vetorial** — o ChromaDB recupera os chunks mais similares à pergunta (até 12 candidatos).
3. **Rerank (opcional)** — a API Cohere reordena os trechos por relevância e filtra por score mínimo.
4. **Geração** — o modelo `command-a-03-2025` (Cohere) responde usando apenas o contexto recuperado e o histórico recente.
5. **Pós-processamento** — remove menções a fontes no texto, detecta respostas genéricas ou fora de escopo e formata a saída.
6. **Exibição** — a resposta vai para o chat; a fonte com maior relevância aparece no modal.

### Regras anti-alucinação

O assistente é instruído a:

- Não inventar prazos, nomes, valores ou procedimentos.
- Não usar conhecimento externo, mesmo que pareça óbvio.
- Informar *"Não encontrei essa informação nos documentos disponíveis."* quando o contexto não contém a resposta.
- Pedir esclarecimento quando a pergunta estiver confusa ou fora do universo Univille.

## API em produção

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Status do serviço, ambiente e providers |
| `POST` | `/api/chat` | Envia pergunta e histórico; retorna resposta e fontes |
| `GET` | `/api/documents` | Lista documentos disponíveis no deploy |
| `GET` | `/documents/{arquivo}` | Abre PDF ou TXT original |

### Exemplo de requisição

```json
POST /api/chat
{
  "question": "Qual o prazo para rematrícula?",
  "history": [
    { "role": "user", "content": "Olá" },
    { "role": "assistant", "content": "..." }
  ]
}
```

### Exemplo de resposta

```json
{
  "answer": "Texto da resposta gerada pelo assistente.",
  "sources": ["Guia2.pdf, pagina 3"],
  "source_details": [
    {
      "file_name": "Guia2.pdf",
      "file_type": "pdf",
      "page": 3,
      "section": "",
      "line_start": 12,
      "line_end": 28,
      "excerpt": "Trecho utilizado como contexto..."
    }
  ]
}
```

Rotas de administração (`/api/admin/*`) existem na API, mas retornam erro **503** em produção — upload e reindexação não são permitidos no ambiente serverless.

## Variáveis de ambiente (Vercel)

Configure em **Settings → Environment Variables** no painel da Vercel:

| Variável | Obrigatória | Valor em produção |
|----------|-------------|-------------------|
| `COHERE_API_KEY` | Sim | Chave da API Cohere |
| `EMBEDDING_PROVIDER` | Sim | `cohere` |
| `LLM_PROVIDER` | Sim | `cohere` |
| `COHERE_EMBED_MODEL` | Não | `embed-multilingual-v3.0` (padrão) |
| `COHERE_CHAT_MODEL` | Não | `command-a-03-2025` (padrão) |
| `CHROMA_COLLECTION` | Não | `assistente_univille` (padrão) |
| `RETRIEVER_K` | Não | `5` — quantidade de chunks enviados ao LLM |
| `USE_COHERE_RERANK` | Não | `true` ou `false` |
| `COHERE_RERANK_MODEL` | Não | `rerank-v4.0-fast` (padrão) |
| `MIN_RERANK_SCORE` | Não | `0.20` — score mínimo do rerank |

Embeddings locais (`local`) e OpenAI são suportados no código, mas em produção o provider **deve ser `cohere`** — modelos locais são pesados demais para funções serverless.

## Deploy na Vercel

O projeto está configurado para deploy contínuo a partir do repositório GitHub ou via Vercel CLI.

### Build

O `vercel.json` define:

- **Install:** `cd frontend && npm ci`
- **Build:** `cd frontend && npm run build`
- **Output:** `frontend/dist`
- **Função Python:** `api/index.py` com `chroma_db/**`, `data/**` e `*.py` incluídos

### Atualizar documentos em produção

Como o filesystem da Vercel é somente leitura, documentos novos ou alterados precisam ser preparados **antes** do deploy:

1. Adicionar ou substituir PDFs/TXTs em `data/`.
2. Gerar o índice vetorial em `chroma_db/` (pipeline de indexação).
3. Fazer redeploy na Vercel com `data/` e `chroma_db/` atualizados.

Após o deploy, os alunos passam a consultar a nova base automaticamente.

## Limitações em produção

| Limitação | Detalhe |
|-----------|---------|
| Sem upload na interface | Painel admin desativado; documentos vêm do deploy |
| Filesystem somente leitura | Índice copiado para `/tmp` a cada cold start |
| Timeout de 60 s | Perguntas muito complexas podem expirar |
| Memória de 2048 MB | Limite da função serverless |
| Provider Cohere obrigatório | Embeddings e LLM via API externa |
| Rate limit da Cohere | Chaves trial podem bloquear temporariamente em picos de uso |

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, Vite 7 |
| API | FastAPI, Mangum |
| RAG | LangChain, ChromaDB |
| Embeddings | Cohere `embed-multilingual-v3.0` |
| LLM | Cohere `command-a-03-2025` |
| Rerank | Cohere `rerank-v4.0-fast` |
| Hospedagem | Vercel (serverless Python + CDN estática) |

## Repositório

Código-fonte: [github.com/Plusnar/Agente-RAG-Univille](https://github.com/Plusnar/Agente-RAG-Univille)
