const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateOldFlats() {
  const flats = await prisma.flat.findMany();
  for (const f of flats) {
    if (f.membersCount === 4 || f.membersCount === 1) { // 4 was my mock default, 1 was schema default
      await prisma.flat.update({
        where: { id: f.id },
        data: { membersCount: 2 }
      });
      console.log(`Updated flat ${f.id} to 2 members`);
    }
  }
}

updateOldFlats().then(() => prisma.$disconnect());
