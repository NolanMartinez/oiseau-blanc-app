import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'client@test.fr';
  const code = '123456';

  // Crée ou récupère le subscriber
  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  // Invalide les anciens codes
  await prisma.otpCode.updateMany({
    where: { contact: email, used: false },
    data: { used: true },
  });

  // Crée un code OTP valable 24h
  await prisma.otpCode.create({
    data: {
      contact: email,
      code,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log('');
  console.log('✅ Utilisateur client créé');
  console.log('─────────────────────────────');
  console.log(`  Email   : ${email}`);
  console.log(`  Code OTP: ${code}`);
  console.log('─────────────────────────────');
  console.log('  → Ouvrez /app/login');
  console.log(`  → Entrez : ${email}`);
  console.log(`  → Code   : ${code}`);
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
