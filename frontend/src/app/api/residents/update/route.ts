import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { flatId, membersCount, newVehicles } = data; // newVehicles: [{type: '2-WHEELER', number: 'MH12AB1234'}, ...]

    if (!flatId) {
      return NextResponse.json({ error: "Missing flatId parameter" }, { status: 400 });
    }

    // Update members count
    if (membersCount !== undefined) {
      await prisma.flat.update({
        where: { id: flatId },
        data: { membersCount: Number(membersCount) }
      });
    }

    // Add new vehicles
    if (newVehicles && Array.isArray(newVehicles)) {
      for (const v of newVehicles) {
        if (!v.number || !v.type) continue;
        
        // Ensure no duplicate number plates
        const existing = await prisma.vehicle.findUnique({ where: { numberPlate: v.number } });
        if (!existing) {
          await prisma.vehicle.create({
            data: {
              type: v.type,
              numberPlate: v.number.replace(/\s+/g, '').toUpperCase(),
              flatId: flatId
            }
          });
        }
      }
    }

    // Fetch updated user data to return
    const updatedFlat = await prisma.flat.findUnique({
      where: { id: flatId },
      include: { vehicles: true }
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      membersCount: updatedFlat?.membersCount,
      vehicles: {
        twoWheelers: updatedFlat?.vehicles.filter((v: any) => v.type === '2-WHEELER').length || 0,
        fourWheelers: updatedFlat?.vehicles.filter((v: any) => v.type === '4-WHEELER').length || 0
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: "Failed to update profile: " + error.message }, { status: 500 });
  }
}
