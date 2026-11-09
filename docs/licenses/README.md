# Editores e fontes — avisos preservados

TipTap 3.33.0 e Excalidraw 0.18.1 usam MIT. Os avisos originais estão nos arquivos tiptap-MIT.txt e excalidraw-MIT.txt. Devem acompanhar cópias e distribuições, conforme os textos. As fontes OFL permitem incorporação em aplicativos comerciais e têm suas próprias condições, incluindo preservação dos avisos, nomes reservados e restrições para venda isolada de fontes. Isso não determina a licença do código da plataforma.

Os textos legais originais foram mantidos no idioma da fonte para preservar sua integridade. O postinstall copia esta pasta junto com os recursos locais do quadro. Esta verificação corresponde à adoção dos editores no Marco 4; não substitui a auditoria completa de distribuição e dependências prevista em B025.

| Recurso | Evidência oficial consultada | Aviso local |
| --- | --- | --- |
| TipTap | https://github.com/ueberdosis/tiptap/blob/v3.33.0/LICENSE.md | tiptap-MIT.txt |
| Excalidraw | https://github.com/excalidraw/excalidraw/blob/v0.18.1/LICENSE | excalidraw-MIT.txt |
| Assistant | https://github.com/google/fonts/blob/main/ofl/assistant/OFL.txt | Assistant-OFL.txt |
| Cascadia Code | https://github.com/microsoft/cascadia-code/blob/main/LICENSE | Cascadia-OFL.txt |
| Liberation | https://github.com/liberationfonts/liberation-fonts/blob/main/LICENSE | Liberation-OFL.txt |
| Lilita One | https://github.com/google/fonts/blob/main/ofl/lilitaone/OFL.txt | Lilita-OFL.txt |
| Nunito | https://github.com/google/fonts/blob/main/ofl/nunito/OFL.txt | Nunito-OFL.txt |
| ComicShanns | https://github.com/excalidraw/excalidraw/blob/v0.18.1/packages/excalidraw/fonts/ComicShanns/index.ts | ComicShanns-metadata.txt; aviso MIT nos metadados |
| Excalifont | https://github.com/excalidraw/excalidraw/blob/v0.18.1/packages/excalidraw/fonts/Excalifont/index.ts | Excalifont-metadata.txt; copyright e texto OFL nos metadados |
| Xiaolai | https://github.com/excalidraw/excalidraw/blob/v0.18.1/packages/excalidraw/fonts/Xiaolai/index.ts | Xiaolai-metadata.txt; copyright e declaração OFL; termos integrais OFL também preservados nesta pasta |
| Virgil | https://github.com/excalidraw/excalidraw/tree/v0.18.1/packages/excalidraw/fonts/Virgil | Incluído na árvore do projeto sob seu aviso MIT; nenhum aviso específico adicional encontrado nessa árvore |

## Correções de dependências

O pacote Excalidraw original introduziu alertas de nanoid, lodash-es e KaTeX. Overrides fixam nanoid 3.3.20/5.1.16 conforme a versão de origem, lodash-es 4.18.1 e o KaTeX 0.19.1 já adotado na aplicação. Radix Tabs 1.2.1 substitui a versão transitiva que declarava somente React até 18. Lockfile, typecheck, build e E2E são validados em conjunto; não foi usado audit fix --force.

As versões efetivamente instaladas podem ser consultadas em package-lock.json. A auditoria npm da entrega retornou zero vulnerabilidades. Novos avisos ou atualizações requerem reavaliação; não atualizar dependências silenciosamente.
