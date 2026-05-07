const resolveAuthUsername = (account) => {
  if (account.username && String(account.username).trim()) {
    return String(account.username).trim();
  }

  if (account.npk !== undefined && account.npk !== null && String(account.npk).trim()) {
    return String(account.npk).trim();
  }

  if (account.name && String(account.name).trim()) {
    return String(account.name).trim();
  }

  return '';
};

const resolveAuthRole = (account) => account.role || null;

const resolveDisplayName = (account) => {
  if (account.user_name && String(account.user_name).trim()) {
    return String(account.user_name).trim();
  }

  if (account.name && String(account.name).trim()) {
    return String(account.name).trim();
  }

  return resolveAuthUsername(account);
};

const resolveDepartmentId = (account) => {
  if (account.department_id !== undefined && account.department_id !== null) {
    return account.department_id;
  }

  if (account.sub_department_id !== undefined && account.sub_department_id !== null) {
    return account.sub_department_id;
  }

  return null;
};

const buildAuthPayload = (account) => ({
  account_id: account.id,
  user_id: account.user_id,
  username: resolveAuthUsername(account),
  role: resolveAuthRole(account),
  token_version: Number(account.token_version || 0),
});

const mapAuthUser = (account) => ({
  account_id: account.id,
  name: resolveDisplayName(account),
  role: resolveAuthRole(account),
  department_id: resolveDepartmentId(account),
});

module.exports = {
  resolveAuthUsername,
  resolveAuthRole,
  resolveDisplayName,
  resolveDepartmentId,
  buildAuthPayload,
  mapAuthUser,
};
