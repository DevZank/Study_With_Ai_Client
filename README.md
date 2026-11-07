# Frontend da Plataforma de Estudos com IA

Nesta pasta, use Node 24:

```powershell
npm ci
npm run dev
```

Abra `http://127.0.0.1:5173`. O proxy encaminha chamadas da API para o backend local na porta 8000. Execute `npm test` para rodar os testes.

O backend é executado separadamente. O frontend não depende de arquivos do repositório backend; sem a API em execução, a página informa a indisponibilidade.

Consulte [as regras](AGENTS.md), [as tarefas](TASKS.md), [o planejamento](PLANEJAMENTO_PLATAFORMA_ESTUDOS_IA.md), [as decisões](docs/architecture/0001-foundation.md) e [o contrato HTTP](docs/api/contracts.md).
