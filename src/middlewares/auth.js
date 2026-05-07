const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response');
const accountService = require('../services/account.service');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = require('../config/auth');

const validateTokenVersion = async (payload) => {
  const tokenVersion = await accountService.getTokenVersionByAccountId(payload.account_id);
  if (tokenVersion === null) {
    return { valid: false, message: 'Account not found' };
  }

  if (Number(payload.token_version) !== Number(tokenVersion)) {
    return { valid: false, message: 'Token has been invalidated. Please login again' };
  }

  return { valid: true, message: '' };
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Access token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);

    const tokenCheck = await validateTokenVersion(payload);
    if (!tokenCheck.valid) {
      return unauthorized(res, tokenCheck.message);
    }

    req.auth = payload;
    req.auth_source = 'access';
    return next();
  } catch (error) {
    return unauthorized(res, 'Invalid or expired access token');
  }
};

const authenticateAuthSession = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  let accessTokenError = null;

  if (accessToken) {
    try {
      const accessPayload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
      const tokenCheck = await validateTokenVersion(accessPayload);
      if (tokenCheck.valid) {
        req.auth = accessPayload;
        req.auth_source = 'access';
        return next();
      }

      accessTokenError = tokenCheck.message;
    } catch (error) {
      accessTokenError = 'Invalid or expired access token';
    }
  }

  const refreshToken = req.cookies ? req.cookies.refresh_token : null;
  if (!refreshToken) {
    return unauthorized(res, accessTokenError || 'Authentication is required');
  }

  try {
    const refreshPayload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const tokenCheck = await validateTokenVersion(refreshPayload);
    if (!tokenCheck.valid) {
      return unauthorized(res, tokenCheck.message);
    }

    req.auth = refreshPayload;
    req.auth_source = 'refresh';
    return next();
  } catch (error) {
    return unauthorized(res, 'Invalid or expired refresh token');
  }
};

module.exports = {
  authenticateToken,
  authenticateAuthSession,
};
