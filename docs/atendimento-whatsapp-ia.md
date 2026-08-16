# Atendimento com IA no WhatsApp

Esta implementação conecta o WhatsApp Cloud API ao catálogo real da Aluga Casa
Búzios. A IA não é treinada copiando todo o site: ela consulta os dados
dinâmicos no Supabase e usa uma base editorial para regras e respostas
institucionais.

## O que foi criado

- Webhook público em `/api/webhooks/whatsapp`.
- Validação da assinatura `x-hub-signature-256` enviada pela Meta.
- Deduplicação pelo identificador da mensagem da Meta.
- Histórico de contatos, conversas, mensagens, ferramentas e transferências.
- Consulta dos imóveis ativos do `property_catalog`.
- Orçamento compartilhado com `/api/pricing/quote`.
- Consulta dos bloqueios manuais e calendários iCal do Airbnb.
- Respostas em português, espanhol ou inglês.
- Limite de mensagens, opt-out e transferência para uma pessoa.
- Painel em `/admin/atendimento-ia`.

## 1. Aplicar a migração no Supabase

Abra o SQL Editor do projeto Supabase e execute:

`supabase/migrations/20260815000000_atendimento_whatsapp_ia.sql`

A migração cria as tabelas, índices, políticas RLS e oito informações iniciais.
As opções `ai_enabled` e `auto_reply_enabled` começam como `false`.

## 2. Configurar a OpenAI

Crie uma chave de API em um projeto da OpenAI e adicione na Vercel:

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini
```

A chave é usada apenas no servidor. Nunca coloque `NEXT_PUBLIC_` em seu nome.
O código usa a Responses API, function calling com esquemas estritos,
`store: false` e um identificador de segurança derivado por hash do usuário.

## 3. Configurar o WhatsApp Cloud API

No aplicativo da Meta, obtenha o token de acesso e o identificador do telefone.
Crie também um texto secreto próprio para verificar o webhook.

```text
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=um-texto-secreto-criado-por-voce
META_APP_SECRET=...
WHATSAPP_GRAPH_API_VERSION=v23.0
```

Na configuração do webhook da Meta use:

```text
https://alugacasabuzios.com.br/api/webhooks/whatsapp
```

O token de verificação precisa ser exatamente o valor salvo em
`WHATSAPP_VERIFY_TOKEN`. Assine o campo `messages` do WhatsApp Business Account.

Use a versão Graph disponível no seu aplicativo. Se a versão padrão já não
estiver disponível, altere apenas `WHATSAPP_GRAPH_API_VERSION` na Vercel.

## 4. Conferir os calendários

O orçamento só declara disponibilidade confirmada quando consegue verificar:

1. bloqueios manuais no Supabase;
2. calendário iCal configurado para aquele imóvel.

Se o calendário estiver ausente ou indisponível, a IA pode apresentar uma
estimativa, mas deve transferir a confirmação para uma pessoa.

## 5. Testar antes de ativar

1. Faça o deploy com todas as variáveis, mas mantenha os controles desligados.
2. Confirme no painel que Banco, OpenAI e WhatsApp aparecem como prontos.
3. Use primeiro o número de teste fornecido pela Meta.
4. Teste pesquisa por hóspedes, bairro e piscina.
5. Teste orçamento para datas livres e bloqueadas.
6. Teste frases como “quero falar com uma pessoa” e “quero desconto”.
7. Teste uma foto ou áudio, que deve ser encaminhado a uma pessoa.
8. Teste `SAIR` e depois `VOLTAR`.
9. Ative “Permitir uso da IA”.
10. Somente depois ative “Responder automaticamente no WhatsApp”.

## Proteções adotadas

- A ativação automática é bloqueada se faltar qualquer credencial.
- A IA não possui ferramenta para confirmar reservas ou pagamentos.
- O endereço completo não é enviado à OpenAI nem retornado ao cliente.
- A disponibilidade incerta é apresentada como pendente de confirmação.
- Mensagens repetidas do webhook não geram respostas duplicadas.
- Mensagens fora do limite e mídias não suportadas são transferidas.
- O cliente pode pedir uma pessoa ou interromper a automação.

## Limitações desta primeira etapa

- Áudios e imagens não são interpretados automaticamente.
- O atendente responde ao cliente pelo WhatsApp normal após abrir o link no painel.
- A integração não cria reserva nem cobra pagamento.
- O histórico deve receber uma política interna de retenção e exclusão.
- Antes da produção, revise a Política de Privacidade com orientação jurídica
  adequada ao negócio e à LGPD.

## Arquitetura

```text
Cliente no WhatsApp
        ↓
Webhook validado da Meta
        ↓
Histórico e controles no Supabase
        ↓
OpenAI decide se precisa consultar uma ferramenta
        ↓
Catálogo / detalhes / disponibilidade / orçamento
        ↓
Resposta no WhatsApp ou transferência humana
```
