const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const { logger } = require('../../utils/logger');

const renderPageToImage = async (page, format) => {
  // Get page dimensions
  const { width, height } = page.getSize();
  
  // Convert PDF page to PNG (pdf-lib doesn't support direct rendering,
  // in a production environment you'd want to use a PDF rendering library like pdf2pic)
  const scale = 2; // Increase resolution
  const pngImage = await page.render({
    width: width * scale,
    height: height * scale,
  }).toBuffer();

  // Process the image according to the requested format
  let sharpInstance = sharp(pngImage);

  switch (format) {
    case 'tifflzw':
      return sharpInstance.tiff({ compression: 'lzw' }).toBuffer();
    case 'jpeg':
      return sharpInstance.jpeg({ quality: 90 }).toBuffer();
    case 'pnggray':
      return sharpInstance.grayscale().png().toBuffer();
    case 'png256':
      return sharpInstance.png({ palette: true }).toBuffer();
    case 'png16':
      return sharpInstance.png({ palette: true, colors: 16 }).toBuffer();
    case 'png16m':
      return sharpInstance.png().toBuffer();
    default:
      return sharpInstance.png().toBuffer();
  }
};

const convertPdfToImage = async (file, params) => {
  try {
    const { startPage, endPage, singleFile, outputFormat } = params;
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(file.buffer);
    const pageCount = pdfDoc.getPageCount();
    
    // Validate page range
    const start = Math.max(0, startPage);
    const end = endPage === 0 ? pageCount - 1 : Math.min(endPage, pageCount - 1);
    
    if (start > end) {
      throw new Error('Invalid page range');
    }

    logger.info(`Converting PDF pages ${start} to ${end} to ${outputFormat} format`);
    
    // Convert pages to images
    const pages = [];
    for (let i = start; i <= end; i++) {
      const page = pdfDoc.getPage(i);
      const pageImage = await renderPageToImage(page, outputFormat);
      pages.push(pageImage);
    }

    if (singleFile && pages.length > 0) {
      // Combine all pages vertically into a single image
      return await sharp({
        create: {
          width: pages[0].width,
          height: pages.reduce((total, page) => total + page.height, 0),
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite(pages.map((page, index) => ({
        input: page,
        top: index * page.height,
        left: 0
      })))
      .toFormat(outputFormat === 'tifflzw' ? 'tiff' : outputFormat.replace(/png.*/, 'png'))
      .toBuffer();
    } else {
      // Return array of page images
      return pages;
    }
  } catch (error) {
    logger.error('PDF conversion error:', error);
    throw error;
  }
};

module.exports = {
  convertPdfToImage
};