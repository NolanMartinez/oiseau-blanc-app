import { PrismaClient } from '@prisma/client';
import { MOCK_FRIDGES } from '../src/services/bicom.mock';

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

  // Ajoute quelques achats de test (3 premiers plats du premier frigo)
  const fridge = MOCK_FRIDGES[0];
  const testDishes = fridge.dishes.slice(0, 3);

  for (const dish of testDishes) {
    const existing = await prisma.purchase.findFirst({
      where: { subscriberId: subscriber.id, dishId: dish.id },
    });
    if (!existing) {
      await prisma.purchase.create({
        data: { subscriberId: subscriber.id, dishId: dish.id, frigoId: fridge.id },
      });
    }
  }

  console.log('');
  console.log('✅ Utilisateur client créé avec achats de test');
  console.log('─────────────────────────────────────────────');
  console.log(`  Email   : ${email}`);
  console.log(`  Code OTP: ${code}`);
  console.log('');
  console.log('  Plats achetés (pour tester les avis) :');
  for (const dish of testDishes) {
    console.log(`    · ${dish.name} (${fridge.name})`);
  }
  console.log('─────────────────────────────────────────────');
  console.log('  → Ouvrez /app/login');
  console.log(`  → Entrez : ${email}`);
  console.log(`  → Code   : ${code}`);
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
