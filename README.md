# Conferência de Obra

App para vistoria e conferência de obras em campo. Funciona no celular e no computador, pode ser instalado na tela inicial e **funciona sem internet**: tudo fica salvo no próprio aparelho.

## O que faz

- **Obras:** cadastro com endereço, cliente e responsável técnico.
- **Vistorias com checklists prontos:** fundação, estrutura, alvenaria, instalações, acabamento, recebimento de materiais e segurança do trabalho (NR-18). Cada item é marcado como OK, não conforme ou N/A, e dá para adicionar itens próprios.
- **Medições:** valor de projeto x medido com tolerância; o app marca conforme ou não conforme sozinho.
- **Fotos e observações** em cada item (foto com data, hora e localização).
- **Pendências** com responsável e prazo, geradas a partir dos itens não conformes; prazos vencidos aparecem em destaque.
- **Relatório em PDF** com resumo, fotos, pendências e assinatura do responsável. No celular abre o menu de compartilhar (WhatsApp, e-mail).

## Próximos passos

- Análise automática dos projetos (PDF e DWG) com IA para gerar o checklist do que conferir.
- Sincronização entre os aparelhos da equipe.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm run build    # gera a versão final em dist/
```

Ao juntar na `main`, o GitHub Actions publica o app no GitHub Pages.
