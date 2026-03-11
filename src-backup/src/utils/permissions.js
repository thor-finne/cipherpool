// src/utils/permissions.js

/**
 * جميع الإجراءات الممكنة في النظام
 */
export const ACTIONS = {
  // المستخدمون
  VIEW_USERS: 'view_users',
  EDIT_USER_ROLE: 'edit_user_role',
  BAN_USER: 'ban_user',
  DELETE_USER: 'delete_user',
  GRANT_COINS: 'grant_coins',
  VIEW_USER_DETAILS: 'view_user_details',

  // البطولات
  CREATE_TOURNAMENT: 'create_tournament',
  EDIT_ANY_TOURNAMENT: 'edit_any_tournament',
  DELETE_ANY_TOURNAMENT: 'delete_any_tournament',
  MANAGE_OWN_TOURNAMENT: 'manage_own_tournament',
  START_MATCH: 'start_match',
  CONFIRM_MATCH_RESULT: 'confirm_match_result',

  // الإدارة
  MANAGE_ADMINS: 'manage_admins',
  VIEW_LOGS: 'view_logs',
  MANAGE_REPORTS: 'manage_reports',
  VIEW_ANALYTICS: 'view_analytics',

  // الدعم
  VIEW_ALL_TICKETS: 'view_all_tickets',
  REPLY_TO_TICKETS: 'reply_to_tickets',
  CLOSE_TICKETS: 'close_tickets',

  // التحقق
  VERIFY_USERS: 'verify_users',

  // النظام
  MAINTENANCE_MODE: 'maintenance_mode',
  VIEW_SYSTEM_CONFIG: 'view_system_config',
};

/**
 * صلاحيات كل دور
 */
const ROLE_PERMISSIONS = {
  super_admin: [
    ACTIONS.VIEW_USERS,
    ACTIONS.EDIT_USER_ROLE,
    ACTIONS.BAN_USER,
    ACTIONS.DELETE_USER,
    ACTIONS.GRANT_COINS,
    ACTIONS.VIEW_USER_DETAILS,
    ACTIONS.CREATE_TOURNAMENT,
    ACTIONS.EDIT_ANY_TOURNAMENT,
    ACTIONS.DELETE_ANY_TOURNAMENT,
    ACTIONS.START_MATCH,
    ACTIONS.CONFIRM_MATCH_RESULT,
    ACTIONS.MANAGE_ADMINS,
    ACTIONS.VIEW_LOGS,
    ACTIONS.MANAGE_REPORTS,
    ACTIONS.VIEW_ANALYTICS,
    ACTIONS.VIEW_ALL_TICKETS,
    ACTIONS.REPLY_TO_TICKETS,
    ACTIONS.CLOSE_TICKETS,
    ACTIONS.VERIFY_USERS,
    ACTIONS.MAINTENANCE_MODE,
    ACTIONS.VIEW_SYSTEM_CONFIG,
  ],
  admin: [
    ACTIONS.VIEW_USERS,
    ACTIONS.BAN_USER,
    ACTIONS.GRANT_COINS,
    ACTIONS.VIEW_USER_DETAILS,
    ACTIONS.MANAGE_REPORTS,
    ACTIONS.VIEW_ANALYTICS,
    ACTIONS.VIEW_LOGS,
    ACTIONS.VIEW_ALL_TICKETS,
    ACTIONS.REPLY_TO_TICKETS,
    ACTIONS.CLOSE_TICKETS,
    ACTIONS.VERIFY_USERS,
    ACTIONS.CONFIRM_MATCH_RESULT,
  ],
  founder: [
    ACTIONS.CREATE_TOURNAMENT,
    ACTIONS.MANAGE_OWN_TOURNAMENT,
    ACTIONS.START_MATCH,
    ACTIONS.VIEW_USERS,
  ],
  user: [],
  banned: [],
};

/**
 * التحقق من صلاحية المستخدم
 */
export const can = (user, action) => {
  if (!user || !user.role) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(action);
};

/**
 * هوك للتحقق من الصلاحيات (يستخدم في المكونات)
 */
export const usePermissions = (user) => {
  return {
    can: (action) => can(user, action),
    isSuperAdmin: user?.role === 'super_admin',
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isFounder: user?.role === 'founder',
    isUser: user?.role === 'user',
    isBanned: user?.role === 'banned',
  };
};

export default can;