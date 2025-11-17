// controllers/reportController.js
// Controller responsible for exporting analytical reports in CSV or PDF format.
// Supports the same query parameters as existing reporting endpoints:
// - reportType: 'revenue' | 'bookings' | 'fleet'
// - format: 'csv' | 'pdf'
// - startDate / endDate: optional ISO strings used to filter by createdAt

const PDFDocument = require('pdfkit');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const Car = require('../models/Car');

// GET /api/admin/export-report?reportType=revenue&format=csv&startDate=2025-01-01&endDate=2025-01-31
exports.exportReport = async (req, res) => {
  try {
    const {
      reportType = 'revenue',
      format = 'csv',
      startDate,
      endDate,
    } = req.query;

    // Helper to build MongoDB createdAt filter
    const buildDateFilter = () => {
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }
      return dateFilter;
    };

    let data = [];

    switch (reportType) {
      case 'revenue': {
        const revenueAgg = await Rental.aggregate([
          { $match: { rentalStatus: 'completed', ...buildDateFilter() } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalRentalFee' },
              totalLateFees: { $sum: '$lateFee' },
              totalDamageFees: { $sum: '$damageFee' },
            },
          },
          { $project: { _id: 0 } },
        ]);
        const revenue = revenueAgg[0] || {
          totalRevenue: 0,
          totalLateFees: 0,
          totalDamageFees: 0,
        };
        data = [
          { label: 'Revenue', value: revenue.totalRevenue },
          { label: 'Late Fees', value: revenue.totalLateFees },
          { label: 'Damage Fees', value: revenue.totalDamageFees },
        ];
        break;
      }
      case 'bookings': {
        const bookingStats = await Booking.aggregate([
          { $match: buildDateFilter() },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, status: '$_id', count: 1 } },
        ]);
        data = bookingStats.map((b) => ({ label: b.status, value: b.count }));
        break;
      }
      case 'fleet': {
        const fleetStats = await Car.aggregate([
          {
            $group: {
              _id: '$availability',
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, status: '$_id', count: 1 } },
        ]);
        data = fleetStats.map((f) => ({ label: f.status, value: f.count }));
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid reportType parameter' });
    }

    if (format === 'csv') {
      if (!data.length) return res.status(204).end();
      const csvHeader = 'Label,Value';
      const csvRows = data.map((row) => `${row.label},${row.value}`);
      const csvContent = [csvHeader, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${reportType}-report.csv`
      );
      return res.send(csvContent);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${reportType}-report.pdf`
      );
      doc.pipe(res);

      doc.fontSize(18).text(`${reportType.toUpperCase()} REPORT`, { align: 'center' });
      doc.moveDown();

      data.forEach((row) => {
        doc.fontSize(12).text(`${row.label}: ${row.value}`);
      });

      doc.end();
      return; // stream response
    }

    return res.status(400).json({ message: 'Invalid format parameter' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to export report', error: error.message });
  }
};
