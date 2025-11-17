const Favorite = require('../models/Favorite');
const Car = require('../models/Car');

// Get all favorites for a user
exports.getUserFavorites = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    const favorites = await Favorite.find({ user: userId })
      .populate({
        path: 'car',
        select: 'make model year pricePerDay imageUrls availability location category transmission fuelType seats'
      })
      .sort('-createdAt');

    // Filter out favorites where the car no longer exists
    const validFavorites = favorites.filter(fav => fav.car !== null);

    res.json(validFavorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Error fetching favorites', error: error.message });
  }
};

// Add a car to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const { carId, notes } = req.body;
    const userId = req.user.id;

    // Check if car exists
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ user: userId, car: carId });
    if (existingFavorite) {
      return res.status(400).json({ message: 'Car already in favorites' });
    }

    // Create new favorite
    const favorite = new Favorite({
      user: userId,
      car: carId,
      notes: notes || ''
    });

    await favorite.save();

    // Populate car details before sending response
    await favorite.populate('car', 'make model year pricePerDay imageUrls availability location category');

    res.status(201).json({ message: 'Added to favorites', favorite });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ message: 'Error adding to favorites', error: error.message });
  }
};

// Remove a car from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user.id;

    const result = await Favorite.findOneAndDelete({ user: userId, car: carId });
    
    if (!result) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ message: 'Error removing from favorites', error: error.message });
  }
};

// Update favorite notes
exports.updateFavoriteNotes = async (req, res) => {
  try {
    const { carId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const favorite = await Favorite.findOneAndUpdate(
      { user: userId, car: carId },
      { notes },
      { new: true }
    ).populate('car', 'make model year pricePerDay imageUrls');

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    res.json({ message: 'Notes updated', favorite });
  } catch (error) {
    console.error('Error updating favorite notes:', error);
    res.status(500).json({ message: 'Error updating notes', error: error.message });
  }
};

// Check if a car is favorited by user
exports.checkFavoriteStatus = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({ user: userId, car: carId });
    
    res.json({ isFavorited: !!favorite });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ message: 'Error checking favorite status', error: error.message });
  }
};

// Get favorite count for a car (admin analytics)
exports.getCarFavoriteCount = async (req, res) => {
  try {
    const { carId } = req.params;
    
    const count = await Favorite.countDocuments({ car: carId });
    
    res.json({ carId, favoriteCount: count });
  } catch (error) {
    console.error('Error getting favorite count:', error);
    res.status(500).json({ message: 'Error getting favorite count', error: error.message });
  }
};
