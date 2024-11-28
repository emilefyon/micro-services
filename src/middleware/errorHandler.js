const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', err);

  if (err.status) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error'
  });
};

module.exports = {
  errorHandler
};