# 📧 Módulo de Email

Sistema completo e modular para gerenciar envio de emails com templates customizados em português.

## 📂 Estrutura

```
.
├── config.ts              # Configurações SMTP e validações
├── templates.ts           # Templates HTML em português (roxo #7c3aed)
├── service.ts             # Serviço de envio com retry automático
├── adapter.ts             # Adaptador para BetterAuth
├── index.ts              # Exports centralizados
├── email.test.ts         # Testes de templates e config
└── password-reset.test.ts # Testes de validação
```

## 🎯 Responsabilidade de Cada Arquivo

### `config.ts`
- ⚙️ Centraliza todas as configurações de email
- 🔑 Lê variáveis de ambiente
- ✅ Valida se email está configurado
- ⏱️ Define timeouts e limites

### `templates.ts`
- 🎨 Templates HTML para emails
- 🌐 100% em português PT-BR
- 🎭 Cores roxas do projeto (#7c3aed, #8b5cf6)
- 📱 Responsivos e acessíveis

### `service.ts`
- 📤 Envia emails via SMTP
- 🔄 Retry automático (até 3 tentativas)
- 📝 Logging detalhado
- 🔌 Singleton transporter para performance

### `adapter.ts`
- 🔗 Bridge entre BetterAuth e nosso serviço
- 📨 Implementa interface de email do BetterAuth
- 🪝 Customizable para novos tipos de email

### `index.ts`
- 📦 Centraliza exports
- 🎁 Fácil importação: `import { sendEmail } from "@/lib/email"`

## 🚀 Quick Start

### Usar em um Componente

```typescript
import { sendPasswordResetEmail } from "@/lib/email";

// Em uma Server Action
const messageId = await sendPasswordResetEmail(
  "usuario@clinica.com.br",
  "https://app.local/reset?token=abc123",
  "João Silva"
);
```

### Adicionar Novo Template

1. Criar função em `templates.ts`
2. Criar method em `service.ts`
3. Adicionar teste em `email.test.ts`
4. Exportar em `index.ts`

### Exemplo: Novo Template

```typescript
// templates.ts
export function WelcomeEmailTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <!-- ... HTML ... -->
  `;
}

// service.ts
export async function sendWelcomeEmail(email: string, name: string): Promise<string> {
  const html = WelcomeEmailTemplate(name);
  return sendEmail({
    to: email,
    subject: "Bem-vindo! - Clínica Reabi",
    html,
  });
}

// index.ts
export { sendWelcomeEmail } from "./service";
```

## 🧪 Testes

```bash
# Rodar todos os testes do módulo
npm run test src/lib/email/

# Apenas testes de templates
npm run test src/lib/email/email.test.ts

# Com cobertura
npm run test:coverage src/lib/email/
```

### O que é testado

✅ Configuração válida  
✅ Templates renderizam HTML válido  
✅ Inclusão de variáveis corretas  
✅ Cores do projeto presentes  
✅ Responsividade  
✅ Acessibilidade  
✅ Português correto  
✅ Segurança (sem exposição de dados)  

## 🔒 Segurança

- 🔐 SMTP com TLS/SSL
- 🚫 Sem dados sensíveis em emails
- ⚠️ Avisos de segurança inclusos
- 🛡️ Validação de entrada
- 📊 Logging para auditoria
- 🔑 Tokens únicos e com expiração

## 📊 Performance

- ⚡ Envio assíncrono (non-blocking)
- 🔄 Retry com backoff automático
- 🪣 Reutilização de conexão SMTP
- ⏱️ Timeouts configuráveis (30s default)
- 📦 Sem dependências desnecessárias

## 🎨 Design de Email

### Cores Utilizadas

- **Primária:** `#7c3aed` (roxo)
- **Hover:** `#8b5cf6` (roxo mais claro)
- **Sucesso:** `#10b981` (verde)
- **Aviso:** `#f59e0b` (âmbar)

### Componentes

- Header com gradiente roxo
- Conteúdo centralizado
- CTA (Call-To-Action) destacado
- Footer com info da clínica
- Links alternativos (copy-paste)

## 🔗 Integração com BetterAuth

O módulo se integra seamlessly com BetterAuth:

1. **Solicitação de Reset:**
   ```
   BetterAuth.requestPasswordReset() 
   → Gera token
   → Chama adapter.sendPasswordResetEmail()
   → Nosso serviço envia com template
   ```

2. **Confirmação de Reset:**
   ```
   BetterAuth.resetPassword()
   → Valida token
   → Altera senha
   → Pode chamar sendPasswordChangedEmail()
   ```

## 📝 Variáveis de Ambiente

```bash
# Necessárias
EMAIL_FROM=noreply@clinica-reabi.com.br
NEXT_PUBLIC_APP_URL=https://app.clinicareabi.com.br
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_USER=seu-usuario
SMTP_PASS=sua-senha

# Opcional
SMTP_SECURE=false  # true para porta 465, false para 587
```

## 🐛 Debug

### Ativar Logs Detalhados

```typescript
// No seu código
import { sendEmail } from "@/lib/email/service";

const result = await sendEmail({
  to: "test@example.com",
  subject: "Test",
  html: "<h1>Hello</h1>",
});

console.log("Email enviado:", result.messageId);
```

### Verificar Configuração

```typescript
import { isEmailConfigured, warnIfEmailNotConfigured } from "@/lib/email";

if (!isEmailConfigured()) {
  warnIfEmailNotConfigured();
}
```

## 📚 Referências

- [Nodemailer Docs](https://nodemailer.com)
- [BetterAuth Email](https://better-auth.com)
- [Email Standards RFC 5321](https://tools.ietf.org/html/rfc5321)
- [Email Design Best Practices](https://litmus.com/resources)

## 📋 Checklist de Features

- [x] Configuração centralizada
- [x] Templates HTML responsivos
- [x] Português PT-BR
- [x] Cores do projeto
- [x] Retry automático
- [x] Logging estruturado
- [x] Testes abrangentes
- [x] Integração BetterAuth
- [x] Documentação completa
- [ ] Fila de email (para melhor escalabilidade)
- [ ] Templates dinâmicos (com React.render)
- [ ] Webhooks de bounces/complaints

---

**Versão:** 1.0.0  
**Status:** ✅ Pronto para Produção  
**Última atualização:** 15/06/2026
