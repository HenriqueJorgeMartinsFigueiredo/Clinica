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

2. Orçamentos/planos de tratamento, financeiro (caixa, contas a pagar/receber), comissões, recibos e termos em PDF
3. Lembretes automáticos de WhatsApp, pacotes de sessões, estoque de produtos, relatórios
4. Agendamento online pela cliente, nota fiscal, assinatura digital

## Observação sobre LGPD

Prontuário e fotos são dados sensíveis de saúde. Em produção: use HTTPS, faça backup diário do banco
e da pasta `uploads/`, e dê a cada pessoa o perfil com o mínimo de acesso necessário.
