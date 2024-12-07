const sharp = require('sharp');
const { logger } = require('../../../utils/logger');

/**
 * Convert a single PDF page to image using Sharp
 * @param {Buffer} pdfBuffer - PDF page buffer
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} Converted image buffer
 */
const convertPageToImage = async (pdfBuffer, options) => {
  try {
    const sharpInstance = sharp(pdfBuffer, { density: options.dpi })
      .flatten({ background: options.backgroundColor });

    // Apply format-specific options
    switch (options.format.toLowerCase()) {
      case 'jpeg':
        sharpInstance.jpeg({ quality: options.quality });
        break;
      case 'png':
        if (options.colors) {
          sharpInstance.png({ palette: true, colors: options.colors });
        } else {
          sharpInstance.png();
        }
        break;
      case 'tiff':
        sharpInstance.tiff({ compression: 'lzw' });
        break;
    }

    return await sharpInstance.toBuffer();
  } catch (error) {
    logger.error('Sharp conversion error:', error);
    throw new Error(`Image conversion failed: ${error.message}`);
  }
};

/**
 * Combine multiple images into a single vertical image
 * @param {Array<Buffer>} imageBuffers - Array of image buffers to combine
 * @param {Object} options - Image options including backgroundColor
 * @returns {Promise<Buffer>} Combined image buffer
 */
const combineImages = async (imageBuffers, options) => {
  try {
    // Get metadata for all images
    const metadata = await Promise.all(
      imageBuffers.map(buffer => sharp(buffer).metadata())
    );

    // Calculate dimensions
    const totalHeight = metadata.reduce((sum, meta) => sum + meta.height, 0);
    const maxWidth = Math.max(...metadata.map(meta => meta.width));

    // Prepare composite input
    const compositeInput = [];
    let yOffset = 0;

    for (let i = 0; i < imageBuffers.length; i++) {
      compositeInput.push({
        input: imageBuffers[i],
        top: yOffset,
        left: 0,
      });
      yOffset += metadata[i].height;
    }

    // Create combined image
    const sharpInstance = sharp({
      create: {
        width: maxWidth,
        height: totalHeight,
        channels: 4,
        background: options.backgroundColor
      }
    })
    .composite(compositeInput);

    // Apply format settings
    switch (options.format.toLowerCase()) {
      case 'jpeg':
        sharpInstance.jpeg({ quality: options.quality });
        break;
      case 'png':
        if (options.colors) {
          sharpInstance.png({ palette: true, colors: options.colors });
        } else {
          sharpInstance.png();
        }
        break;
      case 'tiff':
        sharpInstance.tiff({ compression: 'lzw' });
        break;
    }

    return await sharpInstance.toBuffer();
  } catch (error) {
    logger.error('Image combination error:', error);
    throw new Error(`Failed to combine images: ${error.message}`);
  }
};

module.exports = {
  convertPageToImage,
  combineImages
};