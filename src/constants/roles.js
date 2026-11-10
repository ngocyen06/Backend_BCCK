// OWNER: Yến
// Vai trò người dùng (CONTRACT.md:31). Khớp CHECK CK_Users_Role ở 02_constraints_indexes.sql.

const ROLES = Object.freeze({
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

module.exports = { ROLES, ROLE_VALUES };
