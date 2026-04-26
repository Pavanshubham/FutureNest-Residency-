import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    let title = '';
    let message = '';
    let type = 'GENERAL';
    let attachmentUrl = null;
    let attachmentName = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      title = formData.get('title') as string;
      message = formData.get('message') as string;
      type = (formData.get('type') as string) || 'GENERAL';
      
      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const path = join(process.cwd(), 'public', 'uploads', filename);
        
        // Ensure uploads directory exists
        try {
          const fs = await import('fs/promises');
          await fs.mkdir(join(process.cwd(), 'public', 'uploads'), { recursive: true });
        } catch (e) {}

        await writeFile(path, buffer);
        attachmentUrl = `/uploads/${filename}`;
        attachmentName = file.name;
      }
    } else {
      const data = await req.json();
      title = data.title;
      message = data.message;
      type = data.type || "GENERAL";
    }

    const newNotification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        attachmentUrl,
        attachmentName
      }
    });

    return NextResponse.json({ message: "Notice Broadcasted", notification: newNotification }, { status: 201 });
  } catch (error) {
    console.error("Create Notification Error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
