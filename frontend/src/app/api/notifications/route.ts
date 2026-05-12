import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const flat = searchParams.get('flat');

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    let filteredNotifications = notifications;
    if (flat) {
      filteredNotifications = notifications.filter(n => 
        n.target === "ALL" || flat.startsWith(n.target)
      );
    }

    return NextResponse.json(filteredNotifications);
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
    let target = 'ALL';
    let attachmentUrl = null;
    let attachmentName = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      title = formData.get('title') as string;
      message = formData.get('message') as string;
      type = (formData.get('type') as string) || 'GENERAL';
      target = (formData.get('target') as string) || 'ALL';
      
      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType = file.type || 'application/octet-stream';
        attachmentUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
        attachmentName = file.name;
      }
    } else {
      const data = await req.json();
      title = data.title;
      message = data.message;
      type = data.type || "GENERAL";
      target = data.target || "ALL";
    }

    const newNotification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        target,
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
