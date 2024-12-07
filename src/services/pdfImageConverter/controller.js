const gm = require('gm').subClass({ imageMagick: true });
const archiver = require('archiver');
const { logger } = require('../../utils/logger');
const { getPdfInfo } = require('./utils/pdfInfo');
const { calculatePageRange } = require('./utils/pageRange');
const { getImageOptions } = require('./utils/imageOptions');
const { convertPage, gmToBuffer } = require('./utils/gmWrapper');

/**
 * Create a ZIP archive containing multiple images
 * @param {Array<{buffer: Buffer, format: string}>} images - Array of image buffers and formats
 * @returns {Promise<Buffer>} ZIP archive buffer
 */
const createZipArchive = async (images) => {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const chunks = [];
    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', err => reject(err));

    images.forEach((image, index) => {
      archive.append(image.buffer, { 
        name: `page-${index + 1}.${image.format.toLowerCase()}`
      });
    });

    archive.finalize();
  });
};

/**
 * Convert PDF pages to images
 * @param {Object} file - Uploaded PDF file
 * @param {Object} params - Conversion parameters
 * @returns {Promise<Buffer>} Converted image(s) as single image or ZIP archive
 */
const convertPdfToImage = async (file, params) => {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file input');
    }

    const { startPage, endPage, singleFile, outputFormat, dpi, quality, backgroundColor } = params;
    
    // Get PDF information
    const pdfInfo = await getPdfInfo(file.buffer);
    logger.info(`Processing PDF with ${pdfInfo.numberOfPages} pages`);

    // Calculate page range
    const { start, end } = calculatePageRange(startPage, endPage, pdfInfo.numberOfPages);
    
    // Get format-specific options
    const imageOptions = {
      ...getImageOptions(outputFormat, quality, backgroundColor),
      dpi
    };

    // Convert pages
    const pagePromises = [];
    for (let i = start; i <= end; i++) {
      pagePromises.push(convertPage(file.buffer, i, imageOptions));
    }

    const convertedPages = await Promise.all(pagePromises);
    
    if (!convertedPages || convertedPages.length === 0) {
      throw new Error('No pages were converted');
    }

    if (singleFile && convertedPages.length > 0) {
      // For single file output, combine all pages vertically
      const combinedGm = gm(convertedPages[0]);
      for (let i = 1; i < convertedPages.length; i++) {
        combinedGm.append(convertedPages[i]);
      }
      
      // Apply final format settings
      if (imageOptions.additionalOptions) {
        imageOptions.additionalOptions.forEach(option => {
          combinedGm.out(...(Array.isArray(option) ? option : [option]));
        });
      }
      
      combinedGm.setFormat(imageOptions.format);
      return await gmToBuffer(combinedGm);
    } else {
      // Return zip archive for multiple pages
      return await createZipArchive(
        convertedPages.map(buffer => ({
          buffer,
          format: imageOptions.format
        }))
      );
    }
  } catch (error) {
    logger.error('PDF conversion error:', error);
    throw error;
  }
};

module.exports = {
  convertPdfToImage
};