# Assistente Univille

Assistente RAG em Python para responder perguntas de alunos com base em documentos oficiais enviados, como editais, matrizes curriculares e regulamentos da Univille.

O sistema usa Streamlit, LangChain, ChromaDB local persistente, embeddings Cohere `embed-multilingual-v3.0` e geração via Cohere por padrão. Talvez com update pra ser hospedado no Vercel.

## Estrutura

```text
.
├── app.py
├── ingest.py
├── rag.py
├── prompts.py
├── config.py
├── data/
├── chroma_db/
├── requirements.txt
├── .env.example
└── README.md
```

## Instalação

Crie e ative um ambiente virtual:

```bash
python -m venv .venv
.venv\Scripts\activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

## Configuração da API

O projeto já inclui um `.env` sem chaves preenchidas. Se quiser recriar a partir do modelo, copie `.env.example` para `.env`:

```bash
copy .env.example .env
```

Edite o `.env` com sua chave Cohere:

```env
EMBEDDING_PROVIDER=cohere
LLM_PROVIDER=cohere
COHERE_API_KEY=sua_chave_cohere_aqui
ADMIN_USERNAME=admin
ADMIN_PASSWORD=troque_esta_senha
```

Opcionalmente, você pode usar OpenAI para embeddings:

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sua_chave_openai_aqui
```

## Como rodar

Execute:

```bash
python -m uvicorn app:app --host 127.0.0.1 --port 8501
```

A interface React será servida pelo FastAPI em `http://localhost:8501`.

Para desenvolvimento do frontend:

```bash
cd frontend
npm install
npm run dev
```

Para gerar o frontend de produção usado pelo FastAPI:

```bash
cd frontend
npm run build
```

## Como adicionar documentos

Na barra lateral da interface, use o acesso admin configurado em `ADMIN_USERNAME` e `ADMIN_PASSWORD`.

1. Envie arquivos PDF ou TXT.
2. Clique em `Salvar documentos`.
3. Clique em `Indexar documentos`.

Os arquivos são salvos em `data/`. O índice vetorial é salvo localmente em `chroma_db/`.

Para remover documentos da consulta, entre no dashboard admin, selecione os arquivos em `Remover da consulta` e clique em `Remover selecionados`. O app apaga os arquivos da pasta `data/` e reindexa automaticamente os documentos restantes.

Também é possível colocar arquivos manualmente na pasta `data/` e rodar:

```bash
python ingest.py
```

O assistente tambem tem uma personalidade simpatica e universitaria, mas essa personalidade nunca substitui as regras de fidelidade ao contexto e também possui uma memoria curta caso ele não entenda o contexto da proxima pergunta ou se o usuario tentar contnuar uma conversa.


## Pipeline RAG

1. `ingest.py` lê PDFs e TXT.
2. PDFs são extraídos página por página com metadados de arquivo e página.
3. O sistema tenta detectar seção ou título a partir das primeiras linhas do texto.
4. Os textos são divididos em chunks de cerca de 900 caracteres com overlap de 180 (precisa mudar, pode estourar os tokens)
5. Os chunks são vetorizados e salvos no ChromaDB local.
6. `rag.py` busca os 5 chunks mais relevantes para cada pergunta.
7. O modelo gera a resposta usando somente esses chunks como contexto.
