const Joi = require('joi');
const { logger } = require('../../utils/logger');

const convertParamsSchema = Joi.object({
  startPage: Joi.number().min(0).default(0),
  endPage: Joi.number().min(0).default(0),
  singleFile: Joi.boolean().default(true),
  outputFormat: Joi.string()
    .valid('tifflzw', 'jpeg', 'pnggray', 'png256', 'png16', 'png16m')
    .default('png16m')
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