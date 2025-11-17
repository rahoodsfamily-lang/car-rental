/**
 * Image URL Helper
 * Handles both Cloudinary URLs and local storage paths
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/** 
 *  * Get the full image UR
 * Get the full image URL
 * - If URL starts with http/https (Cloudinary), return as-is
 * - If URL is a local path (uploads/...), prepend backend URL
 * 
 * @param {string} imagePath - Image path from database
 * @returns {string} - Full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return '/placeholder-car.jpg'; // Fallback placeholder
  }

  // If it's already a full URL (Cloudinary), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If it's a local path, prepend backend URL
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${API_URL}/${cleanPath}`;
};

/**
 * Get multiple image URLs
 * 
 * @param {string[]} imagePaths - Array of image paths
 * @returns {string[]} - Array of full image URLs
 */
export const getImageUrls = (imagePaths) => {
  if (!imagePaths || !Array.isArray(imagePaths)) {
    return [];
  }

  return imagePaths.map(path => getImageUrl(path));
};

/**
 * Check if image is from Cloudinary
 * 
 * @param {string} imagePath - Image path to check
 * @returns {boolean} - True if Cloudinary URL
 */
export const isCloudinaryImage = (imagePath) => {
  if (!imagePath) return false;
  return imagePath.includes('cloudinary.com');
};

/**
 * Check if image is from local storage
 * 
 * @param {string} imagePath - Image path to check
 * @returns {boolean} - True if local storage path
 */
export const isLocalImage = (imagePath) => {
  if (!imagePath) return false;
  return imagePath.startsWith('uploads/') || imagePath.startsWith('/uploads/');
};
