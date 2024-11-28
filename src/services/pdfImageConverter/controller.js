const gm = require('gm');
const archiver = require('archiver');
const { promisify } = require('util');
const { logger } = require('../../utils/logger');

const gmToBuffer = (gmObject) => {
  return new Promise((resolve, reject) => {
    gmObject.toBuffer((err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
};

const getImageOptions = (format, quality) => {
  switch (format) {
    case 'tifflzw':
      return { format: 'TIFF', compression: 'LZW' };
    case 'jpeg':
      return { format: 'JPEG', quality };
    case 'pnggray':
      return { format: 'PNG', type: 'Grayscale' };
    case 'png256':
      return { format: 'PNG', colors: 256 };
    case 'png16':
      return { format: 'PNG', colors: 16 };
    case 'png16m':
      return { format: 'PNG' };
    default:
      return { format: 'PNG' };
  }
};

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
      archive.append(image.buffer, { name: `page-${index + 1}.${image.format.toLowerCase()}` });
    });

    archive.finalize();
  });
};

const convertPdfToImage = async (file, params) => {
  try {
    const { startPage, endPage, singleFile, outputFormat, dpi, quality } = params;
    const options = getImageOptions(outputFormat, quality);
    
    // Initialize GraphicsMagick with the PDF buffer
    let gmInstance = gm(file.buffer, 'input.pdf');
    
    // Get the total number of pages
    const identify = promisify(gmInstance.identify.bind(gmInstance));
    const info = await identify();
    const totalPages = info.numberOfPages || 1;
    
    // Calculate page range
    const start = Math.max(0, startPage);
    const end = endPage === 0 ? totalPages - 1 : Math.min(endPage, totalPages - 1);
    
    if (start > end) {
      throw new Error('Invalid page range');
    }

    logger.info(`Converting PDF pages ${start} to ${end} to ${outputFormat} format at ${dpi} DPI`);
    
    // Convert pages to images
    const pagePromises = [];
    for (let i = start; i <= end; i++) {
      let pageGm = gm(file.buffer, 'input.pdf')
        .selectFrame(i)
        .density(dpi, dpi);

      // Apply format-specific options
      if (options.format === 'TIFF') {
        pageGm = pageGm.compress(options.compression);
      } else if (options.format === 'JPEG') {
        pageGm = pageGm.quality(options.quality);
      }

      if (options.type === 'Grayscale') {
        pageGm = pageGm.type('Grayscale');
      }

      if (options.colors) {
        pageGm = pageGm.colors(options.colors);
      }

      pageGm = pageGm.setFormat(options.format);
      pagePromises.push(gmToBuffer(pageGm));
    }

    const images = await Promise.all(pagePromises);

    if (singleFile && images.length > 0) {
      // For single file output, append all images vertically
      const appendedGm = gm(images[0]);
      for (let i = 1; i < images.length; i++) {
        appendedGm.append(images[i]);
      }
      
      // Apply final format settings
      if (options.format === 'TIFF') {
        appendedGm.compress(options.compression);
      } else if (options.format === 'JPEG') {
        appendedGm.quality(options.quality);
      }
      
      return await gmToBuffer(appendedGm.setFormat(options.format));
    } else {
      // Return zip archive for multiple pages
      return await createZipArchive(images.map(img => ({
        buffer: img,
        format: options.format
      })));
    }
  } catch (error) {
    logger.error('PDF conversion error:', error);
    throw error;
  }
};

module.exports = {
  convertPdfToImage
};