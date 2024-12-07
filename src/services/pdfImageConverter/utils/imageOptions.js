/**
 * Get format-specific image options for GraphicsMagick
 * @param {string} format - Output format (tifflzw, jpeg, pnggray, png256, png16, png16m)
 * @param {number} quality - Image quality (1-100, for JPEG)
 * @param {string} backgroundColor - Background color in hex format
 * @returns {Object} Format-specific options
 */
const getImageOptions = (format, quality, backgroundColor = '#FFFFFF') => {
  const options = {
    format: 'PNG',
    quality: quality,
    backgroundColor: backgroundColor || '#FFFFFF'
  };

  switch (format) {
    case 'tifflzw':
      options.format = 'TIFF';
      break;
    case 'jpeg':
      options.format = 'JPEG';
      break;
    case 'pnggray':
      options.format = 'PNG';
      options.grayscale = true;
      break;
    case 'png256':
      options.format = 'PNG';
      options.colors = 256;
      break;
    case 'png16':
      options.format = 'PNG';
      options.colors = 16;
      break;
    case 'png16m':
      options.format = 'PNG';
      break;
  }

  return options;
};

module.exports = {
  getImageOptions
};