import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendMaintenanceEmail } from '@/lib/emailSender';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const flatId = searchParams.get('flatId');

    if (!flatId || flatId === 'all') {
      const allMaintenances = await prisma.maintenance.findMany({
        orderBy: { monthYear: 'desc' },
        include: {
          flat: {
            include: { user: true }
          }
        }
      });
      return NextResponse.json(allMaintenances);
    }

    const maintenances = await prisma.maintenance.findMany({
      where: { flatId },
      orderBy: { monthYear: 'desc' },
      include: {
        flat: {
          include: { user: true }
        }
      }
    });

    return NextResponse.json(maintenances);
  } catch (error) {
    console.error("Fetch Maintenance Error:", error);
    return NextResponse.json({ error: "Failed to fetch maintenance" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { records } = data; // Array of { flatId, month, amount }

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid records payload" }, { status: 400 });
    }

    const created = await Promise.all(
      records.map(async (record: any) => {
        if (!record.flatId) return null;
        
        const createdRecord = await prisma.maintenance.create({
          data: {
            flatId: record.flatId,
            monthYear: record.month,
            amount: Number(record.amount),
            status: "UNPAID"
          }
        });

        if (record.email) {
          // Send email asynchronously without blocking the loop
          sendMaintenanceEmail(record.email, record.month, Number(record.amount));
        }

        return createdRecord;
      })
    );

    return NextResponse.json({ message: "Maintenance Generated", created: created.filter(Boolean) }, { status: 201 });
  } catch (error) {
    console.error("Create Maintenance Error:", error);
    return NextResponse.json({ error: "Failed to generate maintenance" }, { status: 500 });
  }
}
