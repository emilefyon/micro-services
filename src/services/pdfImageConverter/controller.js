const { fromBuffer } = require('pdf2pic');
const sharp = require('sharp');
const archiver = require('archiver');
const { Readable } = require('stream');
const { logger } = require('../../utils/logger');

const getImageOptions = (format) => {
  const baseOptions = {
    density: 300,
    quality: 100,
    preserveAspectRatio: true,
    format: format === 'tifflzw' ? 'tiff' : format.replace(/png.*/, 'png')
  };

  switch (format) {
    case 'pnggray':
      return { ...baseOptions, grayscale: true };
    case 'png256':
      return { ...baseOptions, colors: 256 };
    case 'png16':
      return { ...baseOptions, colors: 16 };
    default:
      return baseOptions;
  }
};

const processImage = async (imageBuffer, format) => {
  let sharpInstance = sharp(imageBuffer);

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
      archive.append(image, { name: `page-${index + 1}.png` });
    });

    archive.finalize();
  });
};

const convertPdfToImage = async (file, params) => {
  try {
    const { startPage, endPage, singleFile, outputFormat } = params;
    
    const options = getImageOptions(outputFormat);
    const converter = fromBuffer(file.buffer, options);
    
    // Convert pages to images
    const pagePromises = [];
    const start = Math.max(1, startPage + 1); // pdf2pic uses 1-based indexing
    const end = endPage === 0 ? -1 : endPage + 1;
    
    if (end !== -1 && start > end) {
      throw new Error('Invalid page range');
    }

    logger.info(`Converting PDF pages ${start} to ${end} to ${outputFormat} format`);
    
    if (end === -1) {
      // Convert all pages
      pagePromises.push(converter.bulk(-1));
    } else {
      // Convert specific range
      for (let i = start; i <= end; i++) {
        pagePromises.push(converter.convertToImage(i));
      }
    }

    const convertedPages = await Promise.all(pagePromises);
    const images = await Promise.all(
      convertedPages.flat().map(page => processImage(page.base64, outputFormat))
    );

    if (singleFile && images.length > 0) {
      // Combine all pages vertically
      const dimensions = await Promise.all(
        images.map(img => sharp(img).metadata())
      );

      const totalHeight = dimensions.reduce((sum, dim) => sum + dim.height, 0);
      const width = dimensions[0].width;

      return await sharp({
        create: {
          width,
          height: totalHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite(images.map((img, i) => ({
        input: img,
        top: dimensions.slice(0, i).reduce((sum, dim) => sum + dim.height, 0),
        left: 0
      })))
      .toFormat(outputFormat === 'tifflzw' ? 'tiff' : outputFormat.replace(/png.*/, 'png'))
      .toBuffer();
    } else {
      // Return zip archive for multiple pages
      return await createZipArchive(images);
    }
  } catch (error) {
    logger.error('PDF conversion error:', error);
    throw error;
  }
};

module.exports = {
  convertPdfToImage
};