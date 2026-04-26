import PDFDocument from 'pdfkit';

export async function generateReceiptPDF(paymentDetails: {
  receiptNo: string;
  date: string;
  name: string;
  flat: string;
  amount: number;
  type: string;
  razorpayId: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc
        .fillColor('#4facfe')
        .fontSize(24)
        .text('SecureGate 360', { align: 'center' })
        .fontSize(10)
        .fillColor('#666666')
        .text('Smart Society Management System', { align: 'center' })
        .moveDown(2);

      // Title
      doc
        .fillColor('#333333')
        .fontSize(18)
        .text('PAYMENT RECEIPT', { align: 'center', underline: true })
        .moveDown(2);

      // Receipt Details
      doc.fontSize(12).fillColor('#000000');
      
      const details = [
        `Receipt No: ${paymentDetails.receiptNo}`,
        `Date: ${paymentDetails.date}`,
        `Transaction ID: ${paymentDetails.razorpayId}`,
        `----------------------------------------------------`,
        `Received with thanks from: ${paymentDetails.name}`,
        `Flat Number: ${paymentDetails.flat}`,
        `Payment For: ${paymentDetails.type}`,
        `Amount Paid: Rs. ${paymentDetails.amount.toFixed(2)}`,
        `----------------------------------------------------`,
        `Status: SUCCESSFUL (PAID via Razorpay)`
      ];

      details.forEach(line => {
        doc.text(line, { align: 'left' }).moveDown(0.5);
      });

      // Footer
      doc
        .moveDown(4)
        .fontSize(10)
        .fillColor('#888888')
        .text('This is a computer-generated receipt and does not require a signature.', { align: 'center' })
        .text('For queries, contact admin@securegate360.com', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
