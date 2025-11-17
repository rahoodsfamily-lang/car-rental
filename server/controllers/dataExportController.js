const PDFDocument = require('pdfkit');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');

// Helper function to format booking/rental IDs like the frontend
const formatId = (id, prefix = 'BKG') => {
  if (!id) return 'N/A';
  
  // Extract last 8 characters of the ID
  const shortId = id.toString().slice(-8);
  
  // Convert hex to a numeric format for better readability
  // Take first 5 characters and convert to base 10
  const numericId = parseInt(shortId.substring(0, 5), 16) % 100000;
  
  // Format with leading zeros to ensure consistent length
  const formattedNumber = numericId.toString().padStart(5, '0');
  
  return `${prefix}-${formattedNumber}`;
};

const formatBookingId = (id) => formatId(id, 'BKG');
const formatRentalId = (id) => formatId(id, 'RNT');

// GET /api/admin/export-data?type=bookings&format=pdf&status=pending
exports.exportData = async (req, res) => {
  try {
    const { 
      type = 'bookings', 
      format = 'pdf', 
      status, 
      search, 
      tabStatus,
      userName,
      carName,
      startDate,
      endDate
    } = req.query;

    let data = [];
    let filename = '';
    let title = '';

    if (type === 'bookings') {
      // Build booking filter
      const filter = {};
      if (status && status !== 'all') filter.status = status;
      if (tabStatus) filter.status = tabStatus; // Override with tab-specific status
      
      // Get bookings data
      let query = Booking.find(filter)
        .populate('car', 'make model year pricePerDay')
        .populate('user', 'email profile.firstName profile.lastName')
        .lean();

      data = await query;

      // Apply search filter if provided
      if (search) {
        data = data.filter(booking => {
          const customerName = `${booking.user?.profile?.firstName || ''} ${booking.user?.profile?.lastName || ''}`.toLowerCase();
          const customerEmail = booking.user?.email?.toLowerCase() || '';
          const carInfo = `${booking.car?.make || ''} ${booking.car?.model || ''} ${booking.car?.year || ''}`.toLowerCase();
          const searchLower = search.toLowerCase();
          
          return customerName.includes(searchLower) || 
                 customerEmail.includes(searchLower) || 
                 carInfo.includes(searchLower);
        });
      }

      title = 'Booking Management Report';
      filename = `bookings_report_${new Date().toISOString().split('T')[0]}.pdf`;

    } else if (type === 'rentals') {
      // Build rental filter
      const filter = {};
      if (status) filter.rentalStatus = status;
      if (tabStatus) filter.rentalStatus = tabStatus; // Override with tab-specific status

      // Get rentals data
      let query = Rental.find(filter)
        .populate('car', 'make model year')
        .populate('user', 'email profile.firstName profile.lastName')
        .populate('booking', 'startDate endDate')
        .lean();

      data = await query;

      // Apply additional filters
      if (userName) {
        data = data.filter(rental => {
          const customerName = `${rental.user?.profile?.firstName || ''} ${rental.user?.profile?.lastName || ''}`.toLowerCase();
          return customerName.includes(userName.toLowerCase());
        });
      }

      if (carName) {
        data = data.filter(rental => {
          const carInfo = `${rental.car?.make || ''} ${rental.car?.model || ''} ${rental.car?.year || ''}`.toLowerCase();
          return carInfo.includes(carName.toLowerCase());
        });
      }

      title = 'Rental Management Report';
      filename = `rentals_report_${new Date().toISOString().split('T')[0]}.pdf`;
    } else {
      return res.status(400).json({ message: 'Invalid type parameter. Use "bookings" or "rentals".' });
    }

    if (!data.length) {
      return res.status(204).end();
    }

    if (format === 'pdf') {
      const title = type === 'bookings' ? 'BOOKINGS REPORT' : 'RENTALS REPORT';
      const filename = type === 'bookings' 
        ? `bookings_report_${new Date().toISOString().split('T')[0]}.pdf`
        : `rentals_report_${new Date().toISOString().split('T')[0]}.pdf`;

      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        autoFirstPage: true,
        bufferPages: true
      });
      
      // Handle PDF errors
      doc.on('error', (err) => {
        console.error('PDF generation error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error generating PDF', error: err.message });
        }
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      doc.pipe(res);

      // Define colors
      const primaryColor = '#1976d2';
      const successColor = '#4caf50';
      const warningColor = '#ff9800';
      const errorColor = '#f44336';

      // Helper function for status colors
      const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
          case 'confirmed': case 'completed': return successColor;
          case 'pending': return warningColor;
          case 'active': return primaryColor;
          case 'cancelled': return errorColor;
          case 'overdue': return errorColor;
          default: return '#666666';
        }
      };

      // Header
      doc.fillColor(primaryColor)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('CAR RENTAL SYSTEM', { align: 'center' });
      
      doc.fontSize(16)
         .font('Helvetica')
         .text(title, { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.text(`Total Records: ${data.length}`, { align: 'center' });
      
      // Add some space
      doc.moveDown(2);
      
      if (type === 'bookings') {
        // Booking records
        data.forEach((booking, index) => {
          // Add page break if needed (but not before first item)
          if (index > 0 && doc.y > 600) {
            doc.addPage();
          }
          
          // Record header with status color
          const statusColor = getStatusColor(booking.status);
          const bookingIdDisplay = booking.bookingId || formatBookingId(booking._id);
          doc.fillColor(statusColor)
             .fontSize(14)
             .font('Helvetica-Bold')
             .text(`${bookingIdDisplay} - ${booking.status?.toUpperCase() || 'N/A'}`);
          
          doc.moveDown(0.5);
          
          // Customer info
          const customerName = `${booking.user?.profile?.firstName || ''} ${booking.user?.profile?.lastName || ''}`.trim() || 'N/A';
          doc.fillColor('#333333')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Customer:', { continued: true })
             .font('Helvetica')
             .text(` ${customerName}`);
          
          doc.font('Helvetica-Bold')
             .text('Email:', { continued: true })
             .font('Helvetica')
             .text(` ${booking.user?.email || 'N/A'}`);
          
          // Vehicle info
          const vehicleName = `${booking.car?.year || ''} ${booking.car?.make || ''} ${booking.car?.model || ''}`.trim() || 'N/A';
          doc.font('Helvetica-Bold')
             .text('Vehicle:', { continued: true })
             .font('Helvetica')
             .text(` ${vehicleName}`);
          
          doc.font('Helvetica-Bold')
             .text('Daily Rate:', { continued: true })
             .font('Helvetica')
             .text(` PHP ${booking.car?.pricePerDay?.toLocaleString() || '0'}`);
          
          // Booking dates
          const startDate = booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A';
          const endDate = booking.endDate ? new Date(booking.endDate).toLocaleDateString() : 'N/A';
          doc.font('Helvetica-Bold')
             .text('Pickup Date:', { continued: true })
             .font('Helvetica')
             .text(` ${startDate}`);
          
          doc.font('Helvetica-Bold')
             .text('Return Date:', { continued: true })
             .font('Helvetica')
             .text(` ${endDate}`);
          
          // Calculate duration
          const duration = booking.startDate && booking.endDate 
            ? Math.ceil((new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24))
            : 0;
          doc.font('Helvetica-Bold')
             .text('Duration:', { continued: true })
             .font('Helvetica')
             .text(` ${duration} day${duration !== 1 ? 's' : ''}`);
          
          // Total amount
          doc.fillColor(primaryColor)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`Total Amount: PHP ${booking.totalPrice?.toLocaleString() || '0'}`);
          
          // Add separator
          if (index < data.length - 1) {
            doc.moveDown();
            doc.strokeColor('#cccccc')
               .lineWidth(0.5)
               .moveTo(50, doc.y)
               .lineTo(doc.page.width - 50, doc.y)
               .stroke();
            doc.moveDown();
          }
        });
      } else {
        // Rental records
        data.forEach((rental, index) => {
          // Add page break if needed (but not before first item)
          if (index > 0 && doc.y > 550) {
            doc.addPage();
          }
          
          // Record header with status color
          const statusColor = getStatusColor(rental.rentalStatus);
          const rentalIdDisplay = rental.rentalId || formatRentalId(rental._id);
          doc.fillColor(statusColor)
             .fontSize(14)
             .font('Helvetica-Bold')
             .text(`${rentalIdDisplay} - ${rental.rentalStatus?.toUpperCase() || 'N/A'}`);
          
          doc.moveDown(0.5);
          
          // Customer info
          const customerName = `${rental.user?.profile?.firstName || ''} ${rental.user?.profile?.lastName || ''}`.trim() || 'N/A';
          doc.fillColor('#333333')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Customer:', { continued: true })
             .font('Helvetica')
             .text(` ${customerName}`);
          
          doc.font('Helvetica-Bold')
             .text('Email:', { continued: true })
             .font('Helvetica')
             .text(` ${rental.user?.email || 'N/A'}`);
          
          // Vehicle info
          const vehicleName = `${rental.car?.year || ''} ${rental.car?.make || ''} ${rental.car?.model || ''}`.trim() || 'N/A';
          doc.font('Helvetica-Bold')
             .text('Vehicle:', { continued: true })
             .font('Helvetica')
             .text(` ${vehicleName}`);
          
          if (rental.car?.licensePlate) {
            doc.font('Helvetica-Bold')
               .text('License Plate:', { continued: true })
               .font('Helvetica')
               .text(` ${rental.car.licensePlate}`);
          }
          
          // Rental period
          const checkOutDate = rental.checkOutDate ? new Date(rental.checkOutDate).toLocaleDateString() : 'N/A';
          const expectedReturn = rental.booking?.endDate ? new Date(rental.booking.endDate).toLocaleDateString() : 'N/A';
          const checkInDate = rental.checkInDate ? new Date(rental.checkInDate).toLocaleDateString() : 'Not yet returned';
          
          doc.font('Helvetica-Bold')
             .text('Check-Out Date:', { continued: true })
             .font('Helvetica')
             .text(` ${checkOutDate}`);
          
          doc.font('Helvetica-Bold')
             .text('Expected Return:', { continued: true })
             .font('Helvetica')
             .text(` ${expectedReturn}`);
          
          doc.font('Helvetica-Bold')
             .text('Actual Check-In:', { continued: true })
             .font('Helvetica')
             .text(` ${checkInDate}`);
          
          // Financial details
          doc.fillColor('#333333')
             .font('Helvetica-Bold')
             .text('Rental Fee:', { continued: true })
             .font('Helvetica')
             .text(` PHP ${rental.totalRentalFee?.toLocaleString() || '0'}`);
          
          if (rental.lateFee > 0) {
            doc.fillColor(warningColor)
               .font('Helvetica-Bold')
               .text('Late Fee:', { continued: true })
               .font('Helvetica')
               .text(` PHP ${rental.lateFee.toLocaleString()}`);
          }
          
          if (rental.damageFee > 0) {
            doc.fillColor(errorColor)
               .font('Helvetica-Bold')
               .text('Damage Fee:', { continued: true })
               .font('Helvetica')
               .text(` PHP ${rental.damageFee.toLocaleString()}`);
          }
          
          // Total amount
          const totalAmount = (rental.totalRentalFee || 0) + (rental.lateFee || 0) + (rental.damageFee || 0);
          doc.fillColor(primaryColor)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`Total Amount: PHP ${totalAmount.toLocaleString()}`);
          
          // Notes if any
          if (rental.notes) {
            doc.fillColor('#666666')
               .fontSize(9)
               .font('Helvetica')
               .text(`Notes: ${rental.notes}`);
          }
          
          // Add separator
          if (index < data.length - 1) {
            doc.moveDown();
            doc.strokeColor('#cccccc')
               .lineWidth(0.5)
               .moveTo(50, doc.y)
               .lineTo(doc.page.width - 50, doc.y)
               .stroke();
            doc.moveDown();
          }
        });
      }

      // Footer
      doc.moveDown(2);
      doc.fillColor('#666666')
         .fontSize(8)
         .font('Helvetica')
         .text('Car Rental Management System', { align: 'center' })
         .text('This is a system-generated report', { align: 'center' });
      
      doc.end();
      return; // Stream response

    } else if (format === 'csv') {
      let csvContent = '';
      let csvFilename = '';

      if (type === 'bookings') {
        const header = ['Booking ID', 'Customer', 'Email', 'Vehicle', 'Start Date', 'End Date', 'Status', 'Amount'];
        const rows = data.map(booking => [
          booking._id.toString().slice(-8),
          `${booking.user?.profile?.firstName || ''} ${booking.user?.profile?.lastName || ''}`.trim() || 'N/A',
          booking.user?.email || 'N/A',
          `${booking.car?.year || ''} ${booking.car?.make || ''} ${booking.car?.model || ''}`.trim() || 'N/A',
          new Date(booking.startDate).toLocaleDateString(),
          new Date(booking.endDate).toLocaleDateString(),
          booking.status?.toUpperCase() || 'N/A',
          `PHP ${booking.totalPrice?.toLocaleString() || '0'}`
        ]);
        
        csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
        csvFilename = `bookings_report_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        const header = ['Rental ID', 'Customer', 'Vehicle', 'Check Out', 'Check In', 'Status', 'Total Fee'];
        const rows = data.map(rental => [
          rental._id.toString().slice(-8),
          `${rental.user?.profile?.firstName || ''} ${rental.user?.profile?.lastName || ''}`.trim() || 'N/A',
          `${rental.car?.year || ''} ${rental.car?.make || ''} ${rental.car?.model || ''}`.trim() || 'N/A',
          rental.checkOutDate ? new Date(rental.checkOutDate).toLocaleDateString() : 'N/A',
          rental.checkInDate ? new Date(rental.checkInDate).toLocaleDateString() : 'N/A',
          rental.rentalStatus?.toUpperCase() || 'N/A',
          `PHP ${((rental.totalRentalFee || 0) + (rental.lateFee || 0) + (rental.damageFee || 0)).toLocaleString()}`
        ]);
        
        csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
        csvFilename = `rentals_report_${new Date().toISOString().split('T')[0]}.csv`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${csvFilename}`);
      return res.send(csvContent);

    } else {
      return res.status(400).json({ message: 'Invalid format parameter. Use "pdf" or "csv".' });
    }

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ message: 'Failed to export data', error: error.message });
  }
};
