# Sistema de gestão — Clínica de Estética

Sistema web (funciona no computador e no celular) para agenda, clientes e prontuário.

## O que já tem (Etapa 1)

- **Login com perfis**: Administrador(a), Profissional e Recepção
- **Agenda**: grade por profissional no computador e lista no celular. Agendar clicando no horário, status (agendado → confirmado → atendido / faltou / cancelado), aviso de horário ocupado, cadastro rápido de cliente nova e botão para **confirmar pelo WhatsApp** com mensagem pronta
- **Clientes**: cadastro completo, busca por nome/telefone/CPF/e-mail, inativar
- **Prontuário**: anamnese de estética (com histórico de versões e alertas destacados), evolução dos atendimentos, **fotos antes/depois** (protegidas por login) e histórico de agendamentos
- **Procedimentos**: catálogo com duração, valor e nº de sessões
- **Equipe**: usuários, perfis e cor de cada profissional na agenda
- **Início**: resumo do dia, confirmações pendentes de amanhã e aniversariantes do mês (com parabéns pelo WhatsApp)
- Pode ser "instalado" no celular (menu do navegador → *Adicionar à tela inicial*)

## Etapa 2 — Orçamentos e financeiro

- **Orçamentos / planos de tratamento**: vários procedimentos, profissional por item, sessões, desconto em R$ ou %, validade, PDF e envio por WhatsApp. Ao aprovar, informa entrada + nº de parcelas e o sistema gera as contas a receber
- **Pacotes de sessões**: na agenda, o atendimento pode ser marcado como sessão de um pacote; conta quando fica "Atendido" (ex.: Drenagem 3 de 10)
- **Receber pagamento**: de parcela ou avulso, valor livre, forma de pagamento, opção de quitar parcela com desconto, recibo em PDF com valor por extenso
- **Caixa do dia**: entradas, saídas e fechamento por forma de pagamento
- **Contas a receber**: por mês, vencidas, cobrança pelo WhatsApp
- **Contas a pagar**: categorias, contas que se repetem todo mês, baixa de pagamento
- **Fluxo de caixa**: realizado × previsto por mês, com saldo acumulado
- **Comissões sobre o valor efetivamente pago** (ver abaixo), com pagamento à profissional que vira despesa automaticamente
- **Termos de consentimento em PDF**: modelos editáveis em Configurações, preenchidos com os dados da cliente

### Como a comissão é calculada

A comissão nasce **no momento em que a cliente paga**, e não sobre o preço de tabela:

> **base da comissão = valor pago − taxa da maquininha − custo dos insumos**  ·  **comissão = base × %**


- Pagamento de parcela de orçamento: o valor pago é dividido entre os itens do orçamento na proporção do valor de cada um, e cada parte vai para a profissional que executa aquele item.
- Pagamento avulso: tudo vai para a profissional informada.
- Taxa da maquininha: configure o % de cada forma de pagamento em Configurações. Ela é preenchida sozinha ao receber e pode ser ajustada. Ex.: R$ 1.000 no crédito com 4% → comissão sobre R$ 960. No caixa e no fluxo, as taxas contam como saída.
- Insumos: cadastre o custo por sessão em cada procedimento (ex.: toxina R$ 400). No orçamento ele é copiado para cada item (ajustável) e, como o plano costuma ser pago em parcelas, é descontado **na proporção do que foi pago** (pagou 20% do plano → desconta 20% dos insumos), de forma que ao final todos os insumos são descontados uma única vez. No avulso, é preenchido pelo procedimento e pode ser ajustado. Os insumos não aparecem para a cliente.
- Percentual: o do procedimento (se configurado), senão o padrão da profissional (em Equipe).
- Descontos, valores negociados e parcelas não pagas **não** geram comissão. Estornar um pagamento apaga a comissão dele.

Exemplo avulso: Toxina R$ 1.200 no crédito (taxa 4% = R$ 48), insumos R$ 400, comissão 40% → base R$ 752 → comissão **R$ 300,80**.

## Rodando no computador

```bash
npm install
cp .env.example .env          # e troque o AUTH_SECRET
npx prisma db push            # cria o banco
npm run db:seed               # cria o login admin e procedimentos de exemplo
npm run dev                   # http://localhost:3000
```

Login inicial: `admin@clinica.com` / `trocar123`. **Troque a senha em Equipe** logo no primeiro acesso.
Para ter dados de demonstração: `SEED_DEMO=1 npm run db:seed`.

Para personalizar a anamnese, edite `src/lib/anamnese.ts`.

## Tecnologias

Next.js 15 (App Router, Server Actions) · React 19 · Prisma · SQLite · Tailwind CSS · JWT em cookie httpOnly.

## Próximas etapas

3. Lembretes automáticos de WhatsApp, pacotes de sessões, estoque de produtos, relatórios
4. Agendamento online pela cliente, nota fiscal, assinatura digital

## Observação sobre LGPD

Prontuário e fotos são dados sensíveis de saúde. Em produção: use HTTPS, faça backup diário do banco
e da pasta `uploads/`, e dê a cada pessoa o perfil com o mínimo de acesso necessário.
