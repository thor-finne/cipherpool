import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? '✅ موجود' : '❌ غير موجود');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper للتحقق من الصلاحيات
export const checkPermission = async (userId, requiredRole) => {
  const { data, error } = await supabase
    .rpc('check_user_permission', {
      user_id: userId,
      required_role: requiredRole
    });
  
  if (error) return false;
  return data;
};