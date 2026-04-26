import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'pending' or 'approved'

    let isApproved = undefined;
    if (status === 'pending') isApproved = false;
    if (status === 'approved') isApproved = true;

    const residents = await prisma.user.findMany({
      where: {
        role: "RESIDENT",
        ...(isApproved !== undefined && { isApproved })
      },
      include: { flat: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = residents.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      flat: r.flat ? `${r.flat.wing}-${r.flat.subWing}-${r.flat.flatNumber}` : 'N/A',
      flatId: r.flat?.id,
      vehicles: "Vehicles Info", // Mocking vehicle details for brevity if not mapped
      isApproved: r.isApproved
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Fetch Residents Error:", error);
    return NextResponse.json({ error: "Failed to fetch residents" }, { status: 500 });
  }
}
