const gm = require('gm');
const archiver = require('archiver');
const { logger } = require('../../utils/logger');
const { calculatePageRange } = require('./utils/pageRange');
const { getImageOptions } = require('./utils/imageOptions');
const { getPdfInfo, convertPage, gmToBuffer } = require('./utils/gmWrapper');

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
    const { startPage, endPage, singleFile, outputFormat, dpi, quality } = params;
    
    // Get PDF information
    const pdfInfo = await getPdfInfo(file.buffer);
    logger.info(`Processing PDF with ${pdfInfo.numberOfPages} pages`);

    // Calculate page range
    const { start, end } = calculatePageRange(startPage, endPage, pdfInfo.numberOfPages);
    
    // Get format-specific options
    const imageOptions = {
      ...getImageOptions(outputFormat, quality),
      dpi
    };

    // Convert pages
    const pagePromises = [];
    for (let i = start; i <= end; i++) {
      pagePromises.push(convertPage(file.buffer, i, imageOptions));
    }

    const convertedPages = await Promise.all(pagePromises);
    
    if (singleFile && convertedPages.length > 0) {
      // For single file output, combine all pages vertically
      const combinedGm = gm(convertedPages[0]);
      for (let i = 1; i < convertedPages.length; i++) {
        combinedGm.append(convertedPages[i]);
      }
      
      // Apply final format settings
      imageOptions.additionalOptions.forEach(option => {
        combinedGm.out(option);
      });
      
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