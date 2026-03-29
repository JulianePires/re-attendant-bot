import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

/**
 * Script seed para inicializar o banco de dados com um usuário admin padrão.
 * Run: npx prisma db seed
 */
async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Verifica se já existe algum usuário no banco
  const existingUser = await prisma.user.findFirst();

  if (existingUser) {
    console.log("✅ Banco de dados já contém usuários. Saindo sem alterações.");
    return;
  }

  // Cria o usuário com hash de senha via BetterAuth.
  // Isso garante compatibilidade com a tabela account/password do provider de e-mail/senha.
  const signUpResult = await auth.api.signUpEmail({
    body: {
      name: "Administrador",
      email: "admin@clinica.com",
      password: "Clinica@2024",
      cpf: "00000000000",
    },
  });

  const adminUser = signUpResult.user;

  // Promoção para admin após criação (defaultRole do auth é "paciente").
  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      role: "admin",
      emailVerified: true,
      updatedAt: new Date(),
    },
  });

  console.log("✅ Usuário admin criado com sucesso!");
  console.log(`   E-mail: ${adminUser.email}`);
  console.log(`   Senha padrão: Clinica@2024`);
  console.log(`   ⚠️  IMPORTANTE: Altere a senha após o primeiro login em produção.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Erro durante seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
