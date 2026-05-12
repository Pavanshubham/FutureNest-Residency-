const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function fix() { 
  const vehicles = await prisma.vehicle.findMany(); 
  const fines = await prisma.fine.findMany({where:{flatId:null}}); 
  for (const fine of fines) { 
    const norm = fine.bikeNo.replace(/\s+/g, '').toUpperCase(); 
    const v = vehicles.find(x => x.numberPlate.replace(/\s+/g, '').toUpperCase() === norm); 
    if(v) { 
      await prisma.fine.update({where:{id:fine.id}, data:{flatId:v.flatId}}); 
      console.log('Fixed', fine.bikeNo); 
    } 
  } 
  console.log('Done'); 
} 
fix().then(()=>prisma.$disconnect());
