const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Function to generate rental invoice PDF
const generateRentalInvoice = (rentalData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument();
      
      // Pipe its output to a file
      const stream = doc.pipe(fs.createWriteStream(outputPath));
      
      // Header
      doc.fontSize(20).text('Rental Invoice', { align: 'center' });
      doc.moveDown();
      
      // Rental information
      doc.fontSize(12);
      doc.text(`Rental ID: ${rentalData.rentalId}`);
      doc.text(`Date: ${new Date(rentalData.createdAt).toLocaleDateString()}`);
      doc.moveDown();
      
      // Customer information
      doc.fontSize(14).text('Customer Information:');
      doc.fontSize(12);
      doc.text(`Name: ${rentalData.customer.name}`);
      doc.text(`Email: ${rentalData.customer.email}`);
      doc.moveDown();
      
      // Car information
      doc.fontSize(14).text('Car Information:');
      doc.fontSize(12);
      doc.text(`Make: ${rentalData.car.make}`);
      doc.text(`Model: ${rentalData.car.model}`);
      doc.text(`Year: ${rentalData.car.year}`);
      doc.moveDown();
      
      // Rental dates
      doc.fontSize(14).text('Rental Dates:');
      doc.fontSize(12);
      doc.text(`Booking Period: ${new Date(rentalData.booking.startDate).toLocaleDateString()} - ${new Date(rentalData.booking.endDate).toLocaleDateString()}`);
      doc.text(`Check-out Date: ${new Date(rentalData.dates.checkOut).toLocaleDateString()}`);
      if (rentalData.dates.checkIn) {
        doc.text(`Check-in Date: ${new Date(rentalData.dates.checkIn).toLocaleDateString()}`);
      }
      doc.moveDown();
      
      // Location
      doc.fontSize(14).text('Location:');
      doc.fontSize(12);
      doc.text(rentalData.booking.location);
      doc.moveDown();
      
      // Fees
      doc.fontSize(14).text('Fees:');
      doc.fontSize(12);
      doc.text(`Rental Fee: $${rentalData.fees.rentalFee.toFixed(2)}`);
      if (rentalData.fees.lateFee > 0) {
        doc.text(`Late Fee: $${rentalData.fees.lateFee.toFixed(2)}`);
      }
      if (rentalData.fees.damageFee > 0) {
        doc.text(`Damage Fee: $${rentalData.fees.damageFee.toFixed(2)}`);
      }
      doc.moveDown();
      
      // Total
      doc.fontSize(16).text(`Total: $${rentalData.fees.total.toFixed(2)}`, { align: 'right' });
      
      // Footer
      doc.moveDown(2);
      doc.fontSize(10).text('Thank you for your business!', { align: 'center' });
      
      // Finalize the PDF
      doc.end();
      
      // Wait for the stream to finish
      stream.on('finish', () => {
        resolve(outputPath);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateRentalInvoice };
