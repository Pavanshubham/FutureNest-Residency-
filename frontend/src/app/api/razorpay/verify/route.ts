import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { generateReceiptPDF } from '@/lib/pdfGenerator';
import { sendReceiptEmail } from '@/lib/emailSender';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      type, // 'MAINTENANCE' or 'FINE'
      recordId
    } = body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment is verified successfully. Update database.
      let amount = 0;
      let email = '';
      let name = 'Resident';
      let flatNum = '';

      if (type === 'MAINTENANCE') {
        const record = await prisma.maintenance.update({
          where: { id: recordId },
          data: { status: 'PAID', razorpayId: razorpay_payment_id, paidAt: new Date() },
          include: { flat: { include: { user: true } } }
        });
        amount = record.amount;
        if (record.flat && record.flat.user) {
          email = record.flat.user.email;
          name = record.flat.user.name || 'Resident';
          flatNum = `${record.flat.wing}-${record.flat.subWing}-${record.flat.flatNumber}`;
        }
      } else if (type === 'FINE') {
        const record = await prisma.fine.update({
          where: { id: recordId },
          data: { status: 'PAID', razorpayId: razorpay_payment_id, paidAt: new Date() },
          include: { flat: { include: { user: true } } }
        });
        amount = record.amount;
        if (record.flat && record.flat.user) {
          email = record.flat.user.email;
          name = record.flat.user.name || 'Resident';
          flatNum = `${record.flat.wing}-${record.flat.subWing}-${record.flat.flatNumber}`;
        }
      }

      // Fallback for missing user data in mock setup
      if (!email) {
        email = 'rajesh.sharma@example.com';
        flatNum = 'B-B2-202';
      }

      // Generate PDF & Send Email
      try {
        const pdfBuffer = await generateReceiptPDF({
          receiptNo: `RCPT-${Math.floor(100000 + Math.random() * 900000)}`,
          date: new Date().toLocaleDateString('en-IN'),
          name: name,
          flat: flatNum,
          amount: amount,
          type: type,
          razorpayId: razorpay_payment_id,
        });

        await sendReceiptEmail(email, pdfBuffer, type);
      } catch (pdfErr) {
        console.error("PDF/Email generation failed: ", pdfErr);
        // We don't fail the verification response if email fails
      }

      return NextResponse.json({ message: "Payment verified successfully", isOk: true }, { status: 200 });
    } else {
      return NextResponse.json({ message: "Invalid signature sent!" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
