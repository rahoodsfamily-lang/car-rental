const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Get upload strategy based on configuration
const getUploadStrategy = () => {
  if (isCloudinaryConfigured()) {
    return 'cloudinary';
  } else {
    return 'local';
  }
};

// Log upload strategy once when module loads
if (isCloudinaryConfigured()) {
  console.log('📦 Using Cloudinary for file uploads');
} else {
  console.log('💾 Using local storage for file uploads (Cloudinary not configured)');
}

// Create local storage configuration
const createLocalStorage = (folder = 'uploads') => {
  // Ensure upload directory exists
  const uploadDir = path.join(__dirname, '..', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
};

// Create Cloudinary storage configuration
const createCloudinaryStorage = (folder, allowedFormats = ['jpg', 'jpeg', 'png', 'webp']) => {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('cloudinary').v2;

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

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

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter for documents (images + PDFs)
const documentFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed'), false);
  }
};

// Create upload middleware based on strategy
const createUpload = (folder, options = {}) => {
  const strategy = getUploadStrategy();
  const {
    fileFilter = imageFilter,
    limits = { fileSize: 5 * 1024 * 1024 }, // 5MB default
    allowedFormats = ['jpg', 'jpeg', 'png', 'webp']
  } = options;

  let storage;
  
  if (strategy === 'cloudinary') {
    storage = createCloudinaryStorage(folder, allowedFormats);
  } else {
    storage = createLocalStorage('uploads');
  }

  return multer({
    storage,
    fileFilter,
    limits
  });
};

// Pre-configured upload instances
const uploadCarImage = createUpload('cars', {
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadProfilePicture = createUpload('profiles', {
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
});

const uploadVerificationDoc = createUpload('verifications', {
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'pdf']
});

// Helper function to delete files (works for both local and Cloudinary)
const deleteFile = async (filePath) => {
  const strategy = getUploadStrategy();
  
  if (strategy === 'cloudinary') {
    // Delete from Cloudinary
    const cloudinary = require('cloudinary').v2;
    
    // Extract public ID from Cloudinary URL
    const getPublicIdFromUrl = (url) => {
      if (!url) return null;
      const matches = url.match(/\/v\d+\/(.+)\./);
      if (matches && matches[1]) return matches[1];
      const altMatches = url.match(/upload\/(.+)\./);
      if (altMatches && altMatches[1]) return altMatches[1];
      return null;
    };

    const publicId = getPublicIdFromUrl(filePath);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error('❌ Error deleting from Cloudinary:', error);
      }
    }
  } else {
    // Delete from local storage
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      await fs.promises.unlink(fullPath);
    } catch (error) {
      console.error('❌ Error deleting local file:', error);
    }
  }
};

module.exports = {
  isCloudinaryConfigured,
  getUploadStrategy,
  uploadCarImage,
  uploadProfilePicture,
  uploadVerificationDoc,
  deleteFile,
  createUpload
};
