# Frontend da Plataforma de Estudos com IA

Nesta pasta, use Node 24:

```powershell
npm ci
npm run dev
```

Abra `http://127.0.0.1:5173`. O proxy encaminha chamadas da API para o backend local na porta 8000. Execute `npm test` para rodar os testes.

O backend é executado separadamente. O frontend não depende de arquivos do repositório backend; sem a API em execução, a página informa a indisponibilidade.

No Marco 1 é possível criar, pesquisar, renomear, arquivar e restaurar temas, manter conversas e enviar perguntas a um modelo Ollama escolhido manualmente. A lixeira preserva as conversas. Cancelar a resposta preserva o texto parcial. Recarregar a página recupera o histórico da API.

No Marco 2, selecione Estudar, Memorizar, Aprender ou Praticar na conversa. A troca mantém o histórico e é salva no backend. Novas respostas estruturadas aparecem após validação; rascunhos JSON não são exibidos, pois podem conter gabaritos. Nas mensagens antigas, o conteúdo continua textual.

Em Praticar, responda antes de abrir a referência. Dicas são progressivas, e as tentativas são recuperadas após recarregar. Objetivas são comparadas com um gabarito gerado por IA; abertas recebem referência para revisão sem nota automática. Os cartões de Memorizar não têm agendamento de revisão neste marco.

Para testes sem interferir no uso normal, defina STUDY_API_PORT=18000 e STUDY_WEB_PORT=15173 antes de iniciar os respectivos serviços. O backend aceita a origem local configurada em STUDY_WEB_PORT. O proxy continua restrito a 127.0.0.1. Configure E2E_BASE_URL=http://127.0.0.1:15173 no Playwright. Para exercício real em navegador, com API de produção e banco temporário, use E2E_REAL_MODEL e `npm run test:e2e -- --grep "exercício estruturado real"`.

## Verificações

Execute `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.

Para E2E, inicie o servidor determinístico descrito no README do backend e o frontend em loopback. Com Microsoft Edge instalado, execute `npm run test:e2e`. O teste de modelo real fica ignorado por padrão. Outros navegadores Playwright podem ser selecionados com `E2E_CHANNEL`, desde que instalados.

Para validar a integração real em navegador, use a API de produção com banco temporário e Ollama local. Defina `E2E_REAL_MODEL` com um modelo instalado e execute `npm run test:e2e -- --grep "modelo local real"`. São enviadas apenas perguntas sintéticas; o teste não faz download de modelos.

Os testes E2E dependem de serviços iniciados explicitamente; o CI padrão executa somente checks e testes unitários. Capturas e traces locais ficam em `test-results/`, ignorado pelo Git.

Consulte [as regras](AGENTS.md), [as tarefas](TASKS.md), [o planejamento](PLANEJAMENTO_PLATAFORMA_ESTUDOS_IA.md), [as decisões](docs/architecture/0001-foundation.md) e [o contrato HTTP](docs/api/contracts.md).
