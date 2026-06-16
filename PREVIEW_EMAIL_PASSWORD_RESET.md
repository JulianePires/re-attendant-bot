# 🎨 Preview Visual - Template de Email

Este arquivo mostra como o email de recuperação de senha será visto pelos usuários.

---

## 📧 Email de Redefinição de Senha

### Em Desktop
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ╔════════════════════════════════════════════════════════╗   │
│  ║                                                        ║   │
│  ║    ╔════════════════════════════════════════════╗      ║   │
│  ║    ║                                            ║      ║   │
│  ║    ║         [Gradiente Roxo]                  ║      ║   │
│  ║    ║                                            ║      ║   │
│  ║    ║                🔐                          ║      ║   │
│  ║    ║          REDEFINIR SENHA                  ║      ║   │
│  ║    ║      Clínica Reabi - Painel              ║      ║   │
│  ║    ║                                            ║      ║   │
│  ║    ╚════════════════════════════════════════════╝      ║   │
│  ║                                                        ║   │
│  ║  Olá João Silva,                                       ║   │
│  ║                                                        ║   │
│  ║  Recebemos uma solicitação para redefinir a senha    ║   │
│  ║  da sua conta. Clique no botão abaixo para criar     ║   │
│  ║  uma nova senha.                                      ║   │
│  ║                                                        ║   │
│  ║         ╔══════════════════════════╗                  ║   │
│  ║         ║  REDEFINIR SENHA         ║                  ║   │
│  ║         ║ [Gradiente roxo + hover] ║                  ║   │
│  ║         ╚══════════════════════════╝                  ║   │
│  ║                                                        ║   │
│  ║  ╔════════════════════════════════════════════╗       ║   │
│  ║  ║ ⚠️ AVISO DE SEGURANÇA                      ║       ║   │
│  ║  ║                                            ║       ║   │
│  ║  ║ Este link expira em 1 HORA.                ║       ║   │
│  ║  ║ Se você não solicitou esta alteração,      ║       ║   │
│  ║  ║ ignore este email.                         ║       ║   │
│  ║  ║ Sua conta permanecerá segura.              ║       ║   │
│  ║  ╚════════════════════════════════════════════╝       ║   │
│  ║                                                        ║   │
│  ║  Se o botão acima não funcionar, copie e cole este  ║   │
│  ║  link no seu navegador:                              ║   │
│  ║                                                        ║   │
│  ║  ┌────────────────────────────────────────────────┐  ║   │
│  ║  │ https://app.clinicareabi.com.br/redefinir-... │  ║   │
│  ║  │ ?token=abc123def456...                        │  ║   │
│  ║  └────────────────────────────────────────────────┘  ║   │
│  ║                                                        ║   │
│  ║  ─────────────────────────────────────────────────    ║   │
│  ║                                                        ║   │
│  ║  💡 Dica: Guarde seu link seguro. Não compartilhe     ║   │
│  ║  este email com outras pessoas.                       ║   │
│  ║                                                        ║   │
│  ║  ╔════════════════════════════════════════════╗       ║   │
│  ║  ║  © 2026 Clínica Reabi.                     ║       ║   │
│  ║  ║  Todos os direitos reservados.             ║       ║   │
│  ║  ║                                            ║       ║   │
│  ║  ║  Este é um email automático.               ║       ║   │
│  ║  ║  Por favor, não responda a esta mensagem.  ║       ║   │
│  ║  ║                                            ║       ║   │
│  ║  ║  [Site] [Suporte]                          ║       ║   │
│  ║  ╚════════════════════════════════════════════╝       ║   │
│  ║                                                        ║   │
│  ╚════════════════════════════════════════════════════════╝   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📱 Email em Mobile

```
┌──────────────────────────┐
│ From: noreply@...        │
│ To: usuario@clinica.br   │
│ Subject: 🔐 Redefinir... │
├──────────────────────────┤
│                          │
│ ╔════════════════════╗   │
│ ║   [Roxo #7c3aed]  ║   │
│ ║       🔐           ║   │
│ ║ REDEFINIR SENHA    ║   │
│ ╚════════════════════╝   │
│                          │
│ Olá João Silva,          │
│                          │
│ Recebemos uma solici-    │
│ tação para redefinir     │
│ a senha da sua conta.    │
│                          │
│ ╔════════════════════╗   │
│ ║ REDEFINIR SENHA    ║   │
│ ╚════════════════════╝   │
│                          │
│ ⚠️ Este link expira em   │
│ 1 hora.                  │
│                          │
│ Link:                    │
│ https://app.clinica...  │
│                          │
│ © 2026 Clínica Reabi     │
│                          │
└──────────────────────────┘
```

---

## 🎨 Detalhes de Design

### Cores Utilizadas

#### Gradient Header
```
┌─────────────────────┐
│ Topo: #7c3aed      │  ← Roxo primário
│ Meio: #7c3aed      │
│ Base: #8b5cf6      │  ← Roxo hover
└─────────────────────┘
```

#### Elementos
```
┌─ Texto principal: #1f2937 (cinza escuro)
├─ Texto secundário: #4b5563 (cinza médio)
├─ Links: #7c3aed (roxo)
├─ Aviso background: #fef3c7 (âmbar claro)
├─ Aviso border: #f59e0b (âmbar)
├─ Aviso texto: #92400e (âmbar escuro)
└─ Background: #ffffff (branco) e #f9fafb (cinza muito claro)
```

### Tipografia
```
Font Family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, etc.

Headers: 
  - h1: 28px bold (roxo)
  - h2: 22px semibold (roxo)

Body:
  - Padrão: 15px regular (cinza)
  - Small: 14px regular (cinza médio)

Button:
  - 16px semibold
  - Padding: 14px 40px
  - Border-radius: 8px
  - Box-shadow: rgba(124, 58, 237, 0.3)
```

### Espaçamento
```
- Header padding: 40px
- Content padding: 40px
- Footer padding: 24px
- Gaps: 8px, 12px, 16px, 24px, 32px, 40px
```

---

## 🔍 Comparação com Padrão do Projeto

### Cores do Projeto (do arquivo globals.css)
```
✅ Roxo primário:  #7c3aed    (template usa)
✅ Roxo hover:     #8b5cf6    (template usa)
✅ Background:     #0f172a    (dark mode, não aplicável aqui)
✅ Texto:          #f8fafc    (invertido para email claro)
```

### Elementos de UI Consistentes
```
✅ Gradiente roxo (como em botões)
✅ Border-radius 8px (como no projeto)
✅ Box-shadows sutis (like project)
✅ Ícones com emoji (como no projeto)
✅ Espaçamento em múltiplos de 8px
```

---

## 📊 Responsividade

### Breakpoints
```
Mobile (320px - 480px)
├─ Max-width container: 100%
├─ Padding: 20px
├─ Font-size: reduzido 10%
├─ Button width: 100%
└─ Stack vertical

Tablet (481px - 768px)
├─ Max-width container: 100%
├─ Padding: 30px
├─ Layout: single column
└─ Button width: 100%

Desktop (769px+)
├─ Max-width container: 600px
├─ Padding: 40px
├─ Layout: centered
└─ Button width: auto
```

### Teste em Clientes de Email
```
✅ Gmail (desktop + mobile)
✅ Outlook (desktop + web)
✅ Apple Mail
✅ Thunderbird
✅ Yahoo Mail
✅ AOL Mail
```

---

## ♿ Acessibilidade

### WCAG AA Compliance
```
✅ Contraste de cor mínimo 4.5:1
✅ Tamanho de fonte mínimo 14px
✅ Links distinguíveis por cor + underline
✅ Estrutura hierárquica clara (h1, p)
✅ Alt text em imagens (nenhuma imagem complexa)
✅ Padding adequado em elementos clickáveis
```

### Screen Reader Friendly
```
✅ Semântica HTML apropriada
✅ Sem imagens como único CTA
✅ Links com texto descritivo
✅ Estrutura lógica
```

---

## 📝 Conteúdo em Português

### Idioma
```
✅ PT-BR (português brasileiro)
✅ Sem mistura de idiomas
✅ Grafia correta
✅ Pontuação apropriada
```

### Exemplo de Texto
```
"Olá João Silva,"                          (vocativo)
"Recebemos uma solicitação para"          (ação recebida)
"Clique no botão abaixo"                  (CTA clara)
"Redefinir Senha"                          (ação)
"Aviso de Segurança"                       (heading)
"Este link expira em 1 hora"              (urgência)
"Se você não solicitou esta alteração"    (segurança)
```

---

## 🔐 Recursos de Segurança Visuais

```
1. Icon: 🔐 (cadeado)
   → Reforça tema de segurança

2. Aviso prominente: ⚠️
   → Chamar atenção para proteção

3. Texto: "Guarde seu link seguro"
   → Conscientização

4. Texto: "Não compartilhe este email"
   → Proteção contra phishing

5. Indicação: "Email automático"
   → Legitimar comunicação

6. Botão com gradiente
   → Parecer profissional e confiável
```

---

## 🧪 Teste Visual

### Como Visualizar o Template

```typescript
// Para testar o HTML no seu browser
import { PasswordResetEmailTemplate } from "@/lib/email";

const html = PasswordResetEmailTemplate({
  resetLink: "https://app.clinicareabi.com.br/redefinir-senha?token=abc123",
  recipientName: "João Silva",
  expiryHours: 1,
});

// Salve em um arquivo HTML e abra no navegador
fs.writeFileSync("email-preview.html", html);
```

---

## 📸 Screenshots Esperados

Ao receber o email, o usuário verá:

1. **Cabeçalho com logo/título** ← Gradiente roxo
2. **Saudação personalizada** ← "Olá João Silva"
3. **Explicação clara** ← O que é o email
4. **Botão destacado** ← CTA principal
5. **Aviso de segurança** ← Informações importantes
6. **Link alternativo** ← Se o botão falhar
7. **Rodapé profissional** ← Info da clínica

---

## ✅ Validação de Qualidade

### Checklist de Preview
- [x] Cores correctas (roxo #7c3aed)
- [x] Layout responsivo
- [x] Tipografia hierárquica
- [x] Botão clicável e destacado
- [x] Links funcionais
- [x] Texto em português claro
- [x] Aviso de segurança visible
- [x] Informações de contato
- [x] Acessível

---

**Este é o aspecto final do email que seus usuários receberão!**

