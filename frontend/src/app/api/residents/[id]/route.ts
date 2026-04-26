import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    // This will cascade delete Flat because of onDelete: Cascade in schema
    await prisma.user.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ message: "Resident removed and flat emptied" });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete resident" }, { status: 500 });
  }
}
