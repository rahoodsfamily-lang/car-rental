const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// User favorites management
router.get('/user/:userId?', favoriteController.getUserFavorites);
router.post('/add', favoriteController.addToFavorites);
router.delete('/remove/:carId', favoriteController.removeFromFavorites);
router.put('/notes/:carId', favoriteController.updateFavoriteNotes);
router.get('/check/:carId', favoriteController.checkFavoriteStatus);

// Analytics (could be admin-only)
router.get('/car-count/:carId', favoriteController.getCarFavoriteCount);

module.exports = router;
