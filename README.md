# Assistente Univille

Assistente inteligente baseado em **RAG (Retrieval-Augmented Generation)** para alunos da Univille. O sistema lê documentos oficiais da instituição — editais, calendários, regulamentos, matrizes curriculares e guias — e responde perguntas em linguagem natural com base exclusivamente nesse conteúdo.

Em vez de depender da memória geral de um modelo de linguagem, o assistente **busca trechos relevantes nos documentos**, monta um contexto preciso e só então gera a resposta. Isso reduz alucinações e garante que prazos, regras e procedimentos venham das fontes corretas.

---

## Para que serve

O Assistente Univille existe para centralizar o acesso à informação institucional. Um aluno pode perguntar coisas como:

- *"Qual o prazo para rematrícula?"*
- *"Como funciona o estágio obrigatório?"*
- *"O que o edital diz sobre trancamento?"*

O sistema consulta os PDFs e TXTs indexados, identifica os trechos mais relacionados à pergunta e devolve uma resposta clara, com link para a **fonte consultada** (arquivo, página e trecho utilizado).

Também mantém **memória curta da conversa** (até 6 mensagens recentes), permitindo perguntas de continuação como *"e qual o prazo disso?"* sem que o aluno precise repetir o contexto.

---

## Como funciona

O projeto segue a arquitetura clássica de um sistema RAG em três etapas: **indexação**, **recuperação** e **geração**.

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Documentos │ ──► │  Embeddings  │ ──► │  ChromaDB   │     │              │
│  PDF / TXT  │     │  (vetores)   │     │  (índice)   │     │              │
└─────────────┘     └──────────────┘     └─────────────┘     │   Resposta   │
                                                              │   ao aluno   │
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     │              │
│  Pergunta   │ ──► │  Busca       │ ──► │  LLM        │ ──► └──────────────┘
│  do aluno   │     │  vetorial    │     │  (Cohere)   │
└─────────────┘     └──────────────┘     └─────────────┘
```

### 1. Indexação (`ingest.py`)

Antes de responder qualquer pergunta, os documentos passam por um pipeline de preparação:

1. **Leitura** — PDFs são extraídos página a página com `pypdf`; arquivos TXT são lidos em UTF-8 ou Latin-1.
2. **Metadados** — cada trecho recebe informações como nome do arquivo, número da página, seção detectada e intervalo de linhas.
3. **Chunking** — o texto é dividido em pedaços de ~900 caracteres com sobreposição de 180 caracteres (`RecursiveCharacterTextSplitter`), preservando parágrafos e frases sempre que possível.
4. **Vetorização** — cada chunk é convertido em um **embedding** (vetor numérico de alta dimensão) pelo modelo `embed-multilingual-v3.0` da Cohere.
5. **Armazenamento** — os vetores e metadados são salvos no **ChromaDB**, um banco de dados vetorial persistente em `chroma_db/`.

### 2. Recuperação (`rag.py`)

Quando o aluno faz uma pergunta:

1. A pergunta também é convertida em embedding pelo mesmo modelo.
2. O ChromaDB executa uma **busca por similaridade** — compara o vetor da pergunta com todos os vetores dos chunks e retorna os mais próximos no espaço semântico (até 12 candidatos).
3. Opcionalmente, o **Cohere Rerank** (`rerank-v4.0-fast`) reordena esses candidatos por relevância real em relação à pergunta e descarta trechos com score abaixo de 0.20.
4. Os 5 melhores chunks (`RETRIEVER_K`) formam o contexto enviado ao modelo de linguagem.

### 3. Geração (`rag.py` + `prompts.py`)

O modelo `command-a-03-2025` (Cohere) recebe:

- instruções de comportamento do assistente;
- o histórico recente da conversa;
- os trechos recuperados dos documentos;
- a pergunta do aluno.

Ele produz a resposta final **somente com base nesse contexto**. As fontes são exibidas separadamente na interface, no botão **Consultar fonte**.

---

## Embeddings e busca vetorial

### O que é um embedding?

Um **embedding** é uma representação numérica de um texto. O modelo de embeddings transforma palavras, frases e parágrafos em listas de números (vetores) de centenas de dimensões.

Textos com **significado parecido** ficam **próximos** nesse espaço vetorial, mesmo usando palavras diferentes. Por exemplo, *"prazo de rematrícula"* e *"data limite para renovar a matrícula"* geram vetores similares.

O projeto usa o modelo **`embed-multilingual-v3.0`** da Cohere, otimizado para múltiplos idiomas — ideal para documentos acadêmicos em português.

### Como funciona a busca vetorial?

A busca vetorial substitui a busca por palavra-chave tradicional. Em vez de procurar correspondências literais, o sistema mede a **distância semântica** entre a pergunta e cada chunk armazenado.

```text
Pergunta: "Quando devo fazer a rematrícula?"
                    │
                    ▼  embedding da pergunta → [0.12, -0.45, 0.88, ...]
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Chunk A       Chunk B       Chunk C
   score 0.91    score 0.87    score 0.34
   (edital)      (calendário)  (matriz)
        │           │
        └─────┬─────┘
              ▼
        Contexto enviado ao LLM
```

O ChromaDB calcula a similaridade entre vetores e devolve os chunks com maior afinidade semântica. Isso permite encontrar informações mesmo quando o aluno formula a pergunta de forma diferente do texto original do documento.

### Rerank: refinando a busca

A busca vetorial é rápida, mas às vezes traz trechos apenas vagamente relacionados. O **rerank** é uma segunda camada que usa um modelo especializado para avaliar, par a par, a relevância de cada trecho em relação à pergunta. Só os chunks com score acima do limiar configurado seguem para a geração da resposta.

---

## Stack tecnológica

| Camada | Tecnologia | Função |
|--------|------------|--------|
| **Frontend** | React 19, Vite 7 | Interface de chat animada com personagem assistente |
| **API** | FastAPI, Mangum | Endpoints REST; adaptador serverless para a Vercel |
| **Orquestração RAG** | LangChain | Integração entre embeddings, vectorstore e LLM |
| **Banco vetorial** | ChromaDB | Armazenamento e busca por similaridade dos embeddings |
| **Embeddings** | Cohere `embed-multilingual-v3.0` | Conversão de texto em vetores semânticos |
| **LLM** | Cohere `command-a-03-2025` | Geração da resposta em linguagem natural |
| **Rerank** | Cohere `rerank-v4.0-fast` | Reordenação dos trechos por relevância |
| **Leitura de PDF** | pypdf | Extração de texto página a página |
| **Hospedagem** | Vercel | Frontend estático + função Python serverless |

---

## Estrutura do projeto

```text
.
├── api/index.py          # Entrada serverless (Mangum)
├── app.py                # API REST — rotas de chat, documentos e health
├── rag.py                # Busca vetorial, rerank e geração de resposta
├── ingest.py             # Leitura, chunking e indexação no ChromaDB
├── config.py             # Providers de IA e parâmetros do pipeline
├── prompts.py            # Personalidade e regras do assistente
├── frontend/             # Interface React (Vite)
├── data/                 # Documentos oficiais (PDF e TXT)
├── chroma_db/            # Índice vetorial persistido
└── vercel.json           # Configuração de build e deploy
```

---

## Interface

A interface oferece uma experiência de chat com:

- Personagem animado que reage ao estado da conversa (ouvindo, pensando, respondendo).
- Efeito de digitação nas respostas.
- Botão **Consultar fonte** com arquivo, página, linhas e trecho do documento.
- Abertura do PDF ou TXT original diretamente pelo navegador.
- Persistência da conversa na sessão do navegador.

---

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Status do serviço |
| `POST` | `/api/chat` | Envia pergunta e histórico; retorna resposta e fontes |
| `GET` | `/api/documents` | Lista documentos indexados |
| `GET` | `/documents/{arquivo}` | Abre o PDF ou TXT original |

**Exemplo de requisição:**

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

**Exemplo de resposta:**

```json
{
  "answer": "A rematrícula deve ser feita entre ...",
  "sources": ["Guia2.pdf, pagina 3"],
  "source_details": [
    {
      "file_name": "Guia2.pdf",
      "file_type": "pdf",
      "page": 3,
      "excerpt": "Trecho utilizado como contexto..."
    }
  ]
}
```

---

## Repositório

[github.com/Plusnar/Agente-RAG-Univille](https://github.com/Plusnar/Agente-RAG-Univille)

Vercel: https://assistente-univille.vercel.app/
