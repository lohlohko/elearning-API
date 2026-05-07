const { unauthorized, forbidden } = require('../utils/response');

const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const role = req.auth && req.auth.role ? String(req.auth.role).trim().toLowerCase() : '';

    if (!role) {
      return unauthorized(res, 'Role is missing in access token');
    }

    if (!allowedRoles.includes(role)) {
      return forbidden(res, `Role ${role} is not allowed to access this resource`);
    }

    req.userRole = role;
    next();
  };
};

module.exports = { requireRole };
