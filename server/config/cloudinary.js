  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const multer = require('multer');

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // Create storage engines for different types of uploads
  const createStorage = (folder, allowedFormats = ['jpg', 'jpeg', 'png', 'webp']) => {
    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: `car-rental/${folder}`,
        allowed_formats: allowedFormats,
        transformation: folder === 'cars' 
          ? [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }]
          : folder === 'profiles'
          ? [{ width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto' }]
          : [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
        format: 'jpg'
      }
    });
  };

  // Storage for car images
  const carStorage = createStorage('cars');
  const uploadCarImage = multer({ 
    storage: carStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });

  // Storage for profile pictures
  const profileStorage = createStorage('profiles');
  const uploadProfilePicture = multer({ 
    storage: profileStorage,
    limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
  });

  // Storage for verification documents
  const verificationStorage = createStorage('verifications', ['jpg', 'jpeg', 'png', 'pdf']);
  const uploadVerificationDoc = multer({ 
    storage: verificationStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for documents
  });

  // Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  // Extract public ID from Cloudinary URL
  // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
  const matches = url.match(/\/v\d+\/(.+)\./);
  if (matches && matches[1]) {
    return matches[1];
  }
  
  // Try alternative format without version
  const altMatches = url.match(/upload\/(.+)\./);
  if (altMatches && altMatches[1]) {
    return altMatches[1];
  }
  
  return null;
};

// Helper function to optimize image URL
const getOptimizedImageUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary')) return url;
  
  const { width = 800, height = 600, quality = 'auto' } = options;
  
  // Add transformation parameters to URL
  const transformation = `w_${width},h_${height},c_limit,q_${quality}`;
  
  // Insert transformation into URL
  const urlParts = url.split('/upload/');
  if (urlParts.length === 2) {
    return `${urlParts[0]}/upload/${transformation}/${urlParts[1]}`;
  }
  
  return url;
};

module.exports = {
  cloudinary,
  uploadCarImage,
  uploadProfilePicture,
  uploadVerificationDoc,
  deleteImage,
  getPublicIdFromUrl,
  getOptimizedImageUrl
};
