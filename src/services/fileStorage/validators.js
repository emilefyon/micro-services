const Joi = require('joi');
const config = require('./config');

const uploadSchema = Joi.object({
  file: Joi.any().required()
}).unknown(true);

const validateUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  if (!config.storage.allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'File type not allowed',
      allowedTypes: config.storage.allowedMimeTypes
    });
  }

  if (req.file.size > config.storage.maxFileSize) {
    return res.status(400).json({ 
      error: 'File too large',
      maxSize: config.storage.maxFileSize
    });
  }

  next();
};

module.exports = {
  validateUpload
};