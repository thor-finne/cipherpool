import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import AuthLayout   from "./layouts/AuthLayout";
import MainLayout   from "./layouts/MainLayout";

// Route Protection
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute     from "./components/GuestRoute";

// Public Pages
import Home     from "./pages/Home";
import Login    from "./pages/Login";
import Register from "./pages/Register";

// Main Pages
import Dashboard   from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import Leaderboard from "./pages/Leaderboard";
import Profile     from "./pages/Profile";
import Support     from "./pages/Support";
import Wallet      from "./pages/Wallet";
import GlobalChat  from "./pages/GlobalChat";

// Tournament Pages
import TournamentDetails  from "./pages/TournamentDetails";
import TournamentWaiting  from "./pages/TournamentWaiting";
import TournamentRoom     from "./pages/TournamentRoom";
import ManageTournament   from "./pages/ManageTournament";
import CreateTournament   from "./pages/CreateTournament";

// Founder Pages
import FounderDashboard from "./pages/FounderDashboard";
import FounderRequests  from "./pages/FounderRequests";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminSupport   from "./pages/AdminSupport";
import Adminresults   from "./pages/Adminresults";
import Adminnews      from "./pages/Adminnews";

// Super Admin Pages
import SuperAdmin from "./pages/SuperAdmin";
import AdminGrant from "./pages/AdminGrant";

// Store / Designer
import Store          from "./pages/Store";
import AdminStorePanel from "./pages/AdminStorePanel";
import DesignerPanel  from "./pages/DesignerPanel";

// Teams
import Teams       from "./pages/Teams";
import TeamProfile from "./pages/Teamprofile";

// Phase 2
import Achievements from "./pages/Achievements";
import DailyRewards from "./pages/Dailyrewards";
import PlayerStats  from "./pages/Playerstats";
import News         from "./pages/News";

// Submit Result
import SubmitResult from "./pages/Submitresult";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── PUBLIC ── */}
        <Route element={<AuthLayout />}>
          <Route path="/"         element={<GuestRoute><Home /></GuestRoute>} />
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        </Route>

        {/* ── USER ── */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/tournaments"   element={<Tournaments />} />
          <Route path="/leaderboard"   element={<Leaderboard />} />
          <Route path="/profile"       element={<Profile />} />
          <Route path="/support"       element={<Support />} />
          <Route path="/wallet"        element={<Wallet />} />
          <Route path="/chat"          element={<GlobalChat />} />
          <Route path="/store"         element={<Store />} />
          <Route path="/news"          element={<News />} />
          <Route path="/stats"         element={<PlayerStats />} />
          <Route path="/achievements"  element={<Achievements />} />
          <Route path="/daily-rewards" element={<DailyRewards />} />
          <Route path="/submit-result" element={<SubmitResult />} />

          {/* Teams */}
          <Route path="/teams"     element={<Teams />} />
          <Route path="/teams/:id" element={<TeamProfile />} />

          {/* Tournaments */}
          <Route path="/tournaments/:id"         element={<TournamentDetails />} />
          <Route path="/tournaments/:id/waiting" element={<TournamentWaiting />} />
          <Route path="/tournaments/:id/room"    element={<TournamentRoom />} />
          <Route path="/tournaments/:id/manage"  element={<ManageTournament />} />
        </Route>

        {/* ── FOUNDER ── */}
        <Route element={<ProtectedRoute allowedRoles={["founder","fondateur","super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/founder"           element={<FounderDashboard />} />
          <Route path="/founder/requests"  element={<FounderRequests />} />
          <Route path="/founder/results"   element={<Adminresults />} />
          <Route path="/create-tournament" element={<CreateTournament />} />
        </Route>

        {/* ── ADMIN ── */}
        <Route element={<ProtectedRoute allowedRoles={["admin","fondateur","founder","super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/admin"         element={<AdminDashboard />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/results" element={<Adminresults />} />
          <Route path="/admin/news"    element={<Adminnews />} />
          <Route path="/admin-store"   element={<AdminStorePanel />} />
        </Route>

        {/* ── DESIGNER ── */}
        <Route element={<ProtectedRoute allowedRoles={["designer","admin","super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/designer" element={<DesignerPanel />} />
        </Route>

        {/* ── SUPER ADMIN ── */}
        <Route element={<ProtectedRoute allowedRoles={["super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/super-admin"       element={<SuperAdmin />} />
          <Route path="/super-admin/grant" element={<AdminGrant />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={
          <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ textAlign:"center" }}>
              <h1 style={{ fontSize:80, fontFamily:"'Bebas Neue',cursive", color:"#8b3dff", margin:0, textShadow:"0 0 40px rgba(139,61,255,.7)" }}>404</h1>
              <p style={{ color:"rgba(255,255,255,.3)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:4, fontSize:12, marginBottom:32 }}>PAGE NON TROUVÉE</p>
              <a href="/dashboard" style={{ padding:"13px 32px", borderRadius:12, background:"linear-gradient(135deg,#8b3dff,#4f46e5)", color:"#fff", fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:2, textDecoration:"none", boxShadow:"0 8px 32px rgba(139,61,255,.5)" }}>
                ← ACCUEIL
              </a>
            </div>
          </div>
        } />

      </Routes>
    </BrowserRouter>
  );
}