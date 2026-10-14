const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const DEMO_SCHOOL_NAMES = [
  'SDN 01 Batam Center',
  'SDN 02 Sei Panas',
  'SMPN 3 Teluk Tering',
  'SMK 2 Batam Center',
  'SMPN 5 Batam',
  'SMAN 1 Batam',
  'SMK 7 Batam',
  'SDN 03 Baloi Permai',
  'SDN 04 Tiban',
  'SMPN 6 Batam',
  'SDN 05 Batu Aji',
  'SMPN 8 Batam',
  'SMAN 2 Batam',
  'SDN 06 Sekupang',
  'SMPN 9 Batam',
  'SMK 3 Batam',
  'SDN 07 Bengkong',
  'SMPN 10 Batam',
  'SDN 08 Lubuk Baja',
  'SMAN 3 Batam',
  'SDN 09 Nongsa',
  'SMPN 11 Batam',
  'SDN 10 Sagulung',
  'SMK 4 Batam',
  'SMPN 12 Batam',
];

const DEMO_INGREDIENT_NAMES = [
  'Beras putih matang',
  'Dada ayam matang',
  'Wortel',
  'Buncis',
  'Minyak goreng',
  'Pisang',
];

async function main() {
  const deleted = await prisma.$transaction(async (transaction) => {
    const demoDeliveries = await transaction.delivery.deleteMany({ where: { id: { startsWith: 'demo-' } } });
    const demoClaims = await transaction.claim.deleteMany({ where: { id: { in: ['demo-claim-1', 'demo-claim-2'] } } });
    const demoAlerts = await transaction.systemAlert.deleteMany({ where: { id: { in: ['demo-alert-1', 'demo-alert-2', 'demo-alert-3'] } } });

    const unusedDemoSchools = await transaction.school.findMany({
      where: {
        name: { in: DEMO_SCHOOL_NAMES },
        email: null,
        account: { is: null },
        deliveries: { none: {} },
        claims: { none: {} },
        menuRecipients: { none: {} },
        invitations: { none: {} },
      },
      select: { id: true },
    });
    const demoSchools = await transaction.school.deleteMany({
      where: { id: { in: unusedDemoSchools.map((school) => school.id) } },
    });

    const demoDrivers = await transaction.driver.deleteMany({
      where: {
        id: { in: ['demo-aqua', 'demo-sanford', 'demo-rahmat', 'demo-bariq', 'demo-dohan', 'demo-haikal', 'demo-defan', 'demo-rizky', 'demo-fajar', 'demo-dimas', 'demo-andi', 'demo-rian'] },
        deliveries: { none: {} },
      },
    });

    const demoIngredients = await transaction.nutritionIngredient.findMany({
      where: { name: { in: DEMO_INGREDIENT_NAMES }, menus: { none: {} } },
      select: { id: true },
    });
    const ingredients = await transaction.nutritionIngredient.deleteMany({
      where: { id: { in: demoIngredients.map((ingredient) => ingredient.id) } },
    });

    return {
      deliveries: demoDeliveries.count,
      claims: demoClaims.count,
      alerts: demoAlerts.count,
      schools: demoSchools.count,
      drivers: demoDrivers.count,
      ingredients: ingredients.count,
    };
  });

  console.log(
    `Data contoh yang dikenali dihapus; akun admin dan data lainnya dipertahankan. `
    + `${deleted.schools} sekolah, ${deleted.deliveries} pengiriman, ${deleted.claims} klaim, `
    + `${deleted.alerts} peringatan, ${deleted.drivers} kurir, ${deleted.ingredients} bahan contoh.`,
  );
}

main()
  .catch((error) => {
    console.error('Gagal menghapus data contoh:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
