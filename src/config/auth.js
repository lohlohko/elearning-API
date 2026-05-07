const readSecret = (envName, devFallback) => {
  if (process.env[envName]) {
    return process.env[envName];
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${envName}`);
  }

  return devFallback;
};

module.exports = {
  ACCESS_TOKEN_SECRET: readSecret('ACCESS_TOKEN_SECRET', 'dev_access_secret_change_me'),
  REFRESH_TOKEN_SECRET: readSecret('REFRESH_TOKEN_SECRET', 'dev_refresh_secret_change_me'),
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '1h',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '15d',
};
