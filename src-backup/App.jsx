import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";

// Route Protection
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";

// Public Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Main Pages
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Support from "./pages/Support";
import Wallet from "./pages/Wallet";

// Tournament Pages
import TournamentDetails from "./pages/TournamentDetails";
import TournamentWaiting from "./pages/TournamentWaiting";
import TournamentRoom from "./pages/TournamentRoom";
import ManageTournament from "./pages/ManageTournament";

// Founder Pages
import FounderDashboard from "./pages/FounderDashboard";
import FounderRequests from "./pages/FounderRequests";
import CreateTournament from "./pages/CreateTournament";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminSupport from "./pages/AdminSupport";

// Super Admin Pages
import SuperAdmin from "./pages/SuperAdmin";
import AdminGrant from "./pages/AdminGrant";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* ========== PUBLIC ROUTES ========== */}
        <Route element={<AuthLayout />}>
          <Route path="/" element={<GuestRoute><Home /></GuestRoute>} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        </Route>

        {/* ========== USER ROUTES ========== */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/support" element={<Support />} />
          <Route path="/wallet" element={<Wallet />} />
          
          {/* Tournament Routes */}
          <Route path="/tournaments/:id" element={<TournamentDetails />} />
          <Route path="/tournaments/:id/waiting" element={<TournamentWaiting />} />
          <Route path="/tournaments/:id/room" element={<TournamentRoom />} />
          <Route path="/tournaments/:id/manage" element={<ManageTournament />} />
        </Route>

        {/* ========== FOUNDER ROUTES ========== */}
        <Route element={<ProtectedRoute allowedRoles={["founder", "super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/founder" element={<FounderDashboard />} />
          <Route path="/founder/requests" element={<FounderRequests />} />
          <Route path="/create-tournament" element={<CreateTournament />} />
        </Route>

        {/* ========== ADMIN ROUTES ========== */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/support" element={<AdminSupport />} />
        </Route>

        {/* ========== SUPER ADMIN ROUTES ========== */}
        <Route element={<ProtectedRoute allowedRoles={["super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/super-admin/grant" element={<AdminGrant />} />
        </Route>

        {/* ========== 404 PAGE ========== */}
        <Route path="*" element={
          <div className="min-h-screen bg-[#030014] text-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-[#7c3aed] mb-4">404</h1>
              <p className="text-white/40 mb-8">PAGE NON TROUVÉE</p>
              <a href="/" className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-lg transition hover:opacity-90">
                ACCUEIL
              </a>
            </div>
          </div>
        } />

      </Routes>
    </BrowserRouter>
  );
}