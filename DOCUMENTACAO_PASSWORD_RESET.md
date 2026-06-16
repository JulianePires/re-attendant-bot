# Funcionalidade de Recuperação de Senha

## 📋 Visão Geral

Este documento descreve a implementação completa da funcionalidade de recuperação de senha (password reset) do sistema. A funcionalidade integra o BetterAuth com um serviço de email customizado que envia templates profissionais em português com as cores do projeto.

## 🏗️ Arquitetura

### Componentes Principais

```
src/lib/email/
├── config.ts           # Configuração de email (SMTP, timeouts)
├── templates.ts        # Templates HTML de email em português
├── service.ts          # Serviço de envio de emails com retry
├── adapter.ts          # Adaptador para BetterAuth
├── index.ts            # Exports do módulo
├── email.test.ts       # Testes do serviço de email
└── password-reset.test.ts  # Testes de validação

src/server/actions/
└── password-reset.ts   # Server Actions para password reset

src/app/(auth)/
├── esqueci-a-senha/page.tsx    # Página de solicitação
└── redefinir-senha/page.tsx    # Página de redefinição
```

## 🔐 Fluxo de Recuperação de Senha

### 1. Solicitação Inicial (Usuário perde acesso)

```
Usuário acessa /esqueci-a-senha
     ↓
Insere email corporativo
     ↓
Valida com forgetPasswordSchema (Zod)
     ↓
Chama authClient.requestPasswordReset()
     ↓
BetterAuth gera token e chama sendPasswordResetEmail()
     ↓
Serviço de email renderiza template
     ↓
Email enviado com link único (1 hora de validade)
     ↓
Usuário recebe email com CTA "Redefinir Senha"
```

### 2. Redefinição de Senha

```
Usuário clica no link do email
     ↓
Redirecionado para /redefinir-senha?token=xxx
     ↓
Página valida o token via searchParams
     ↓
Usuário insere nova senha
     ↓
Valida com resetPasswordSchema (Zod)
     ↓
Chama authClient.resetPassword()
     ↓
BetterAuth valida token e atualiza senha
     ↓
logPasswordChange() registra para auditoria
     ↓
Email de confirmação enviado (opcional)
     ↓
Usuário redirecionado para /adm/login
```

## ⚙️ Configuração Necessária

### Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
# Email Configuration
EMAIL_FROM=noreply@clinica-reabi.com.br
NEXT_PUBLIC_APP_URL=https://app.clinicareabi.com.br

# SMTP Configuration
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-usuario@email.com
SMTP_PASS=sua-senha-app

# Para teste local com Ethereal Email (fake SMTP):
# SMTP_HOST=smtp.ethereal.email
# SMTP_PORT=587
# SMTP_USER=seu-email-ethereal@ethereal.email
# SMTP_PASS=sua-senha-ethereal
```

### Opções de Provedor de Email

#### **Resend** (Recomendado - Moderno)
- Suporte via API REST
- Excelente para transacionais
- Dashboard completo
- Integração fácil
- URL: https://resend.com

#### **SendGrid** (Robusta)
- SMTP + API
- Escalável
- Ótimo para volume alto
- URL: https://sendgrid.com

#### **Mailtrap** (Desenvolvimento)
- Sandbox para testes
- Não envia emails reais
- Perfeito para development
- URL: https://mailtrap.io

#### **Ethereal Email** (Teste Local)
- Fake SMTP completamente gratuito
- Nenhuma configuração
- Apenas para desenvolvimento
- URL: https://ethereal.email

## 📧 Templates de Email

### Template de Redefinição de Senha

**Características:**
- ✅ Gradiente roxo (#7c3aed → #8b5cf6)
- ✅ Responsivo para mobile/tablet
- ✅ CTA clara e acessível
- ✅ Aviso de segurança com timestamp
- ✅ Link alternativo (copy-paste)
- ✅ Footer com informações da clínica
- ✅ 100% português (PT-BR)

**Segurança:**
- Aviso de 1 hora de validade
- Recomendação contra compartilhamento
- Sugestão de link direto se botão falhar
- Indicação de não-resposta automática

### Template de Confirmação

Enviado após redefinição bem-sucedida (opcional).

**Variáveis:**
- Nome do usuário
- Timestamp de alteração
- Link para suporte

## 🚀 Uso

### Para Desenvolvedores Frontend

**Página de Solicitação (`/esqueci-a-senha`):**

```typescript
import { authClient } from "@/lib/auth-client";

async function handlePasswordReset(email: string) {
  const { error } = await authClient.requestPasswordReset({
    email,
    redirectTo: "/redefinir-senha", // URL após clique do email
  });

  if (error) {
    toast.error("Erro ao enviar link");
  }
}
```

**Página de Redefinição (`/redefinir-senha`):**

```typescript
import { authClient } from "@/lib/auth-client";

const token = searchParams.get("token");

async function handleResetPassword(password: string) {
  const { error } = await authClient.resetPassword({
    token,
    newPassword: password,
  });

  if (error) {
    toast.error("Falha ao redefinir senha");
  }
}
```

### Para Administradores Backend

**Iniciar verificação de email:**

```typescript
import { sendPasswordResetEmail } from "@/lib/email/service";

const resetUrl = `https://app.clinicareabi.com.br/redefinir-senha?token=abc123`;
await sendPasswordResetEmail("usuario@clinica.com.br", resetUrl, "João Silva");
```

**Validar configuração:**

```typescript
import { verifyEmailConfiguration } from "@/lib/email/service";

const isValid = await verifyEmailConfiguration();
if (!isValid) {
  console.error("Email não configurado");
}
```

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes de email
npm run test src/lib/email/

# Apenas templates
npm run test src/lib/email/email.test.ts

# Apenas validação
npm run test src/lib/email/password-reset.test.ts

# Com coverage
npm run test:coverage src/lib/email/
```

### O Que É Testado

✅ Configuração válida de email
✅ Geração de templates HTML
✅ Inclusão de links corretamente
✅ Avisos de segurança presentes
✅ Cores do projeto (roxo #7c3aed)
✅ Responsividade
✅ Acessibilidade
✅ Português correto
✅ Validação de schemas Zod
✅ Fluxo completo de reset

## 🔒 Segurança

### Boas Práticas Implementadas

1. **Token Ephemeral**
   - Tokens úmicos gerados pelo BetterAuth
   - Expiração em 1 hora
   - Não reutilizáveis

2. **Ocultação de Informações**
   - Não revela se email existe no sistema
   - Mensagens de erro genéricas
   - Sem exposição de stack traces

3. **Email Seguro**
   - SMTP com TLS/SSL
   - Sem dados sensíveis no email
   - Aviso contra compartilhamento
   - Recomendação contra phishing

4. **Validação**
   - Zod schemas para todos os inputs
   - Validação no cliente E servidor
   - Verificação de token antes de reset
   - Limites de tentativas (via rate limiting do BetterAuth)

5. **Auditoria**
   - Logging de tentativas (sucesso/erro)
   - Timestamp de alteração
   - Rastreamento de usuário

## 📊 Monitoramento

### Logs

O sistema registra:

```
✅ Email enviado com sucesso → messageId
❌ Erro ao enviar → tipo de erro + retry
🔄 Tentativa de retry → número da tentativa
🔐 Alteração de senha → userId + timestamp
```

**Localização:** Console do servidor / Logs do aplicativo

### Métricas para Monitorar

- Taxa de sucesso de envio de email
- Taxa de erro de SMTP
- Tempo médio de envio
- Quantidade de resets por dia
- Taxa de expiração de token
- Taxa de erros de validação

## 🐛 Troubleshooting

### Email não é enviado

**Verificar:**
1. Variáveis de ambiente configuradas
2. Conectividade SMTP (telnet)
3. Credenciais SMTP corretas
4. Firewall/bloqueio de porta

```bash
# Testar conexão SMTP
telnet smtp.seu-provedor.com 587
```

### Email recebido em spam

**Solução:**
1. Configurar SPF/DKIM
2. Usar domínio verificado
3. Incluir footer com info da clínica
4. Unsubscribe link (se newsletter)

### Token inválido

**Verificar:**
1. URL do link está correta
2. Token não expirou (1 hora)
3. Usuário ainda existe
4. Banco de dados acessível

## 📖 Referências

- **BetterAuth Docs**: https://better-auth.com
- **Nodemailer Docs**: https://nodemailer.com
- **Email Standards**: https://www.rfc-editor.org/rfc/rfc5321
- **SMTP Configuration**: https://www.mailgun.com/blog/email/smtp-port/

## 🤝 Contribuindo

Para adicionar novas funcionalidades de email:

1. Criar novo template em `templates.ts`
2. Criar novo método de envio em `service.ts`
3. Adicionar testes em `*.test.ts`
4. Atualizar documentação

## ✅ Checklist de Implementação

- [x] Serviço de email configurado
- [x] Templates HTML criados
- [x] Integração com BetterAuth
- [x] Validações com Zod
- [x] Páginas de UI implementadas
- [x] Testes criados
- [x] Documentação completa
- [ ] Variáveis de ambiente configuradas (TODO - seu servidor)
- [ ] Email testado em produção (TODO - seu servidor)

## 📝 Notas Adicionais

### Performance

- Sendmail assíncrono (não bloqueia usuário)
- Retry automático com backoff
- Reutilização de conexão SMTP
- Timeouts configurados (30s)

### Escalabilidade

- Suporta múltiplos provedores
- Fila de email possível (para volume alto)
- Logging centralizado
- Métricas rastreáveis

### Manutenção

- Logs estruturados
- Tratamento de erro robusto
- Documentação inline no código
- Testes abrangentes

---

**Última atualização:** 15 de junho de 2026
**Versão:** 1.0.0
**Status:** ✅ Pronto para Produção
