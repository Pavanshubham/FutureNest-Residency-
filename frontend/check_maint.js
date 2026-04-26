const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const m = await prisma.maintenance.findMany();
  console.log("Maintenance records:", m);
  const u = await prisma.user.findMany({ include: { flat: true }});
  console.log("Users:", u.map(x => ({ name: x.name, flatId: x.flat?.id })));
}
check().finally(() => prisma.$disconnect());
