================================================================================
  ROTEIRO DE APRESENTAÇÃO — ASSISTENTE UNIVILLE (RAG)
  Versão redistribuída entre 4 apresentadores
  Duração sugerida: 12 a 18 minutos
  URL: assistente-univille.vercel.app
================================================================================

DIVISÃO DOS PAPÉIS
-------------------
Cada pessoa assume um bloco INTEIRO e contínuo (sem alternar turnos dentro
do bloco). A pessoa que está com a palavra também é quem comenta as falas
do ROBÔ na sua própria parte.

  • WILLIAM    → Parte 1: Abertura + Boas-vindas, Univille, Bolsas, Demo de limite   (~3-4 min)
  • SANDRIELY  → Parte 2: Curso de Eng. de Software, Vivências, Professores, Calendário (~4-5 min)
  • ANNA       → Parte 3: Como funciona por trás + Ativar modo, Capa, RAG, Objetivo, Stack (~4-5 min)
  • ERIK       → Parte 4: Embeddings, Ingestão, Arquitetura, Encerrar modo + Fechamento (~3-4 min)

PERSONAGENS
-----------
• ROBÔ (Assistente Univille): responde no chat com personalidade leve e universitária.
• Cada apresentador conduz sua parte e comenta o que o robô disse.

RECURSOS NA TELA
----------------
• Personagem animado (ouvindo → pensando → respondendo)
• Botão "Consultar fonte" (mostra PDF, página e trecho)
• Comando /apresentacao → ativa "Mostrar slide" nas respostas com PDF
• Comando /sair → encerra o modo apresentação

================================================================================
PARTE 1 — WILLIAM
================================================================================

--------------------------------------------------------------------------------
BLOCO 0 — ABERTURA (30 seg)
--------------------------------------------------------------------------------

[FALA DO WILLIAM]
"Hoje vocês vão conhecer o Assistente Univille: um chatbot que não inventa
resposta. Ele consulta dezenas de PDFs oficiais — editais, guias, matrizes,
regulamentos — e só responde com base no que encontrou. Primeiro vamos
conversar com ele como um aluno faria. Depois ele mesmo explica como foi
construído."

[AÇÃO] Abrir o chat. Deixar o robô visível na lateral.

----------------------------------------------------------------------
1.1 — BOAS-VINDAS
----------------------------------------------------------------------
[AÇÃO] Digitar: Oi

[ROBÔ — resposta esperada]
"Oláaaaa! Estou por aqui. Manda sua dúvida sobre a Univille que eu consulto
os documentos sem fazer malabarismo acadêmico."

[EXPLICAÇÃO — WILLIAM]
"Isso é só conversa inicial — ainda não consultou documentos. Serve para
quebrar o gelo antes das perguntas de conteúdo."

----------------------------------------------------------------------
1.2 — O QUE É A UNIVILLE?
----------------------------------------------------------------------
[AÇÃO] Digitar: O que é uma universidade comunitária na Univille?

[ROBÔ — resposta esperada]
A Univille é uma universidade comunitária, sem fins lucrativos, que reinveste
resultados em ensino, pesquisa e extensão. O aluno pode participar como
bolsista ou voluntário em projetos que impactam a comunidade.

[EXPLICAÇÃO — WILLIAM]
O robô buscou o Guia2.pdf — material de boas-vindas aos calouros. Em vez de
usar conhecimento genérico da internet, ele recuperou o trecho institucional
e reformulou em linguagem natural.

[DICA] Clicar em "Consultar fonte" → Guia2.pdf, página 3.

----------------------------------------------------------------------
1.3 — BOLSAS DE ESTUDO (não "bola de estudos")
----------------------------------------------------------------------
[AÇÃO] Digitar: O que são bolsas de estudo na Univille?

[ROBÔ — resposta esperada]
Explica programas como Bolsa Benefício, Bolsa Incentivo ao Ingresso, bolsas
de pesquisa (FAP), critérios e que não são cumulativas com outros benefícios.

[EXPLICAÇÃO — WILLIAM]
Nos PDFs o termo é "Bolsas de Estudo", não "bola". Isso mostra por que a
pergunta precisa estar alinhada ao vocabulário dos documentos.

[DICA] Fonte: Guia.pdf.

----------------------------------------------------------------------
1.4 — DEMO DE LIMITE (opcional, 20 seg)
----------------------------------------------------------------------
[AÇÃO] Digitar: O que é a bola de estudos?

[ROBÔ — resposta esperada]
"Puxa vida, não entendi a sua pergunta, poderia descrever melhor? Sei tudo
sobre a Univille apenas."

[EXPLICAÇÃO — WILLIAM]
O sistema foi configurado para NÃO alucinar. Se o termo não existe nos
documentos, ele prefere admitir que não entendeu — em vez de inventar uma
"bola de estudos". Isso é uma feature de segurança do RAG.

[PASSAGEM DE BASTÃO] William passa a palavra para Sandriely.

================================================================================
PARTE 2 — SANDRIELY
================================================================================

----------------------------------------------------------------------
1.5 — CURSO DE ENGENHARIA DE SOFTWARE
----------------------------------------------------------------------
[AÇÃO] Digitar: Qual a mensalidade e duração do curso de Engenharia de Software?

[ROBÔ — resposta esperada]
9 semestres, turno noturno, presencial em São Bento do Sul. Mensalidade a
partir de R$ 1.516,00 (varia conforme parcelas). Pode citar disciplinas
como IA, Banco de Dados, Fábrica de Software.

[EXPLICAÇÃO — SANDRIELY]
Combina ENGENHARIA DE SOFTWARE.pdf (comercial/grade) com a matriz curricular.
O rerank escolheu os trechos mais relevantes para "mensalidade" e "duração".

[DICA] Fontes: ENGENHARIA DE SOFTWARE.pdf e/ou Matriz-2023-Engenharia-de-Software.

----------------------------------------------------------------------
1.6 — CARGA HORÁRIA E VIVÊNCIAS
----------------------------------------------------------------------
[AÇÃO] Digitar: O que são Vivências de Extensão no curso de Engenharia de Software?

[ROBÔ — resposta esperada]
Projetos tecnológicos reais para comunidades, ONGs ou empresas. Cinco etapas
ao longo do curso, integradas aos Projetos Integradores. Carga horária total
do curso: 3.864 h/a.

[EXPLICAÇÃO — SANDRIELY]
Aqui o público vê que o assistente entende sinônimos: "vivências de extensão"
bate com a matriz e com o folder do curso, mesmo com redações diferentes.

----------------------------------------------------------------------
1.7 — PROFESSOR HENRY
----------------------------------------------------------------------
[AÇÃO] Digitar: Quem ensina Fundamentos de Inteligência Artificial?

[ROBÔ — resposta esperada]
Sim. Henry Hamon Pereira leciona Fundamentos de IA em Engenharia de Software.
Menciona experiência com RAG, busca vetorial e atuação na BPlus.

[EXPLICAÇÃO — SANDRIELY]
O PDF de perfil do Henry está indexado. A pergunta objetiva funciona melhor e
ele linkará o nome à resposta.

[DICA] Fonte: Henry Hamon Pereira (1).pdf.

----------------------------------------------------------------------
1.8 — JEAN MARCELO DIAS
----------------------------------------------------------------------
[AÇÃO] Digitar: Qual o papel do Jean como coordenador de Engenharia de Software?

[ROBÔ — resposta esperada]
Jean Marcelo Dias é Gestor de TI, Coordenador do Polo EaD e Coordenador do
curso de Eng. de Software em São Bento do Sul. Atua como ponte entre
instituição, docentes, discentes e mercado. Leciona IHC e Vivências de Extensão.

[EXPLICAÇÃO — SANDRIELY]
Perfil profissional indexado como documento próprio — demonstra que qualquer
PDF pode virar fonte de conhecimento do agente.

[DICA] Fonte: Jean Marcelo Dias.pdf.

----------------------------------------------------------------------
1.9 — CALENDÁRIO / EDITAIS (prova de utilidade real)
----------------------------------------------------------------------
[AÇÃO] Digitar: Quando começa o semestre letivo de 2026?

[ROBÔ — resposta esperada]
Datas variam por curso. Cita início em 12/02 ou 19/02 para alguns cursos no
1º semestre de 2026, conforme calendário e editais.

[EXPLICAÇÃO — SANDRIELY]
Mostra o caso de uso principal: prazos acadêmicos espalhados em editais
longos. O aluno pergunta em linguagem natural; o RAG encontra a data certa.

[DICA] Fonte: ERRATA edital + Calendário Acadêmico.

[PASSAGEM DE BASTÃO] Sandriely passa a palavra para Anna.

================================================================================
PARTE 3 — ANNA
================================================================================

--------------------------------------------------------------------------------
BLOCO 2 — COMO FUNCIONA POR TRÁS (2 min)
--------------------------------------------------------------------------------

[FALA DA ANNA — use o diagrama mental abaixo]

"Por trás de cada resposta há um pipeline RAG em três etapas:

  1. INDEXAÇÃO (ingest.py)
     PDFs/TXTs → chunks (~900 chars, overlap 180) → embeddings → ChromaDB

  2. RECUPERAÇÃO (rag.py)
     Pergunta vira vetor → busca semântica → rerank Cohere → top 5 trechos

  3. GERAÇÃO (Cohere command-a-03-2025)
     LLM recebe APENAS os trechos recuperados + regras anti-alucinação

A interface React mostra a fonte separada — o robô não cita arquivo na
resposta; vocês clicam em 'Consultar fonte' para auditar."

[AÇÃO] Mostrar rapidamente um "Consultar fonte" de qualquer resposta anterior.

--------------------------------------------------------------------------------
BLOCO 3 — MODO APRESENTAÇÃO: O ROBÔ SE APRESENTA
         Baseado no PDF Agente_RAG_Univille.pdf (7 slides)
--------------------------------------------------------------------------------

[FALA DA ANNA]
"Agora o protagonista assume. Vou ativar o modo apresentação — aí, depois de
cada resposta, aparece o botão 'Mostrar slide' com a página exata do PDF
técnico que alimentou a resposta."

----------------------------------------------------------------------
3.0 — ATIVAR MODO
----------------------------------------------------------------------
[AÇÃO] Digitar: /apresentacao

[ROBÔ]
"Modo apresentação ativado. Faça uma pergunta sobre os slides e, depois da
resposta, use Mostrar slide para abrir a página usada como fonte."

[EXPLICAÇÃO — ANNA]
Comando especial do frontend — não passa pelo RAG. Ativa CSS de apresentação
e o botão "Mostrar slide" no MessageBubble.

----------------------------------------------------------------------
3.1 — SLIDE 1: CAPA DO PROJETO
----------------------------------------------------------------------
[AÇÃO] Digitar: Qual o resumo do projeto Agente RAG Univille?

[ROBÔ — resposta esperada]
Assistente conversacional para alunos, baseado em documentos oficiais.
Arquitetura RAG com Python, LangChain, ChromaDB e React. Pipeline completo
de ingestão a geração contextual. Respostas verificáveis e atualizáveis.

[EXPLICAÇÃO — ANNA]
Slide de abertura do deck técnico — posiciona o projeto como case real, não
só teoria de RAG.

[AÇÃO] Clicar "Mostrar slide" → Agente_RAG_Univille.pdf, página 1.

----------------------------------------------------------------------
3.2 — SLIDE 2: O QUE É RAG?
----------------------------------------------------------------------
[AÇÃO] Digitar: O que é RAG?

[ROBÔ — resposta esperada]
RAG = Retrieval-Augmented Generation. Combina busca semântica + LLM. Em vez
de só o conhecimento pré-treinado, busca trechos na base própria, injeta no
prompt e reduz alucinações. Três passos: Indexação → Recuperação → Geração.

[EXPLICAÇÃO — ANNA]
Este é o conceito central da aula. O robô está literalmente demonstrando RAG
enquanto explica RAG — meta-apresentação.

[AÇÃO] "Mostrar slide" → página 2.

----------------------------------------------------------------------
3.3 — SLIDE 3: OBJETIVO DO ASSISTENTE
----------------------------------------------------------------------
[AÇÃO] Digitar: O que é o Assistente Univille?

[ROBÔ — resposta esperada]
Responde com base em editais, matrizes e regulamentos. Personalidade
simpática, mas fiel ao documento-fonte. Memória curta na conversa. Admin
envia, indexa e remove documentos pelo painel.

[EXPLICAÇÃO — ANNA]
Destaque os quatro pilares do slide: fonte de verdade, fidelidade, memória
curta e gestão de conteúdo.

[AÇÃO] "Mostrar slide" → página 3.

----------------------------------------------------------------------
3.4 — SLIDE 4: STACK TÉCNICA
----------------------------------------------------------------------
[AÇÃO] Digitar: Quais tecnologias o assistente usa no backend?

[ROBÔ — resposta esperada]
FastAPI (API + serve frontend), LangChain (orquestração), ChromaDB (vetores),
Cohere embed-multilingual-v3.0 (embeddings e geração), OpenAI opcional,
React + Vite na interface.

[EXPLICAÇÃO — ANNA]
Stack enxuta e acessível: Python no backend, banco vetorial local, modelo
multilíngue da Cohere ideal para português acadêmico.

[AÇÃO] "Mostrar slide" → página 4.

[PASSAGEM DE BASTÃO] Anna passa a palavra para Erik.

================================================================================
PARTE 4 — ERIK
================================================================================

----------------------------------------------------------------------
3.5 — SLIDE 4b: EMBEDDINGS (pergunta complementar)
----------------------------------------------------------------------
[AÇÃO] Digitar: O que são embeddings no pipeline do assistente?

[ROBÔ — resposta esperada]
Representações numéricas do texto (vetores). Gerados pelo embed-multilingual-
v3.0, armazenados no ChromaDB para comparar pergunta com documentos.

[EXPLICAÇÃO — ERIK]
Embeddings são o "GPS semântico": textos parecidos ficam próximos no espaço
vetorial, mesmo com palavras diferentes.

[AÇÃO] "Consultar fonte" (mesmo slide 4).

----------------------------------------------------------------------
3.6 — SLIDE 5: PIPELINE DE INGESTÃO
----------------------------------------------------------------------
[AÇÃO] Digitar: Explique o pipeline de ingestão do PDF ao ChromaDB

[ROBÔ — resposta esperada]
5 etapas:
  1. Leitura — ingest.py lê data/
  2. Extração — PDF página a página + metadados
  3. Detecção de seção
  4. Chunking — ~900 caracteres, overlap 180
  5. Vetorização — embeddings persistidos no ChromaDB

[EXPLICAÇÃO — ERIK]
É aqui que os PDFs da Univille viram "memória pesquisável". Sem reindexar
após upload, o robô não enxerga documentos novos.

[AÇÃO] "Mostrar slide" → página 5.

----------------------------------------------------------------------
3.7 — SLIDE 6: ARQUITETURA
----------------------------------------------------------------------
[AÇÃO] Digitar: O que é FastAPI no projeto do assistente?

[ROBÔ — resposta esperada]
Framework Python que serve API e build do React no mesmo deploy. Rotas de
chat, orquestração LangChain, autenticação admin. ChromaDB local com arquivos
em data/ e reindexação automática.

[EXPLICAÇÃO — ERIK]
Arquitetura monolito inteligente: um processo uvicorn, deploy simplificado
(Vercel com Mangum).

[AÇÃO] "Mostrar slide" → página 6.

----------------------------------------------------------------------
3.9 — ENCERRAR MODO
----------------------------------------------------------------------
[AÇÃO] Digitar: /sair

[ROBÔ]
"Modo apresentação encerrado. Voltamos ao chat normal."

--------------------------------------------------------------------------------
BLOCO 4 — FECHAMENTO (1 min)
--------------------------------------------------------------------------------

[FALA DO ERIK]
"Recapitulando: o Assistente Univille não substitui a leitura dos editais —
ele reduz o tempo para achar a informação certa, com fonte auditável. O RAG
garante que a resposta vem dos documentos; as regras do prompt garantem que
ele não inventa quando não sabe. Perguntas?"

================================================================================
