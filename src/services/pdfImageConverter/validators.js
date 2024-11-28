const Joi = require('joi');
const { logger } = require('../../utils/logger');

const convertParamsSchema = Joi.object({
  startPage: Joi.number().min(0).default(0)
    .description('First page to convert (0-based index). Default is 0 (first page)'),
  endPage: Joi.number().min(0).default(0)
    .description('Last page to convert (0-based index). Default is 0 (converts until last page)'),
  singleFile: Joi.boolean().default(true)
    .description('If true, combines all pages into a single image. If false, returns a zip file with separate images'),
  outputFormat: Joi.string()
    .valid('tifflzw', 'jpeg', 'pnggray', 'png256', 'png16', 'png16m')
    .default('png16m')
    .description('Image output format:\n' +
      '- tifflzw: TIFF with LZW compression (best for documents)\n' +
      '- jpeg: JPEG format with configurable quality (best for photos)\n' +
      '- pnggray: PNG grayscale 8-bit (best for black and white)\n' +
      '- png256: PNG with 256 colors (good balance of quality and size)\n' +
      '- png16: PNG with 16 colors (smallest file size)\n' +
      '- png16m: PNG with millions of colors (best quality)'),
  dpi: Joi.number().min(72).max(600).default(150)
    .description('Resolution in dots per inch. Higher values mean better quality but larger files. Default is 150'),
  quality: Joi.number().min(1).max(100).default(90)
    .description('Image quality for JPEG format. Higher values mean better quality but larger files. Default is 90')
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