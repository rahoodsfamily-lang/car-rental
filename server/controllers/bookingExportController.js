// controllers/bookingExportController.js
// Provides CSV and PDF export for full bookings list (admin only)

const Booking = require('../models/Booking');
const PDFDocument = require('pdfkit');

exports.exportBookings = async (req, res) => {
  try {
    const { format = 'csv', status = 'all' } = req.query;

    // Build filter by status if provided
    const filter = {};
    if (status !== 'all') filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('car', 'make model year')
      .populate('user', 'email profile.firstName profile.lastName')
      .lean();

    if (!bookings.length) {
      return res.status(204).end();
    }

    if (format === 'csv') {
      const header = [
        'Status',
        'User',
        'Email',
        'Car',
        'StartDate',
        'EndDate',
        'Location',
        'TotalPrice',
      ];
      const rows = bookings.map((b) => [
        b.status,
        `${b.user?.profile?.firstName || ''} ${b.user?.profile?.lastName || ''}`.trim(),
        b.user?.email || '',
        `${b.car?.make || ''} ${b.car?.model || ''} ${b.car?.year || ''}`.trim(),
        new Date(b.startDate).toISOString(),
        new Date(b.endDate).toISOString(),
        b.location,
        b.totalPrice,
      ]);

      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bookings-export.csv');
      return res.send(csv);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=bookings-export.pdf');
      doc.pipe(res);

      doc.fontSize(18).text('Bookings Export', { align: 'center' });
      doc.moveDown();

      bookings.forEach((b) => {
        doc.fontSize(12).text(`Status: ${b.status}`);
        doc.text(`User: ${b.user?.email}`);
        doc.text(
          `Car: ${b.car?.make} ${b.car?.model} ${b.car?.year}`
        );
        doc.text(`Start: ${new Date(b.startDate).toLocaleString()}`);
        doc.text(`End: ${new Date(b.endDate).toLocaleString()}`);
        doc.text(`Location: ${b.location}`);
        doc.text(`Total Price: $${b.totalPrice}`);
        doc.moveDown();
      });

      doc.end();
      return; // stream
    }

    return res.status(400).json({ message: 'Invalid format parameter' });
  } catch (error) {
    return res.status(500).json({ message: 'Error exporting bookings', error: error.message });
  }
};
