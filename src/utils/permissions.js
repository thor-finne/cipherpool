import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

// جميع الصلاحيات الممكنة في النظام
export const PERMISSIONS = {
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
 * التحقق من صلاحية المستخدم (دالة عادية)
 */
export const can = (user, permission) => {
  if (!user || !user.role) return false;
  
  // super_admin عنده كل الصلاحيات
  if (user.role === 'super_admin') return true;
  
  // صلاحيات admin
  if (user.role === 'admin') {
    const adminPermissions = [
      PERMISSIONS.VIEW_USERS,
      PERMISSIONS.BAN_USER,
      PERMISSIONS.GRANT_COINS,
      PERMISSIONS.VIEW_USER_DETAILS,
      PERMISSIONS.MANAGE_REPORTS,
      PERMISSIONS.VIEW_ANALYTICS,
      PERMISSIONS.VIEW_LOGS,
      PERMISSIONS.VIEW_ALL_TICKETS,
      PERMISSIONS.REPLY_TO_TICKETS,
      PERMISSIONS.CLOSE_TICKETS,
      PERMISSIONS.VERIFY_USERS,
      PERMISSIONS.CONFIRM_MATCH_RESULT,
    ];
    return adminPermissions.includes(permission);
  }
  
  // صلاحيات founder
  if (user.role === 'founder') {
    const founderPermissions = [
      PERMISSIONS.CREATE_TOURNAMENT,
      PERMISSIONS.MANAGE_OWN_TOURNAMENT,
      PERMISSIONS.START_MATCH,
      PERMISSIONS.VIEW_USERS,
    ];
    return founderPermissions.includes(permission);
  }
  
  // user عنده صلاحيات أساسية (مثلاً ما عندو والو)
  if (user.role === 'user') {
    return false; // المستخدم العادي ما عندو شي صلاحية
  }
  
  return false;
};

/**
 * هوك usePermissions - يستخدم في المكونات
 */
export const usePermissions = (user) => {
  const [permissions, setPermissions] = useState({
    can: (permission) => false,
    isSuperAdmin: false,
    isAdmin: false,
    isFounder: false,
    isUser: false,
    isBanned: false,
  });

  useEffect(() => {
    if (!user) {
      setPermissions({
        can: () => false,
        isSuperAdmin: false,
        isAdmin: false,
        isFounder: false,
        isUser: false,
        isBanned: false,
      });
      return;
    }

    setPermissions({
      can: (permission) => can(user, permission),
      isSuperAdmin: user.role === 'super_admin',
      isAdmin: user.role === 'admin' || user.role === 'super_admin',
      isFounder: user.role === 'founder',
      isUser: user.role === 'user',
      isBanned: user.role === 'banned',
    });
  }, [user]);

  return permissions;
};

/**
 * دالة للتحقق من الصلاحية عبر RPC (للعمليات الحساسة)
 */
export const checkPermission = async (userId, permissionName) => {
  try {
    const { data, error } = await supabase
      .rpc('check_user_permission', {
        user_id: userId,
        permission_name: permissionName
      });
    
    if (error) return false;
    return data || false;
  } catch (err) {
    console.error('Error checking permission:', err);
    return false;
  }
};

export default can;