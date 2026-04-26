import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { role, email, password, wing, subWing, flatNo } = data;

    // We only support Resident login through this endpoint currently
    // (Admin/Guard can be added later, currently they bypass logic in frontend)
    if (role === 'Resident') {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { 
          flat: {
            include: { vehicles: true }
          }
        }
      });

      if (!user) {
        return NextResponse.json({ error: "User not found with this email." }, { status: 404 });
      }

      // Check Password (In production, use bcrypt.compare)
      if (user.password !== password) {
        return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
      }

      // Check Role
      if (user.role !== 'RESIDENT') {
        return NextResponse.json({ error: "You are not registered as a Resident." }, { status: 403 });
      }

      // Check Approval
      if (!user.isApproved) {
        return NextResponse.json({ error: "Your registration is still pending Admin approval." }, { status: 403 });
      }

      // Check Flat info matching
      if (!user.flat || user.flat.wing !== wing || user.flat.subWing !== subWing || user.flat.flatNumber !== flatNo) {
        return NextResponse.json({ error: "Flat details do not match the registered email." }, { status: 400 });
      }

      // Login Successful
      return NextResponse.json({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          flatId: user.flat.id,
          flat: `${user.flat.wing}-${user.flat.subWing}-${user.flat.flatNumber}`,
          members: user.flat.membersCount,
          vehicles: {
            twoWheelers: user.flat.vehicles.filter((v: any) => v.type === '2-WHEELER').length,
            fourWheelers: user.flat.vehicles.filter((v: any) => v.type === '4-WHEELER').length
          },
          passportPhoto: user.passportPhoto,
          familyPhoto: user.familyPhoto
        }
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: `An internal server error occurred: ${error.message}` }, { status: 500 });
  }
}
