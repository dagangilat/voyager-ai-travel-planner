const { auth } = require('./admin');

/**
 * Verify Firebase Auth token from request headers
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Decoded token with user info
 * @throws {Error} If token is invalid or missing
 */
async function verifyAuthToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization header');
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

module.exports = {
  verifyAuthToken
};
