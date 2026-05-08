import { VIDEO_CONFIG } from '../config/constants.js';

/**
 * Validate video generation request input
 */
export function validateGenerateRequest(body) {
  const errors = [];

  // Validate images
  if (!body.images) {
    errors.push('Missing required field: images');
  } else if (!Array.isArray(body.images)) {
    errors.push('Field "images" must be an array');
  } else if (body.images.length !== VIDEO_CONFIG.IMAGE_COUNT) {
    errors.push(`Expected exactly ${VIDEO_CONFIG.IMAGE_COUNT} images, got ${body.images.length}`);
  } else {
    // Validate each image URL
    body.images.forEach((url, index) => {
      if (typeof url !== 'string' || !isValidUrl(url)) {
        errors.push(`Invalid image URL at index ${index}: ${url}`);
      }
    });
  }

  // Validate text
  if (!body.text) {
    errors.push('Missing required field: text');
  } else if (typeof body.text !== 'string') {
    errors.push('Field "text" must be a string');
  } else if (body.text.trim().length === 0) {
    errors.push('Field "text" cannot be empty');
  } else if (body.text.length > 5000) {
    errors.push('Field "text" exceeds maximum length of 5000 characters');
  }

  // Validate banner (optional)
  if (body.banner !== undefined && body.banner !== null && body.banner !== '') {
    if (typeof body.banner !== 'string') {
      errors.push('Field "banner" must be a string');
    } else if (body.banner.length > 200) {
      errors.push('Field "banner" exceeds maximum length of 200 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
