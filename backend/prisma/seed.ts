import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_USER = {
  name: 'Usuário Teste',
  email: 'teste@bodytrack.com',
  password: 'Teste123!',
};

async function main() {
  const hashed = await bcrypt.hash(TEST_USER.password, 12);

  const user = await prisma.user.upsert({
    where: { email: TEST_USER.email },
    update: { password: hashed, name: TEST_USER.name },
    create: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: hashed,
      role: 'ADMIN',
    },
  });

  console.log('Usuário de teste criado/atualizado:');
  console.log(`  E-mail: ${TEST_USER.email}`);
  console.log(`  Senha:  ${TEST_USER.password}`);
  console.log(`  ID:     ${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
