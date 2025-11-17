const mongoose = require('mongoose');
const Review = require('../models/Review');
const Rental = require('../models/Rental');
const Car = require('../models/Car');
const User = require('../models/User');

// Get all reviews for a specific car
const getCarReviews = async (req, res) => {
  try {
    const { carId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ 
      carId, 
      status: 'active' 
    })
      .populate('userId', 'name email profile')
      .populate('rentalId', 'checkOutDate checkInDate')
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip);

    const totalReviews = await Review.countDocuments({ carId, status: 'active' });
    const totalPages = Math.ceil(totalReviews / limit);

    // Calculate review statistics
    const reviewStats = await Review.aggregate([
      { $match: { carId: new mongoose.Types.ObjectId(carId), status: 'active' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    let stats = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (reviewStats.length > 0) {
      const { averageRating, totalReviews, ratingDistribution } = reviewStats[0];
      stats.averageRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal
      stats.totalReviews = totalReviews;
      
      // Count rating distribution
      ratingDistribution.forEach(rating => {
        stats.ratingDistribution[rating]++;
      });
    }

    res.json({
      reviews,
      stats,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalReviews,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching car reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};

// Create a new review
const createReview = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user.id;
    const { rentalId, rating, title, comment, pros, cons, wouldRecommend } = req.body;

    // Verify the rental exists and belongs to the user
    const rental = await Rental.findOne({
      _id: rentalId,
      user: userId,  // Changed from userId to user
      car: carId,    // Changed from carId to car
      rentalStatus: 'completed' // Only completed rentals can be reviewed
    });

    if (!rental) {
      return res.status(400).json({ 
        message: 'You can only review cars you have completed rentals for' 
      });
    }

    // Check if user has already reviewed this specific rental
    const existingReview = await Review.findOne({ userId, rentalId });
    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already reviewed this rental' 
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const review = new Review({
      userId,
      carId,
      rentalId,
      rating,
      title,
      comment,
      pros: pros || [],
      cons: cons || [],
      wouldRecommend: wouldRecommend !== undefined ? wouldRecommend : true
    });

    await review.save();

    // Update car's review statistics
    await updateCarReviewStats(carId);

    // Populate the review with user details
    await review.populate('userId', 'firstName lastName profilePicture');
    await review.populate('rentalId', 'checkOutDate checkInDate');

    res.status(201).json({
      message: 'Review created successfully',
      review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review', error: error.message });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { rating, title, comment, pros, cons, wouldRecommend } = req.body;

    const review = await Review.findOne({ _id: reviewId, userId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }

    // Update fields
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = rating;
    }
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    if (pros !== undefined) review.pros = pros;
    if (cons !== undefined) review.cons = cons;
    if (wouldRecommend !== undefined) review.wouldRecommend = wouldRecommend;

    await review.save();

    // Update car's review statistics
    await updateCarReviewStats(review.carId);

    // Populate the review with user details
    await review.populate('userId', 'firstName lastName profilePicture');
    await review.populate('rentalId', 'checkOutDate checkInDate');

    res.json({
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Failed to update review', error: error.message });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Users can delete their own reviews, admins can delete any review
    const query = userRole === 'admin' ? { _id: reviewId } : { _id: reviewId, userId };
    
    const review = await Review.findOneAndDelete(query);
    if (!review) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }

    // Update car's review statistics after deletion
    await updateCarReviewStats(review.carId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Failed to delete review', error: error.message });
  }
};

// Mark review as helpful
const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulVotes: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ 
      message: 'Review marked as helpful',
      helpfulVotes: review.helpfulVotes 
    });
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({ message: 'Failed to mark review as helpful', error: error.message });
  }
};

// Report a review
const reportReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { 
        $inc: { reportedCount: 1 },
        $set: { status: 'reported' }
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ message: 'Review reported successfully' });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ message: 'Failed to report review', error: error.message });
  }
};

// Get user's eligible cars for review (completed rentals without reviews)
const getEligibleCarsForReview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find completed rentals that don't have reviews yet
    const eligibleRentals = await Rental.find({
      user: userId,  // Changed from userId to user
      rentalStatus: 'completed'
    }).populate('car').populate('booking');  // Changed from carId to car

    // Filter out rentals that already have reviews (check by rentalId, not carId)
    const reviewedRentalIds = await Review.find({ userId }).distinct('rentalId');
    
    // Filter eligible rentals (no reviews yet for this specific rental)
    const eligibleRentalsFiltered = eligibleRentals.filter(rental => 
      !reviewedRentalIds.some(reviewedId => reviewedId.toString() === rental._id.toString())
    );

    // Return all eligible rentals (each rental can be reviewed separately)
    res.json(eligibleRentalsFiltered);
  } catch (error) {
    console.error('Error fetching eligible cars for review:', error);
    res.status(500).json({ message: 'Failed to fetch eligible cars', error: error.message });
  }
};

// Helper function to update car review statistics
const updateCarReviewStats = async (carId) => {
  try {
    const reviewStats = await Review.aggregate([
      { $match: { carId: new mongoose.Types.ObjectId(carId), status: 'active' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    let averageRating = 0;
    let reviewCount = 0;

    if (reviewStats.length > 0) {
      averageRating = Math.round(reviewStats[0].averageRating * 10) / 10; // Round to 1 decimal
      reviewCount = reviewStats[0].totalReviews;
    }

    await Car.findByIdAndUpdate(carId, {
      averageRating,
      reviewCount
    });
  } catch (error) {
    console.error('Error updating car review stats:', error);
  }
};

module.exports = {
  getCarReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  reportReview,
  getEligibleCarsForReview
};
