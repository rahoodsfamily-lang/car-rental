const express = require('express');
const router = express.Router();
const {
  getCarReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  reportReview,
  getEligibleCarsForReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/cars/:carId', getCarReviews); // Get all reviews for a car

// Protected routes (require authentication)
router.use(protect); // All routes below require authentication

router.get('/eligible-cars', getEligibleCarsForReview); // Get cars user can review
router.post('/cars/:carId', createReview); // Create a review for a car
router.put('/:reviewId', updateReview); // Update user's own review
router.delete('/:reviewId', deleteReview); // Delete review (own or admin)
router.post('/:reviewId/helpful', markReviewHelpful); // Mark review as helpful
router.post('/:reviewId/report', reportReview); // Report a review

module.exports = router;
