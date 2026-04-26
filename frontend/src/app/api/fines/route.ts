import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendFineEmail } from '@/lib/emailSender';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const flatId = searchParams.get('flatId');

    if (!flatId || flatId === 'all') {
      const allFines = await prisma.fine.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          flat: {
            include: { user: true }
          }
        }
      });
      return NextResponse.json(allFines);
    }

    const fines = await prisma.fine.findMany({
      where: { flatId },
      orderBy: { createdAt: 'desc' },
      include: {
        flat: {
          include: { user: true }
        }
      }
    });

    return NextResponse.json(fines);
  } catch (error) {
    console.error("Fetch Fines Error:", error);
    return NextResponse.json({ error: "Failed to fetch fines" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { amount, reason, bikeNo, snapshotUrl } = data;

    // Find the vehicle to get the flatId
    const vehicle = await prisma.vehicle.findUnique({
      where: { numberPlate: bikeNo },
      include: {
        flat: {
          include: {
            user: true
          }
        }
      }
    });

    let flatId = null;
    let email = null;

    if (vehicle && vehicle.flat) {
      flatId = vehicle.flat.id;
      if (vehicle.flat.user && vehicle.flat.user.email) {
        email = vehicle.flat.user.email;
      }
    }

    const fine = await prisma.fine.create({
      data: {
        amount: Number(amount),
        reason,
        bikeNo,
        snapshotUrl: snapshotUrl || '/violation.png',
        flatId: flatId
      }
    });

    if (email) {
      // Send email asynchronously
      sendFineEmail(email, bikeNo, Number(amount));
    }

    return NextResponse.json({ message: "Fine Generated", fine }, { status: 201 });
  } catch (error) {
    console.error("Create Fine Error:", error);
    return NextResponse.json({ error: "Failed to generate fine" }, { status: 500 });
  }
}
