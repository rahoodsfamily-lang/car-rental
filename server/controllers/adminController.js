const Car = require('../models/Car');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get fleet status summary
exports.getFleetStatus = async (req, res) => {
  try {
    const fleetStatus = await Car.aggregate([
      {
        $group: {
          _id: '$availability',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get total count
    const totalCars = await Car.countDocuments();

    res.json({
      fleetStatus,
      totalCars
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fleet status', error: error.message });
  }
};

// Get revenue report
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Get total revenue from completed + active rentals (rental fees being earned)
    const revenueData = await Rental.aggregate([
      { $match: { rentalStatus: { $in: ['completed', 'active'] }, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRentalFee' },
          totalLateFees: { $sum: '$lateFee' },
          totalDamageFees: { $sum: '$damageFee' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalLateFees: 1,
          totalDamageFees: 1,
          totalCount: '$count'
        }
      }
    ]);
    
    const revenue = revenueData.length > 0 ? revenueData[0] : {
      totalRevenue: 0,
      totalLateFees: 0,
      totalDamageFees: 0,
      totalCount: 0
    };

    res.json(revenue);
  } catch (error) {
    res.status(500).json({ message: 'Error generating revenue report', error: error.message });
  }
};

// Get booking statistics
exports.getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Get booking counts by status
    const bookingStats = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Get total count
    const totalBookings = await Booking.countDocuments(dateFilter);
    
    res.json({
      bookingStats,
      totalBookings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching booking stats', error: error.message });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { name } = req.query;

    // Build search filter
    const filter = {};
    if (name) {
      const regex = new RegExp(name, 'i');
      filter.$or = [
        { email: regex },
        { 'profile.firstName': regex },
        { 'profile.lastName': regex }
      ];
    }
    
    const users = await User.find(filter)
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validate role
    if (!['customer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
};

// Deactivate user (admin only)
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Note: We're not actually deleting the user, just marking them as deactivated
    // This would require adding a 'deactivated' field to the User model
    const user = await User.findByIdAndUpdate(
      userId,
      { deactivated: true, updatedAt: Date.now() },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating user', error: error.message });
  }
};

// Create user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { email, password, profile, role, deactivated } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new user
    const user = new User({
      email,
      password,
      profile,
      role: role || 'customer',
      deactivated: deactivated || false,
      emailVerified: true, // Auto-verify email for admin-created users
    });
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({ 
      success: true,
      message: 'User created successfully', 
      user: userResponse 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { profile, email, role, deactivated } = req.body;
    
    // Build update object
    const updateData = {};
    
    // If profile is being updated, merge it with existing profile
    if (profile) {
      // Fetch current user to get existing profile
      const currentUser = await User.findById(userId);
      if (currentUser) {
        // Merge new profile fields with existing ones
        updateData.profile = {
          ...currentUser.profile,
          ...profile
        };
      } else {
        updateData.profile = profile;
      }
    }
    
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (deactivated !== undefined) updateData.deactivated = deactivated;
    updateData.updatedAt = Date.now();
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      success: true,
      message: 'User updated successfully', 
      user 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Date calculations for month-over-month comparison
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // Get total counts
    const totalCars = await Car.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalBookings = await Booking.countDocuments();
    const totalRentals = await Rental.countDocuments();
    
    // Get current month counts for growth calculation
    const currentMonthUsers = await User.countDocuments({ 
      role: 'customer',
      createdAt: { $gte: currentMonthStart }
    });
    const lastMonthUsers = await User.countDocuments({ 
      role: 'customer',
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const currentMonthBookings = await Booking.countDocuments({ 
      createdAt: { $gte: currentMonthStart }
    });
    const lastMonthBookings = await Booking.countDocuments({ 
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const currentMonthRentals = await Rental.countDocuments({ 
      createdAt: { $gte: currentMonthStart }
    });
    const lastMonthRentals = await Rental.countDocuments({ 
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    // Calculate growth percentages
    const userGrowth = lastMonthUsers > 0 
      ? ((currentMonthUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1)
      : currentMonthUsers > 0 ? 100 : 0;
      
    const bookingGrowth = lastMonthBookings > 0 
      ? ((currentMonthBookings - lastMonthBookings) / lastMonthBookings * 100).toFixed(1)
      : currentMonthBookings > 0 ? 100 : 0;
      
    const rentalGrowth = lastMonthRentals > 0 
      ? ((currentMonthRentals - lastMonthRentals) / lastMonthRentals * 100).toFixed(1)
      : currentMonthRentals > 0 ? 100 : 0;
    
    // Get active rentals
    const activeRentals = await Rental.countDocuments({ rentalStatus: 'active' });
    
    // Get overdue rentals
    const overdueRentals = await Rental.countDocuments({ rentalStatus: 'overdue' });
    
    // Get pending bookings
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    
    // Get total revenue from completed + active rentals (rental fees being earned)
    const revenueData = await Rental.aggregate([
      { $match: { rentalStatus: { $in: ['completed', 'active'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRentalFee' },
          totalLateFees: { $sum: '$lateFee' },
          totalDamageFees: { $sum: '$damageFee' }
        }
      }
    ]);
    
    // Get current month revenue from completed + active rentals
    const currentMonthRevenueData = await Rental.aggregate([
      { 
        $match: { 
          rentalStatus: { $in: ['completed', 'active'] },
          createdAt: { $gte: currentMonthStart }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRentalFee' },
          totalLateFees: { $sum: '$lateFee' },
          totalDamageFees: { $sum: '$damageFee' }
        }
      }
    ]);
    
    // Get last month revenue from completed + active rentals
    const lastMonthRevenueData = await Rental.aggregate([
      { 
        $match: { 
          rentalStatus: { $in: ['completed', 'active'] },
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRentalFee' },
          totalLateFees: { $sum: '$lateFee' },
          totalDamageFees: { $sum: '$damageFee' }
        }
      }
    ]);
    
    // Get booking revenue from completed bookings
    const completedBookings = await Booking.find({ status: 'completed' });
    const bookingRevenue = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    // Get current month booking revenue
    const currentMonthCompletedBookings = await Booking.find({ 
      status: 'completed',
      createdAt: { $gte: currentMonthStart }
    });
    const currentMonthBookingRevenue = currentMonthCompletedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    // Get last month booking revenue
    const lastMonthCompletedBookings = await Booking.find({ 
      status: 'completed',
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    const lastMonthBookingRevenue = lastMonthCompletedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const revenue = revenueData.length > 0 ? revenueData[0] : {
      totalRevenue: 0,
      totalLateFees: 0,
      totalDamageFees: 0
    };
    
    // Calculate total revenue from completed + active rentals only
    const currentMonthRentalRevenue = currentMonthRevenueData.length > 0 
      ? currentMonthRevenueData[0].totalRevenue + currentMonthRevenueData[0].totalLateFees + currentMonthRevenueData[0].totalDamageFees
      : 0;
      
    const lastMonthRentalRevenue = lastMonthRevenueData.length > 0 
      ? lastMonthRevenueData[0].totalRevenue + lastMonthRevenueData[0].totalLateFees + lastMonthRevenueData[0].totalDamageFees
      : 0;
      
    const currentMonthRevenue = currentMonthRentalRevenue;
    const lastMonthRevenue = lastMonthRentalRevenue;
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : currentMonthRevenue > 0 ? 100 : 0;
    
    // Get fleet utilization
    const availableCars = await Car.countDocuments({ availability: 'available' });
    const fleetUtilization = totalCars > 0 ? ((totalCars - availableCars) / totalCars * 100).toFixed(1) : 0;
    
    // Get recent activity (last 5 bookings)
    const recentBookings = await Booking.find()
      .populate('user', 'profile.firstName profile.lastName email')
      .populate('car', 'make model year')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('startDate endDate status totalPrice createdAt');
    
    // Get upcoming bookings (next 5)
    const upcomingBookings = await Booking.find({
      startDate: { $gte: new Date() },
      status: { $in: ['confirmed', 'pending'] }
    })
      .populate('user', 'profile.firstName profile.lastName email')
      .populate('car', 'make model year')
      .sort({ startDate: 1 })
      .limit(5)
      .select('startDate endDate status totalPrice location');
    
    res.json({
      stats: {
        totalCars,
        totalUsers,
        totalBookings,
        totalRentals,
        activeRentals,
        overdueRentals,
        pendingBookings,
        totalRevenue: revenue.totalRevenue + revenue.totalLateFees + revenue.totalDamageFees,
        fleetUtilization: parseFloat(fleetUtilization),
        // Growth data
        userGrowth: parseFloat(userGrowth),
        bookingGrowth: parseFloat(bookingGrowth),
        rentalGrowth: parseFloat(rentalGrowth),
        revenueGrowth: parseFloat(revenueGrowth)
      },
      recentActivity: recentBookings,
      upcomingBookings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
};

// Get activity feed
exports.getActivityFeed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get recent bookings
    const recentBookings = await Booking.find()
      .populate('user', 'profile.firstName profile.lastName email')
      .populate('car', 'make model year')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('startDate endDate status totalPrice createdAt');
    
    // Get recent rentals
    const recentRentals = await Rental.find()
      .populate('user', 'profile.firstName profile.lastName email')
      .populate('car', 'make model year')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('rentalStatus checkOutDate checkInDate totalRentalFee createdAt');
    
    // Combine and sort by date
    const activity = [
      ...recentBookings.map(booking => ({
        type: 'booking',
        id: booking._id,
        user: booking.user,
        car: booking.car,
        status: booking.status,
        amount: booking.totalPrice,
        date: booking.createdAt,
        details: {
          startDate: booking.startDate,
          endDate: booking.endDate
        }
      })),
      ...recentRentals.map(rental => ({
        type: 'rental',
        id: rental._id,
        user: rental.user,
        car: rental.car,
        status: rental.rentalStatus,
        amount: rental.totalRentalFee,
        date: rental.createdAt,
        details: {
          checkOutDate: rental.checkOutDate,
          checkInDate: rental.checkInDate
        }
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
    
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity feed', error: error.message });
  }
};

// Get comprehensive reports
exports.getReports = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    let reportData = {};
    
    switch (type) {
      case 'revenue':
        // Revenue trends by month
        const revenueByMonth = await Rental.aggregate([
          { $match: { rentalStatus: 'completed', ...dateFilter } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              revenue: { $sum: '$totalRentalFee' },
              lateFees: { $sum: '$lateFee' },
              damageFees: { $sum: '$damageFee' },
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              month: {
                $concat: [
                  { $toString: '$_id.year' },
                  '-',
                  { $cond: [
                    { $lt: ['$_id.month', 10] },
                    { $concat: ['0', { $toString: '$_id.month' }] },
                    { $toString: '$_id.month' }
                  ]}
                ]
              },
              revenue: 1,
              lateFees: 1,
              damageFees: 1,
              totalRevenue: { $add: ['$revenue', '$lateFees', '$damageFees'] },
              count: 1
            }
          },
          { $sort: { month: 1 } }
        ]);
        
        reportData = { revenueByMonth };
        break;
        
      case 'fleet':
        // Fleet utilization and status
        const fleetStatus = await Car.aggregate([
          {
            $group: {
              _id: '$availability',
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              status: '$_id',
              count: 1,
              _id: 0
            }
          }
        ]);
        
        // Top performing cars
        const topCars = await Rental.aggregate([
          { $match: { rentalStatus: 'completed', ...dateFilter } },
          {
            $group: {
              _id: '$car',
              totalRevenue: { $sum: '$totalRentalFee' },
              rentalCount: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'cars',
              localField: '_id',
              foreignField: '_id',
              as: 'carDetails'
            }
          },
          { $unwind: '$carDetails' },
          {
            $project: {
              _id: 0,
              car: {
                id: '$_id',
                make: '$carDetails.make',
                model: '$carDetails.model',
                year: '$carDetails.year'
              },
              totalRevenue: 1,
              rentalCount: 1
            }
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 }
        ]);
        
        reportData = { fleetStatus, topCars };
        break;
        
      case 'bookingStatus':
        // Booking status distribution
        const bookingStatusDist = await Booking.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              status: '$_id',
              count: 1,
              _id: 0
            }
          }
        ]);
        
        reportData = { bookingStatusDist };
        break;
        
      default:
        // Return all report types
        const [revenue, fleet, bookings] = await Promise.all([
          this.getReports({ query: { type: 'revenue', startDate, endDate } }),
          this.getReports({ query: { type: 'fleet', startDate, endDate } }),
          this.getReports({ query: { type: 'bookingStatus', startDate, endDate } })
        ]);
        
        reportData = {
          revenue: revenue.data,
          fleet: fleet.data,
          bookings: bookings.data
        };
    }
    
    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: 'Error generating reports', error: error.message });
  }
};

// Get all users with booking and rental counts
exports.getAllUsers = async (req, res) => {
  try {
    // Get all users
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    // Get booking counts for each user
    const bookingCounts = await Booking.aggregate([
      {
        $group: {
          _id: '$user',
          bookingCount: { $sum: 1 }
        }
      }
    ]);

    // Get rental counts for each user
    const rentalCounts = await Rental.aggregate([
      {
        $group: {
          _id: '$user',
          rentalCount: { $sum: 1 }
        }
      }
    ]);

    // Create lookup maps for counts
    const bookingCountMap = {};
    const rentalCountMap = {};

    bookingCounts.forEach(item => {
      bookingCountMap[item._id] = item.bookingCount;
    });

    rentalCounts.forEach(item => {
      rentalCountMap[item._id] = item.rentalCount;
    });

    // Add counts to user objects
    const usersWithCounts = users.map(user => ({
      ...user.toObject(),
      bookingCount: bookingCountMap[user._id] || 0,
      rentalCount: rentalCountMap[user._id] || 0
    }));

    res.json({
      success: true,
      users: usersWithCounts,
      total: usersWithCounts.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users', 
      error: error.message 
    });
  }
};
