import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log("No user found, redirecting to login");
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setError(error.message);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      if (!data) {
        console.log("No profile found for user");
        setAuthorized(false);
        setLoading(false);
        return;
      }

      console.log("✅ ProtectedRoute - User role:", data?.role);
      
      if (allowedRoles.length === 0) {
        setAuthorized(true);
      } else if (data && allowedRoles.includes(data.role)) {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
      
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(err.message);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Erreur: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return authorized ? children : <Navigate to="/dashboard" />;
}