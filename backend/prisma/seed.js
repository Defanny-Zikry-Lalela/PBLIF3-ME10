const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !email || !password || password.length < 8) {
    throw new Error('Isi ADMIN_USERNAME, ADMIN_EMAIL, dan ADMIN_PASSWORD (minimal 8 karakter) sebelum melakukan seed.');
  }

  await prisma.adminUser.upsert({
    where: { username },
    update: {
      name: process.env.ADMIN_NAME || 'Administrator',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: process.env.ADMIN_NAME || 'Administrator',
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
    },
  });

  console.log('Akun administrator NutriTrack MBG siap.');
}

main()
  .catch((error) => {
    console.error('Gagal menyiapkan akun administrator:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
