const Car = require('../models/Car');
const { deleteFile } = require('../config/uploadConfig');

// Get all cars with pagination and filtering
const getCars = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    // Specific field filters (only when not searching)
    if (!req.query.search) {
      if (req.query.make) filter.make = req.query.make;
      if (req.query.model) filter.model = req.query.model;
      if (req.query.year) filter.year = req.query.year;
    }
    
    // Always apply these filters
    if (req.query.availability) filter.availability = req.query.availability;
    if (req.query.location) filter.location = req.query.location;
    
    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i'); // Case-insensitive search
      const searchOrConditions = [
        { make: searchRegex },
        { model: searchRegex },
        { description: searchRegex }
      ];
      
      // Only search year if the search term is numeric
      const yearSearch = parseInt(req.query.search);
      if (!isNaN(yearSearch)) {
        searchOrConditions.push({ year: yearSearch });
      }
      
      filter.$or = searchOrConditions;
    }
    
    // Sorting options
    const sortOptions = {};
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      sortOptions[req.query.sortBy] = sortOrder;
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }
    
    const cars = await Car.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
      
    const total = await Car.countDocuments(filter);
    
    res.json({
      cars,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error in getCars:', err);
    console.error('Query parameters:', req.query);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get car by ID
const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json(car);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create a new car
const createCar = async (req, res) => {
  try {
    // Parse geolocation if it's a JSON string
    if (req.body.geolocation && typeof req.body.geolocation === 'string') {
      try {
        req.body.geolocation = JSON.parse(req.body.geolocation);
      } catch (e) {
        console.error('Error parsing geolocation:', e);
        delete req.body.geolocation;
      }
    }
    
    // Handle image uploads (Cloudinary or local storage)
    if (req.files && req.files.length > 0) {
      req.body.imageUrls = req.files.map(file => file.path);
    }
    
    const car = new Car(req.body);
    await car.save();

    res.status(201).json(car);
  } catch (err) {
    console.error('Error creating car:', err);
    res.status(400).json({ message: 'Invalid car data', error: err.message });
  }
};

// Update a car
const updateCar = async (req, res) => {
  try {
    // Get the current car to check for images to delete
    const currentCar = await Car.findById(req.params.id);
    if (!currentCar) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    // Prepare update data
    const updateData = { ...req.body };
    
    // Parse geolocation if it's a JSON string
    if (updateData.geolocation && typeof updateData.geolocation === 'string') {
      try {
        updateData.geolocation = JSON.parse(updateData.geolocation);
      } catch (e) {
        console.error('Error parsing geolocation:', e);
        delete updateData.geolocation;
      }
    }
    
    // Handle specifications field - ensure it's an object, not an array
    if (updateData.specifications) {
      if (Array.isArray(updateData.specifications)) {
        // If it's an array, convert to empty object or skip
        delete updateData.specifications;
      } else if (typeof updateData.specifications === 'string') {
        // If it's a string, try to parse it
        try {
          updateData.specifications = JSON.parse(updateData.specifications);
        } catch (e) {
          delete updateData.specifications;
        }
      }
    }
    
    // Handle existing images from the form
    let existingImages = [];
    if (req.body.existingImages) {
      existingImages = Array.isArray(req.body.existingImages) 
        ? req.body.existingImages 
        : [req.body.existingImages];
    }
    
    // Find images to delete
    const imagesToDelete = currentCar.imageUrls.filter(
      url => !existingImages.includes(url)
    );
    
    // Delete removed images
    for (const imageUrl of imagesToDelete) {
      await deleteFile(imageUrl);
    }
    
    // Handle new uploaded images
    let newImages = [];
    if (req.files && req.files.length > 0) {
      newImages = req.files.map(file => file.path);
    }
    
    // Combine existing and new images
    const allImages = [...existingImages, ...newImages];
    
    // Update imageUrls
    if (allImages.length > 0 || existingImages.length === 0) {
      updateData.imageUrls = allImages;
    }
    
    delete updateData.existingImages;
    
    const car = await Car.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    res.json(car);
  } catch (err) {
    console.error('Error updating car:', err);
    res.status(400).json({ message: 'Invalid car data', error: err.message });
  }
};

// Delete a car
const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    // Delete all car images
    if (car.imageUrls && car.imageUrls.length > 0) {
      for (const imageUrl of car.imageUrls) {
        await deleteFile(imageUrl);
      }
    }
    
    // Delete the car from database
    await car.deleteOne();
    
    res.json({ message: 'Car deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
};
