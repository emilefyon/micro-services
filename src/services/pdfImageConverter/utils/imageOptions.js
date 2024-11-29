/**
 * Get format-specific image options for GraphicsMagick
 * @param {string} format - Output format (tifflzw, jpeg, pnggray, png256, png16, png16m)
 * @param {number} quality - Image quality (1-100, for JPEG)
 * @returns {Object} Format-specific options
 */
const getImageOptions = (format, quality) => {
    const options = {
      format: 'PNG',
      quality: quality,
      additionalOptions: []
    };
  
    switch (format) {
      case 'tifflzw':
        options.format = 'TIFF';
        options.additionalOptions.push('-compress', 'LZW');
        break;
      case 'jpeg':
        options.format = 'JPEG';
        options.additionalOptions.push('-quality', quality.toString());
        break;
      case 'pnggray':
        options.format = 'PNG';
        options.additionalOptions.push('-type', 'Grayscale');
        break;
      case 'png256':
        options.format = 'PNG';
        options.additionalOptions.push('-colors', '256');
        break;
      case 'png16':
        options.format = 'PNG';
        options.additionalOptions.push('-colors', '16');
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