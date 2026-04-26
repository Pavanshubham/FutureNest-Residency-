import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { isApproved: true }
    });

    return NextResponse.json({ message: "Resident approved", user: updatedUser });
  } catch (error) {
    console.error("Approve Error:", error);
    return NextResponse.json({ error: "Failed to approve resident" }, { status: 500 });
  }
}
