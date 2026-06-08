# Assistente Univille

Assistente RAG em Python para responder perguntas de alunos com base em documentos oficiais enviados, como editais, matrizes curriculares e regulamentos.

O sistema usa Streamlit, LangChain, ChromaDB local persistente, embeddings Cohere `embed-multilingual-v3.0` e geração via Cohere `command-a-03-2025` por padrão.

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
streamlit run app.py
```

A interface abrirá no navegador.

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

## Como testar perguntas

Depois de indexar documentos, digite perguntas como:

```text
Como funciona o trancamento de matrícula?
```

```text
Quais são os requisitos do edital?
```

```text
Qual disciplina aparece na matriz curricular do curso?
```

A resposta deve trazer somente a resposta final, sem os rótulos `Resposta:` ou `Explicacao:`. As fontes não aparecem no texto da IA; quando houver fonte recuperada, use o botão `Consultar fonte` em cada resposta para ver arquivo, página, linhas aproximadas e trecho recuperado dentro do navegador.

O app usa uma interface em formato de chat com tema escuro, campo de pergunta fixo na parte inferior e historico mantido durante a sessao. Use `Limpar historico` na barra lateral para iniciar uma conversa nova.

O Assistente Univille tambem usa memoria curta: as ultimas mensagens ajudam a entender referencias como "isso", "esse prazo" ou "essa disciplina". Essa memoria nao substitui o RAG e nao serve como fonte oficial; a resposta continua dependendo dos trechos recuperados dos documentos.

## Como o sistema evita alucinação

O arquivo `prompts.py` define regras anti-alucinação:

- responder apenas com base no contexto recuperado;
- dizer `Não encontrei essa informação nos documentos disponíveis.` quando os documentos não forem suficientes;
- dizer `Puxa vida, não entendi a sua pergunta, poderia descrever melhor? Sei tudo sobre a Univille apenas.` quando a pergunta estiver confusa, fora do universo dos documentos da Univille ou nao puder ser respondida pelos trechos recuperados;
- não inventar prazos, nomes, valores, regras ou procedimentos;
- nao citar fontes dentro da resposta;
- exibir fontes apenas pela interface, no botao `Consultar fonte`.

Além disso, `rag.py` usa rerank da Cohere (`COHERE_RERANK_MODEL`) antes de chamar o modelo. Se nenhum trecho passar no corte `MIN_RERANK_SCORE`, o LLM nao e chamado. Isso evita respostas de conhecimento geral ou qualquer assunto que nao esteja nos documentos.

O assistente tambem tem uma personalidade simpatica e universitaria, mas essa personalidade nunca substitui as regras de fidelidade ao contexto.

Quando alterar a forma de exibir fontes ou adicionar novos documentos, clique em `Indexar documentos` novamente. A indicacao de linha e aproximada, pois PDFs nem sempre preservam linhas reais durante a extracao de texto.

## Pipeline RAG

1. `ingest.py` lê PDFs e TXT.
2. PDFs são extraídos página por página com metadados de arquivo e página.
3. O sistema tenta detectar seção ou título a partir das primeiras linhas do texto.
4. Os textos são divididos em chunks de cerca de 900 caracteres com overlap de 180.
5. Os chunks são vetorizados e salvos no ChromaDB local.
6. `rag.py` busca os 5 chunks mais relevantes para cada pergunta.
7. O modelo gera a resposta usando somente esses chunks como contexto.
