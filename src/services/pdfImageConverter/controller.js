const archiver = require('archiver');
const { logger } = require('../../utils/logger');
const { getPdfInfo } = require('./utils/pdfInfo');
const { calculatePageRange } = require('./utils/pageRange');
const { getImageOptions } = require('./utils/imageOptions');
const { convertPageToImage, combineImages } = require('./utils/sharpWrapper');
const { PDFDocument } = require('pdf-lib');

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
    const imageOptions = getImageOptions(outputFormat, quality, backgroundColor);
    imageOptions.dpi = dpi;

    // Extract pages from PDF
    const pdfDoc = await PDFDocument.load(file.buffer);
    const pages = [];
    
    for (let i = start; i <= end; i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);
      pages.push(await newPdf.save());
    }

    // Convert pages
    const convertedPages = await Promise.all(
      pages.map(pageBuffer => convertPageToImage(pageBuffer, imageOptions))
    );

    if (!convertedPages || convertedPages.length === 0) {
      throw new Error('No pages were converted');
    }

    if (singleFile && convertedPages.length > 0) {
      return await combineImages(convertedPages, imageOptions);
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