import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@oiseaublanc.fr';
  const password = 'Admin1234!';

  const exists = await prisma.admin.findUnique({ where: { email } });
  if (exists) {
    console.log(`Super admin déjà existant : ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.create({
    data: { email, passwordHash, role: 'SUPER_ADMIN' },
  });

  console.log(`Super admin créé : ${email} / ${password}`);
  console.log('⚠️  Changez ce mot de passe dès la première connexion !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
