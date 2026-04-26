import nodemailer from 'nodemailer';

export async function sendReceiptEmail(toEmail: string, pdfBuffer: Buffer, type: string) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Standard setup for Gmail app passwords
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"SecureGate 360 Admin" <${process.env.ADMIN_EMAIL}>`,
      to: toEmail,
      subject: `Payment Receipt - ${type} - SecureGate 360`,
      text: `Dear Resident,\n\nThank you for your payment towards ${type}. Please find your payment receipt attached to this email.\n\nRegards,\nAdmin,\nSecureGate 360`,
      attachments: [
        {
          filename: `Receipt_${type}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email: ", error);
    return false;
  }
}

export async function sendMaintenanceEmail(toEmail: string, month: string, amount: number) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"SecureGate 360 Admin" <${process.env.ADMIN_EMAIL}>`,
      to: toEmail,
      subject: `Maintenance Generated for ${month} - SecureGate 360`,
      text: `Dear Resident,\n\nYour society maintenance for the month of ${month} has been generated.\nAmount Due: ₹${amount}\n\nPlease login to your SecureGate 360 dashboard to pay the maintenance.\n\nRegards,\nAdmin,\nSecureGate 360`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Maintenance Email sent: ", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending maintenance email: ", error);
    return false;
  }
}

export async function sendFineEmail(toEmail: string, bikeNo: string, amount: number) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"SecureGate 360 Admin" <${process.env.ADMIN_EMAIL}>`,
      to: toEmail,
      subject: `Traffic Violation Fine Generated - SecureGate 360`,
      text: `Dear Resident,\n\nA traffic violation fine (No Helmet) has been generated for your vehicle ${bikeNo}.\nAmount Due: ₹${amount}\n\nPlease login to your SecureGate 360 dashboard to view the snapshot and pay the fine.\n\nRegards,\nAdmin,\nSecureGate 360`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Fine Email sent: ", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending fine email: ", error);
    return false;
  }
}
