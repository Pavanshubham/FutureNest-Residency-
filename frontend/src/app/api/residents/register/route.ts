import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const wing = formData.get('wing') as string;
    const subWing = formData.get('subWing') as string;
    const flatNo = formData.get('flatNo') as string;
    const twoWheelers = formData.get('twoWheelers') as string;
    const fourWheelers = formData.get('fourWheelers') as string;
    const vehicleNos = formData.get('vehicleNos') as string;
    const membersCount = formData.get('membersCount') as string;

    const passportPhoto = formData.get('passportPhoto') as File | null;
    const familyPhoto = formData.get('familyPhoto') as File | null;

    // Check if flat already exists
    const existingFlat = await prisma.flat.findUnique({
      where: {
        wing_subWing_flatNumber: {
          wing,
          subWing,
          flatNumber: flatNo
        }
      }
    });

    if (existingFlat) {
      return NextResponse.json({ error: "Registration for this flat already exists." }, { status: 400 });
    }

    // Save Photos to public/uploads directory
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    
    let passportPhotoUrl = null;
    let familyPhotoUrl = null;

    if (passportPhoto) {
      const bytes = await passportPhoto.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}_passport_${passportPhoto.name.replace(/\\s+/g, '_')}`;
      await fs.writeFile(path.join(uploadDir, filename), buffer);
      passportPhotoUrl = `/uploads/${filename}`;
    }

    if (familyPhoto) {
      const bytes = await familyPhoto.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}_family_${familyPhoto.name.replace(/\\s+/g, '_')}`;
      await fs.writeFile(path.join(uploadDir, filename), buffer);
      familyPhotoUrl = `/uploads/${filename}`;
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password, // Note: In production, hash this password using bcrypt
        role: "RESIDENT",
        isApproved: false, // Pending admin approval
        passportPhoto: passportPhotoUrl,
        familyPhoto: familyPhotoUrl,
        flat: {
          create: {
            wing,
            subWing,
            flatNumber: flatNo,
            membersCount: membersCount ? parseInt(membersCount) : 2, 
          }
        }
      },
      include: { flat: true }
    });

    // Add vehicles if provided
    const vNos = vehicleNos.split(',').map(v => v.trim()).filter(v => v !== '');
    if (vNos.length > 0 && newUser.flat) {
      // Create Two Wheelers
      const num2W = parseInt(twoWheelers) || 0;
      const num4W = parseInt(fourWheelers) || 0;
      
      let index = 0;
      for (let i = 0; i < num2W && index < vNos.length; i++) {
        await prisma.vehicle.create({
          data: { type: '2-WHEELER', numberPlate: vNos[index++], flatId: newUser.flat.id }
        });
      }
      for (let i = 0; i < num4W && index < vNos.length; i++) {
        await prisma.vehicle.create({
          data: { type: '4-WHEELER', numberPlate: vNos[index++], flatId: newUser.flat.id }
        });
      }
    }
    
    return NextResponse.json({ message: "Registration successful. Waiting for admin approval.", user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: `Failed to register: ${error.message}` }, { status: 500 });
  }
}
