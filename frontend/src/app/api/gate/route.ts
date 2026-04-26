import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { action, plate, snapshotUrl } = data; 
    // action is either "in" (gate-out camera) or "out" (gate-in camera)

    if (!plate || !action) {
      return NextResponse.json({ error: "Missing plate or action parameter" }, { status: 400 });
    }

    // 1. Check if the plate belongs to a resident
    const vehicle = await prisma.vehicle.findUnique({
      where: { numberPlate: plate },
      include: { flat: true }
    });

    const isResident = !!vehicle;
    const monthYear = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    // 2. Logic for IN vs OUT based on isResident
    if (action === "in") {
      if (isResident) {
        // Resident returning IN -> find existing OUT record missing IN
        const existingLog = await prisma.vehicleLog.findFirst({
          where: {
            vehicleNo: plate,
            timeIn: null
          },
          orderBy: { createdAt: 'desc' }
        });
        if (existingLog) {
          const log = await prisma.vehicleLog.update({
            where: { id: existingLog.id },
            data: { timeIn: new Date(), snapshotUrl: snapshotUrl || existingLog.snapshotUrl }
          });
          return NextResponse.json({ message: "Resident Entry recorded", log, isResident });
        }
      }
      
      // Visitor entering or Resident IN without an OUT record
      const log = await prisma.vehicleLog.create({
        data: {
          vehicleNo: plate,
          isResident,
          snapshotUrl,
          timeIn: new Date(),
          monthYear
        }
      });
      return NextResponse.json({ message: "Entry recorded", log, isResident });

    } else if (action === "out") {
      if (!isResident) {
        // Visitor leaving OUT -> find existing IN record missing OUT
        const existingLog = await prisma.vehicleLog.findFirst({
          where: {
            vehicleNo: plate,
            timeOut: null
          },
          orderBy: { createdAt: 'desc' }
        });
        if (existingLog) {
          const log = await prisma.vehicleLog.update({
            where: { id: existingLog.id },
            data: { timeOut: new Date() }
          });
          return NextResponse.json({ message: "Visitor Exit recorded", log, isResident });
        }
      }

      // Resident leaving or Visitor OUT without an IN record
      const log = await prisma.vehicleLog.create({
        data: {
          vehicleNo: plate,
          isResident,
          snapshotUrl,
          timeOut: new Date(),
          monthYear
        }
      });
      return NextResponse.json({ message: "Exit recorded", log, isResident });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Gate Process Error:", error);
    return NextResponse.json({ error: "Failed to process gate action" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const logs = await prisma.vehicleLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Gate Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch gate logs" }, { status: 500 });
  }
}
