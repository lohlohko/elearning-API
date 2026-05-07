const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const accountService = require('../services/account.service');
const response = require('../utils/response');
const { buildAuthPayload, mapAuthUser } = require('../utils/authAccount');
const {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} = require('../config/auth');

const signAccessToken = (payload) => jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
const signRefreshToken = (payload) => jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

const isProduction = process.env.NODE_ENV === 'production';

const toBool = (value) => String(value).toLowerCase() === 'true';
const configuredSameSite = String(process.env.COOKIE_SAMESITE || '').trim().toLowerCase();
const cookieSameSite = configuredSameSite || (isProduction ? 'none' : 'lax');

let cookieSecure = process.env.COOKIE_SECURE === undefined
  ? isProduction
  : toBool(process.env.COOKIE_SECURE);

// Browsers require Secure when SameSite=None.
if (cookieSameSite === 'none' && !cookieSecure) {
  cookieSecure = true;
}

const refreshCookieOptions = {
  httpOnly: true,
  sameSite: cookieSameSite,
  secure: cookieSecure,
  path: process.env.COOKIE_PATH || '/api/auth',
};

if (process.env.COOKIE_DOMAIN) {
  refreshCookieOptions.domain = process.env.COOKIE_DOMAIN;
}

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const normalizedUsername = String(username || '').trim();

    if (!normalizedUsername) {
      return response.badRequest(res, 'username is required', {
        username: 'username is required',
      });
    }

    if (!password || !String(password).trim()) {
      return response.badRequest(res, 'Password is required', {
        password: 'password is required',
      });
    }

    const account = await accountService.findByUsername(normalizedUsername);
    if (!account) {
      return response.unauthorized(res, 'Username Tidak Terdaftar');
    }

    let validPassword = false;
    const storedPassword = account.password || '';

    if (!storedPassword) {
      return response.unauthorized(res, 'Password Tidak Ditemukan untuk Akun Ini');
    }

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
      validPassword = await bcrypt.compare(password, storedPassword);
    } else {
      validPassword = password === storedPassword;
      if (validPassword) {
        const hashed = await bcrypt.hash(password, 10);
        await accountService.updatePasswordHash(account.id, hashed);
      }
    }

    if (!validPassword) {
      return response.unauthorized(res, 'Password Salah');
    }

    const payload = buildAuthPayload(account);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('refresh_token', refreshToken, refreshCookieOptions);

    return response.ok(res, 'Login successful', {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
      user: mapAuthUser(account),
    });
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const refresh = async (req, res) => {
  try {
    const token = req.cookies ? req.cookies.refresh_token : null;
    if (!token) {
      return response.unauthorized(res, 'Refresh token is required');
    }

    let payload;
    try {
      payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (error) {
      return response.unauthorized(res, 'Invalid or expired refresh token');
    }

    const account = await accountService.findById(payload.account_id);
    if (!account) {
      return response.unauthorized(res, 'Account not found');
    }

    if (Number(payload.token_version) !== Number(account.token_version || 0)) {
      return response.unauthorized(res, 'Refresh token has been invalidated. Please login again');
    }

    const newPayload = buildAuthPayload(account);
    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    res.cookie('refresh_token', newRefreshToken, refreshCookieOptions);

    return response.ok(res, 'Token refreshed successfully', {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const logout = async (req, res) => {
  await accountService.incrementTokenVersion(req.auth.account_id);
  res.clearCookie('refresh_token', refreshCookieOptions);
  return response.ok(res, 'Logout successful');
};

const me = async (req, res) => {
  try {
    const account = await accountService.findById(req.auth.account_id);
    if (!account) {
      return response.notFound(res, 'Account not found');
    }

    const result = mapAuthUser(account);

    if (req.auth_source === 'refresh') {
      const payload = buildAuthPayload(account);
      result.access_token = signAccessToken(payload);
      result.token_type = 'Bearer';
      result.expires_in = ACCESS_TOKEN_EXPIRES_IN;
    }

    return response.ok(res, 'Current user retrieved successfully', result);
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  me,
};
