import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminGrant() {
  const { profile } = useOutletContext();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [recentGrants, setRecentGrants] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);

  const isSuperAdmin = profile?.role === "super_admin";

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchApprovedUsers();
      fetchRecentGrants();
    }
  }, [isSuperAdmin]);

  const fetchApprovedUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          free_fire_id
        `)
        .eq("verification_status", "approved")
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;

      const usersWithBalance = await Promise.all(
        (profiles || []).map(async (user) => {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle();
          
          return {
            ...user,
            coins: wallet?.balance || 0
          };
        })
      );

      setUsers(usersWithBalance || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setMessage({ type: "error", text: "Erreur lors du chargement des utilisateurs" });
    }
  };

  const fetchRecentGrants = async () => {
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select(`
          id,
          amount,
          created_at,
          profiles!wallet_transactions_user_id_fkey (
            full_name
          )
        `)
        .eq("type", "admin_grant")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentGrants(data || []);
    } catch (err) {
      console.error("Error fetching recent grants:", err);
    }
  };

  const fetchUserBalance = async (userId) => {
    if (!userId || userId === "") {
      setCurrentBalance(0);
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      setCurrentBalance(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setCurrentBalance(data?.balance || 0);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setCurrentBalance(0);
    }
  };

  const handleUserSelect = (userId) => {
    if (!userId || userId === "") {
      setSelectedUser("");
      setCurrentBalance(0);
      return;
    }

    setSelectedUser(userId);
    fetchUserBalance(userId);
  };

  const handleGrantCoins = async () => {
    if (!selectedUser) {
      setMessage({ type: "error", text: "Veuillez sélectionner un utilisateur" });
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage({ type: "error", text: "Veuillez entrer un montant valide" });
      return;
    }

    if (amountNum > 10000) {
      setMessage({ type: "error", text: "Le montant maximum est de 10 000 pièces" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { data, error } = await supabase
        .rpc("grant_coins", {
          target_user: selectedUser,
          amount: amountNum
        });

      if (error) throw error;

      if (data && data.success) {
        setMessage({ 
          type: "success", 
          text: `✅ ${amountNum} pièces ont été accordées avec succès` 
        });
        setAmount("");
        setSelectedUser("");
        setSearchTerm("");
        fetchApprovedUsers();
        fetchRecentGrants();
      } else {
        setMessage({ type: "error", text: data?.message || "Erreur lors de l'opération" });
      }
    } catch (err) {
      console.error("Error granting coins:", err);
      setMessage({ 
        type: "error", 
        text: err.message || "Échec de l'opération" 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.free_fire_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUserData = users.find(u => u.id === selectedUser);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white cyber-grid p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
              👑 GESTION DES COINS
            </h1>
            <p className="text-white/40 mt-2">
              Accorder des pièces aux utilisateurs approuvés
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/super-admin")}
              className="px-4 py-2 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-lg text-sm text-white/60 hover:text-white transition"
            >
              ← RETOUR
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="px-4 py-2 bg-[#7c3aed] text-white rounded-lg text-sm hover:bg-[#6d28d9] transition"
            >
              PANEL ADMIN
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#7c3aed] rounded-full"></span>
              💰 ACCORDER DES PIÈCES
            </h2>

            <div className="mb-6">
              <label className="block text-sm text-white/40 mb-2">
                RECHERCHER UN UTILISATEUR
              </label>
              <input
                type="text"
                placeholder="Nom ou Free Fire ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl text-white focus:border-[#7c3aed] transition mb-3"
              />

              <select
                value={selectedUser}
                onChange={(e) => handleUserSelect(e.target.value)}
                className="w-full px-4 py-3 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl text-white focus:border-[#7c3aed] transition"
                size="5"
              >
                <option value="">-- SÉLECTIONNER UN UTILISATEUR --</option>
                {filteredUsers.map(user => (
                  <option key={user.id} value={user.id} className="py-2">
                    {user.full_name} - {user.coins} pièces
                    {user.free_fire_id && ` (FF: ${user.free_fire_id})`}
                  </option>
                ))}
              </select>

              {filteredUsers.length === 0 && searchTerm && (
                <p className="mt-2 text-sm text-white/40">
                  Aucun utilisateur trouvé pour "{searchTerm}"
                </p>
              )}
            </div>

            {selectedUserData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-6 p-4 bg-gradient-to-r from-[#7c3aed]/10 to-[#06b6d4]/10 border border-[rgba(124,58,237,0.3)] rounded-xl"
              >
                <p className="text-sm text-[#7c3aed] mb-1">UTILISATEUR SÉLECTIONNÉ</p>
                <p className="font-medium text-white text-lg">{selectedUserData.full_name}</p>
                {selectedUserData.free_fire_id && (
                  <p className="text-sm text-white/60">FF: {selectedUserData.free_fire_id}</p>
                )}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[rgba(124,58,237,0.2)]">
                  <span className="text-white/40">SOLDE ACTUEL</span>
                  <span className="text-xl font-bold text-[#7c3aed]">{currentBalance} pièces</span>
                </div>
              </motion.div>
            )}

            <div className="mb-6">
              <label className="block text-sm text-white/40 mb-2">
                MONTANT (MAX 10 000)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Entrer le montant"
                min="1"
                max="10000"
                className="w-full px-4 py-3 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl text-white focus:border-[#7c3aed] transition"
              />
            </div>

            <AnimatePresence>
              {message.text && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-6 p-4 rounded-xl ${
                    message.type === "success" 
                      ? "bg-green-500/10 border border-green-500/30 text-green-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleGrantCoins}
              disabled={loading || !selectedUser || !amount}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-xl font-bold text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "OPÉRATION EN COURS..." : "ACCORDER DES PIÈCES"}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#7c3aed] rounded-full"></span>
              📋 HISTORIQUE RÉCENT
            </h2>

            {recentGrants.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-30">📭</div>
                <p className="text-white/40">AUCUNE OPÉRATION POUR LE MOMENT</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentGrants.map(grant => (
                  <div
                    key={grant.id}
                    className="bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl p-4 hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white">
                          {grant.profiles?.full_name || "Utilisateur inconnu"}
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          {new Date(grant.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <span className="text-xl font-bold text-green-400">
                        +{grant.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#7c3aed] rounded-full"></span>
            👥 UTILISATEURS APPROUVÉS ({users.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#11152b]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/40">NOM</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/40">FF ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/40">SOLDE</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/40">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(124,58,237,0.1)]">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-[#11152b] transition">
                    <td className="px-6 py-4 font-medium text-white">{user.full_name}</td>
                    <td className="px-6 py-4 text-white/60 font-mono">{user.free_fire_id || "—"}</td>
                    <td className="px-6 py-4">
                      <span className="text-[#7c3aed] font-bold">{user.coins} pièces</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          handleUserSelect(user.id);
                          setSearchTerm("");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="px-3 py-1 bg-[#7c3aed]/20 text-[#7c3aed] rounded-lg text-sm hover:bg-[#7c3aed]/30 transition"
                      >
                        ACCORDER
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}