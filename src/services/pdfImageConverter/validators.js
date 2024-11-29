const Joi = require('joi');
const { logger } = require('../../utils/logger');

const convertParamsSchema = Joi.object({
  startPage: Joi.number().min(0).default(0)
    .description(`First page to convert (0-based index).
      - Minimum: 0 (first page)
      - Default: 0
      - Example: 2 (starts from third page)`),
      
  endPage: Joi.number().min(0).default(0)
    .description(`Last page to convert.
      - 0 = convert until last page
      - Must be >= startPage
      - Default: 0 (all pages)
      - Example: 5 (converts up to page 6)`),
      
  singleFile: Joi.boolean().default(true)
    .description(`Output format control.
      - true = combines all pages into one vertical image
      - false = creates ZIP with separate image per page
      - Default: true
      - Best for: true when viewing, false for processing`),
      
  outputFormat: Joi.string()
    .valid('tifflzw', 'jpeg', 'pnggray', 'png256', 'png16', 'png16m')
    .default('png16m')
    .description(`Image output format:
      - tifflzw: TIFF with LZW compression
        Best for: Documents, line art
        Features: Lossless, good compression
        
      - jpeg: JPEG format with configurable quality
        Best for: Photos, complex images
        Features: Lossy, smaller file size
        
      - pnggray: PNG grayscale 8-bit
        Best for: Black & white documents
        Features: Lossless, reduced color depth
        
      - png256: PNG with 256 colors
        Best for: Screenshots, simple graphics
        Features: Lossless, balanced size/quality
        
      - png16: PNG with 16 colors
        Best for: Simple graphics, icons
        Features: Smallest file size
        
      - png16m: PNG with millions of colors
        Best for: High-quality preservation
        Features: Lossless, highest quality
        Default format`),
        
  dpi: Joi.number().min(72).max(600).default(150)
    .description(`Resolution in dots per inch.
      - Minimum: 72 (web quality)
      - Maximum: 600 (print quality)
      - Default: 150 (good balance)
      - Higher values = better quality but larger files
      - Recommended:
        * Web viewing: 72-150
        * Print preparation: 300-600`),
        
  quality: Joi.number().min(1).max(100).default(90)
    .description(`Image quality for JPEG format.
      - Range: 1-100
      - Default: 90
      - Higher values = better quality but larger files
      - Recommended:
        * High quality: 80-90
        * Medium quality: 60-75
        * Low quality: 30-50
      - Only affects JPEG output`)
});

const validateConvertParams = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'File must be a PDF' });
    }

    const { error, value } = convertParamsSchema.validate(req.body);
    
    if (error) {
      logger.warn('Validation error:', error.details);
      return res.status(400).json({ error: error.details[0].message });
    }

    req.body = value;
    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
};

module.exports = {
  validateConvertParams
};