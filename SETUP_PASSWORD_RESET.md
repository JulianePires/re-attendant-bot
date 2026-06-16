# Guia Rápido de Setup - Password Reset

## 🚀 1. Instalação de Dependências

```bash
# Instalar nodemailer
npm install nodemailer
npm install -D @types/nodemailer

# Ou com pnpm (seu projeto)
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

## 📝 2. Configurar Variáveis de Ambiente

### Arquivo: `.env.local`

```bash
# ===== EMAIL CONFIGURATION =====
EMAIL_FROM=noreply@clinica-reabi.com.br
NEXT_PUBLIC_APP_URL=https://app.clinicareabi.com.br

# SMTP (Configure um dos provedores abaixo)

# ===== OPÇÃO 1: Ethereal Email (RECOMENDADO PARA TESTE LOCAL) =====
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@ethereal.email
SMTP_PASS=sua-senha-ethereal
# Gerar credenciais: https://ethereal.email

# ===== OPÇÃO 2: Mailtrap =====
# SMTP_HOST=live.smtp.mailtrap.io
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=seu-usuario@mailtrap.io
# SMTP_PASS=sua-api-key

# ===== OPÇÃO 3: SendGrid =====
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=apikey
# SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxx

# ===== OPÇÃO 4: Gmail (com App Password) =====
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=seu-email@gmail.com
# SMTP_PASS=sua-app-password
```

## 🧪 3. Testar a Configuração

### Verificar Conexão SMTP

```typescript
// No seu arquivo de script ou no console
import { verifyEmailConfiguration } from "@/lib/email";

const isValid = await verifyEmailConfiguration();
console.log("Email configurado:", isValid);
```

## 🎯 4. Fluxo de Teste Completo

### Teste 1: Verificar Templates

```bash
npm run test src/lib/email/email.test.ts
```

Esperado: ✅ Todos os testes passam

### Teste 2: Validar Schemas

```bash
npm run test src/lib/email/password-reset.test.ts
```

Esperado: ✅ Todos os testes passam

### Teste 3: Testar no Navegador

1. Acesse: `http://localhost:3000/esqueci-a-senha`
2. Insira um email válido (ex: usuario@clinica.com.br)
3. Clique em "Enviar Link"
4. Verifique:
   - ✅ Toast de sucesso aparece
   - ✅ Email recebido em 2-3 segundos
   - ✅ Email contém link com token
   - ✅ Email com cores roxas do projeto

### Teste 4: Redefinir Senha

1. Clique no link do email
2. Acesse: `/redefinir-senha?token=xxx`
3. Preencha nova senha
4. Clique em "Redefinir Senha"
5. Verifique:
   - ✅ Senha alterada com sucesso
   - ✅ Redirecionamento para `/adm/login`
   - ✅ Login funciona com nova senha

## 🔍 5. Verificar Logs

### Console do Servidor

Procure por:

```
✅ Email enviado com sucesso para usuario@clinica.com.br
[Password Reset] Email enviado para usuario@clinica.com.br
```

### Arquivo de Logs (se configurado)

Check `console.log()` e `console.error()` na aplicação

## 📊 6. Monitorar Erros

### ERRO: "Email não está configurado"

**Solução:**

```bash
# Verificar variáveis de ambiente
printenv | grep -E "(EMAIL|SMTP)"

# Verificar arquivo .env.local
cat .env.local | grep -E "(EMAIL|SMTP)"

# Restart do servidor
npm run dev
```

### ERRO: "Connection timeout"

**Solução:**

1. Verificar host SMTP
2. Verificar porta (587 vs 465)
3. Verificar firewall
4. Testar manualmente:

```bash
telnet smtp.ethereal.email 587
```

### ERRO: "Authentication failed"

**Solução:**

1. Verificar credenciais
2. Gerar novas credenciais (alguns provedores expiram)
3. Testar credenciais manualmente com Telnet

## 📱 7. Testar Responsividade

### Em Desktop

1. Abrir email em Gmail/Outlook
2. Verificar layout e cores

### Em Mobile

1. Abrir email no telefone
2. Verificar:
   - ✅ Layout responsivo
   - ✅ Botão clicável
   - ✅ Link copy-paste visível

## 🔐 8. Testar Segurança

### Verificar Token de Expiração

```typescript
import { isResetTokenValid } from "@/server/actions/password-reset";

const isValid = await isResetTokenValid("token-aqui");
console.log("Token válido:", isValid);
```

### Verificar Ocultação de Dados

1. Solicitar reset com email não existente
2. Verificar se mensagem NÃO revela se existe
3. Verificar logs (deve registrar tentativa)

## 💾 9. Deploy para Produção

### Antes de fazer deploy:

- [ ] Testar em staging
- [ ] Configurar domínio verificado no provedor
- [ ] Configurar SPF/DKIM records
- [ ] Testar em todos os clientes de email (Gmail, Outlook, etc)
- [ ] Monitorar taxa de sucesso

### Variáveis de Ambiente em Produção

No Vercel/seu host:

1. Settings → Environment Variables
2. Adicionar:
   - `EMAIL_FROM`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `NEXT_PUBLIC_APP_URL`

3. Redeploy

## 📚 Referências Rápidas

| Provedor | Host | Porta | Seguro | Preço |
|----------|------|-------|--------|-------|
| Ethereal | smtp.ethereal.email | 587 | Não | Grátis (teste) |
| Mailtrap | live.smtp.mailtrap.io | 465 | Sim | Pago |
| SendGrid | smtp.sendgrid.net | 587 | Não | Pago |
| Gmail | smtp.gmail.com | 587 | Não | Grátis (pessoal) |
| Resend | smtp.resend.com | 587 | Não | Pago |

## ✅ Checklist Final

- [ ] Variáveis de ambiente configuradas
- [ ] Nodemailer instalado
- [ ] Testes passando
- [ ] Email enviado com sucesso
- [ ] Template em português visível
- [ ] Cores roxas do projeto presentes
- [ ] Link funcional no email
- [ ] Redefinição de senha funciona
- [ ] Logs aparecem no console

## 🆘 Suporte

Se encontrar problemas:

1. Verificar `/memories/repo/tooling.md` para dicas
2. Consultar logs do servidor
3. Verificar `.env.local`
4. Testar conexão SMTP manualmente
5. Consultar documentação do provedor de email

---

**Tempo estimado de setup:** 15 minutos
**Dificuldade:** ⭐⭐ Fácil
**Status:** ✅ Pronto
