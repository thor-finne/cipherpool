import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSupport() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);

    if (data?.role !== "admin" && data?.role !== "super_admin") {
      navigate("/dashboard");
    } else {
      fetchTickets();
    }
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey (
          full_name,
          email,
          free_fire_id
        )
      `)
      .order("created_at", { ascending: false });

    setTickets(data || []);
    setLoading(false);
  };

  const fetchMessages = async (ticketId) => {
    const { data } = await supabase
      .from("support_messages")
      .select(`
        *,
        sender:profiles!support_messages_sender_id_fkey (
          full_name,
          role
        )
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const assignToMe = async () => {
    if (!selectedTicket) return;

    await supabase
      .from("support_tickets")
      .update({ 
        assigned_to: profile.id,
        status: "pending"
      })
      .eq("id", selectedTicket.id);

    fetchTickets();
    setSelectedTicket({ ...selectedTicket, assigned_to: profile, status: "pending" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const { error } = await supabase
      .from("support_messages")
      .insert([{
        ticket_id: selectedTicket.id,
        sender_id: profile.id,
        message: newMessage.trim()
      }]);

    if (!error) {
      setNewMessage("");
      fetchMessages(selectedTicket.id);
      
      await supabase
        .from("support_tickets")
        .update({ status: "answered" })
        .eq("id", selectedTicket.id);

      fetchTickets();
    }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;

    await supabase
      .from("support_tickets")
      .update({ status: "closed" })
      .eq("id", selectedTicket.id);

    fetchTickets();
    setSelectedTicket(null);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'answered': return 'bg-blue-500/20 text-blue-400';
      case 'closed': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-white/10 text-white/60';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-orange-500/20 text-orange-400';
      case 'critique': return 'bg-red-500/20 text-red-400';
      default: return 'bg-white/10 text-white/60';
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === "all") return true;
    if (filter === "mine") return t.assigned_to === profile.id;
    return t.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white cyber-grid p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
            👑 SUPPORT ADMIN
          </h1>
          <p className="text-white/40">Gestion des tickets de support</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">TOTAL TICKETS</p>
            <p className="text-3xl font-bold text-white">{tickets.length}</p>
          </div>
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">OUVERTS</p>
            <p className="text-3xl font-bold text-green-400">
              {tickets.filter(t => t.status === "open").length}
            </p>
          </div>
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">URGENTS</p>
            <p className="text-3xl font-bold text-orange-400">
              {tickets.filter(t => t.priority !== "normal").length}
            </p>
          </div>
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">MES TICKETS</p>
            <p className="text-3xl font-bold text-purple-400">
              {tickets.filter(t => t.assigned_to === profile.id).length}
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">TICKETS</h2>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-lg px-3 py-1 text-sm text-white focus:border-[#7c3aed]"
                >
                  <option value="open">OUVERTS</option>
                  <option value="pending">EN COURS</option>
                  <option value="answered">RÉPONDUS</option>
                  <option value="mine">MES TICKETS</option>
                  <option value="all">TOUS</option>
                </select>
              </div>

              {filteredTickets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/40">AUCUN TICKET</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`bg-[#11152b] rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition ${
                        selectedTicket?.id === ticket.id ? 'border-2 border-[#7c3aed]' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-white truncate flex-1">
                          {ticket.subject}
                        </p>
                        <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status === 'open' ? 'OUVERT' :
                           ticket.status === 'pending' ? 'EN COURS' :
                           ticket.status === 'answered' ? 'RÉPONDU' : 'FERMÉ'}
                        </span>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <span className="text-xs bg-[#1a1f35] px-2 py-0.5 rounded-full text-white/60">
                          {ticket.user?.full_name}
                        </span>
                        {ticket.priority !== 'normal' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority === 'urgent' ? 'URGENT' : 'CRITIQUE'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/30">
                        {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl flex flex-col h-[600px]">
                
                {/* Ticket Header */}
                <div className="p-6 border-b border-[rgba(124,58,237,0.2)]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedTicket.subject}</h2>
                      <div className="flex gap-3 mt-2">
                        <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(selectedTicket.status)}`}>
                          {selectedTicket.status === 'open' ? 'OUVERT' :
                           selectedTicket.status === 'pending' ? 'EN COURS' :
                           selectedTicket.status === 'answered' ? 'RÉPONDU' : 'FERMÉ'}
                        </span>
                        <span className="px-3 py-1 bg-[#11152b] text-white/60 rounded-full text-xs">
                          {selectedTicket.user?.full_name}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!selectedTicket.assigned_to && (
                        <button
                          onClick={assignToMe}
                          className="px-4 py-2 bg-[#7c3aed]/20 text-[#7c3aed] rounded-lg text-sm hover:bg-[#7c3aed]/30 transition"
                        >
                          PRENDRE
                        </button>
                      )}
                      {selectedTicket.status !== 'closed' && (
                        <button
                          onClick={closeTicket}
                          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition"
                        >
                          FERMER
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${
                        msg.sender_id === profile.id
                          ? 'bg-gradient-to-r from-[#7c3aed] to-[#06b6d4]'
                          : 'bg-[#11152b]'
                      } rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-white">
                            {msg.sender_id === profile.id ? 'VOUS' : msg.sender?.full_name}
                          </span>
                          {msg.sender?.role === 'admin' && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                              ADMIN
                            </span>
                          )}
                          {msg.sender?.role === 'super_admin' && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                              SUPER ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-white/90">{msg.message}</p>
                        <p className="text-xs text-white/40 mt-2">
                          {new Date(msg.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="p-6 border-t border-[rgba(124,58,237,0.2)]">
                    <div className="flex gap-3">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Votre réponse..."
                        rows="2"
                        className="flex-1 px-4 py-3 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl text-white focus:border-[#7c3aed] transition resize-none"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-xl font-bold text-white hover:opacity-90 transition disabled:opacity-50"
                      >
                        RÉPONDRE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-30">🎟️</div>
                  <p className="text-white/40 text-lg">SÉLECTIONNEZ UN TICKET</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}