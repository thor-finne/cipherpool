import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function Support() {
  const { profile } = useOutletContext();
  const [tickets, setTickets] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [activeTab, setActiveTab] = useState("tickets");
  const [filter, setFilter] = useState("all");
  const [ticketFilter, setTicketFilter] = useState("all"); // all, open, urgent, mine

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isSuperAdmin = profile?.role === "super_admin";

  // Formulaire nouveau ticket
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "autre",
    priority: "normal"
  });

  useEffect(() => {
    fetchTickets();
    fetchAdminMessages();
    fetchKnowledgeBase();

    // Realtime subscription for tickets
    const ticketChannel = supabase
      .channel('support_tickets_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => {
          if (isAdmin) {
            setTickets(prev => [payload.new, ...prev]);
          } else if (payload.new.user_id === profile.id) {
            setTickets(prev => [payload.new, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        (payload) => {
          setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
        }
      )
      .subscribe();

    // Realtime subscription for messages
    const messageChannel = supabase
      .channel('support_messages_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          if (selectedTicket && payload.new.ticket_id === selectedTicket.id) {
            fetchMessages(selectedTicket.id);
          }
        }
      )
      .subscribe();

    // Realtime subscription for admin messages
    const adminChannel = supabase
      .channel('admin_messages_channel')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_messages',
          filter: `or(user_id.eq.${profile.id},is_global.eq.true)`
        },
        () => {
          fetchAdminMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(adminChannel);
    };
  }, [selectedTicket, profile.id, isAdmin]);

  const fetchTickets = async () => {
    let query = supabase
      .from("support_tickets")
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey (
          id,
          full_name,
          free_fire_id,
          role
        ),
        assigned_to:profiles!support_tickets_assigned_to_fkey (
          id,
          full_name,
          role
        )
      `)
      .order("created_at", { ascending: false });

    // إذا كان user عادي، يشوف تذاكره فقط
    if (!isAdmin) {
      query = query.eq("user_id", profile.id);
    }

    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
  };

  const fetchAdminMessages = async () => {
    const { data } = await supabase
      .from("admin_messages")
      .select("*")
      .or(`user_id.eq.${profile.id},is_global.eq.true`)
      .order("created_at", { ascending: false });

    setAdminMessages(data || []);
  };

  const fetchKnowledgeBase = async () => {
    const { data } = await supabase
      .from("knowledge_base")
      .select("*")
      .order("views", { ascending: false })
      .limit(5);

    setKnowledgeBase(data || []);
  };

  const fetchMessages = async (ticketId) => {
    const { data } = await supabase
      .from("support_messages")
      .select(`
        *,
        sender:profiles!support_messages_sender_id_fkey (
          id,
          full_name,
          role
        )
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const markAsRead = async (id) => {
    await supabase
      .from("admin_messages")
      .update({ read: true })
      .eq("id", id);
    
    fetchAdminMessages();
  };

  const markAllAsRead = async () => {
    const unreadIds = adminMessages.filter(m => !m.read).map(m => m.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("admin_messages")
      .update({ read: true })
      .in("id", unreadIds);

    fetchAdminMessages();
  };

  const createTicket = async () => {
    if (!newTicket.subject) return;

    const { data, error } = await supabase
      .from("support_tickets")
      .insert([{
        user_id: profile.id,
        subject: newTicket.subject,
        category: newTicket.category,
        priority: newTicket.priority,
        status: "open"
      }])
      .select()
      .single();

    if (!error && data) {
      setTickets([data, ...tickets]);
      setSelectedTicket(data);
      fetchMessages(data.id);
      setShowNewTicket(false);
      setActiveTab("tickets");
      setNewTicket({ subject: "", category: "autre", priority: "normal" });

      // إضافة رسالة أولية
      await supabase
        .from("support_messages")
        .insert([{
          ticket_id: data.id,
          sender_id: profile.id,
          message: newTicket.subject
        }]);
    }
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
    }
  };

  const assignToMe = async () => {
    if (!selectedTicket || !isAdmin) return;

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
      case 'open': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'answered': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-white/10 text-white/60 border-white/10';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'critique': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-white/10 text-white/60 border-white/10';
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'tournoi': return '🎮';
      case 'coins': return '💰';
      case 'compte': return '👤';
      case 'paiement': return '💳';
      case 'classement': return '📊';
      default: return '❓';
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === "all") return true;
    if (ticketFilter === "open") return t.status === "open";
    if (ticketFilter === "urgent") return t.priority === "urgent" || t.priority === "critique";
    if (ticketFilter === "mine") return t.assigned_to?.id === profile.id;
    if (ticketFilter === "closed") return t.status === "closed";
    return true;
  });

  const unreadCount = adminMessages.filter(m => !m.read).length;
  const urgentCount = tickets.filter(t => t.priority === "urgent" || t.priority === "critique").length;
  const openCount = tickets.filter(t => t.status === "open").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white cyber-grid">
      <div className="max-w-7xl mx-auto p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
              🎟️ CENTRE DE SOUTIEN
            </h1>
            <p className="text-white/40 mt-2">
              {isAdmin ? 'Gestion des tickets de support' : 'Besoin d\'aide ? Créez un ticket'}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowNewTicket(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-xl font-bold text-white hover:opacity-90 transition"
            >
              + NOUVEAU TICKET
            </button>
          )}
        </div>

        {/* Stats Cards pour Admin */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">TOTAL TICKETS</p>
              <p className="text-3xl font-bold text-white">{tickets.length}</p>
            </div>
            <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">OUVERTS</p>
              <p className="text-3xl font-bold text-green-400">{openCount}</p>
            </div>
            <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">URGENTS</p>
              <p className="text-3xl font-bold text-orange-400">{urgentCount}</p>
            </div>
            <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">MES TICKETS</p>
              <p className="text-3xl font-bold text-purple-400">
                {tickets.filter(t => t.assigned_to?.id === profile.id).length}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[rgba(124,58,237,0.2)] pb-4">
          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
              activeTab === "tickets" 
                ? "text-[#7c3aed] border-b-2 border-[#7c3aed]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            {isAdmin ? 'GESTION DES TICKETS' : 'MES TICKETS'}
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
              activeTab === "announcements" 
                ? "text-[#7c3aed] border-b-2 border-[#7c3aed]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            ANNONCES OFFICIELLES
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Knowledge Base */}
        {knowledgeBase.length > 0 && activeTab === "tickets" && (
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#7c3aed] rounded-full"></span>
              📚 QUESTIONS FRÉQUENTES
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {knowledgeBase.map(item => (
                <div key={item.id} className="bg-[#11152b] rounded-xl p-4 hover:scale-[1.02] transition">
                  <p className="font-medium text-white mb-2">{item.question}</p>
                  <p className="text-sm text-white/60">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid */}
        {activeTab === "tickets" ? (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Tickets List */}
            <div className="lg:col-span-1">
              <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-white">
                    {isAdmin ? 'LISTE DES TICKETS' : 'MES TICKETS'}
                  </h2>
                  {isAdmin && (
                    <select
                      value={ticketFilter}
                      onChange={(e) => setTicketFilter(e.target.value)}
                      className="bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-lg px-3 py-1 text-sm text-white focus:border-[#7c3aed]"
                    >
                      <option value="all">TOUS</option>
                      <option value="open">OUVERTS</option>
                      <option value="urgent">URGENTS</option>
                      <option value="mine">MES TICKETS</option>
                      <option value="closed">FERMÉS</option>
                    </select>
                  )}
                </div>

                {filteredTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/40">AUCUN TICKET</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {filteredTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          fetchMessages(ticket.id);
                        }}
                        className={`bg-[#11152b] rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition border ${
                          selectedTicket?.id === ticket.id 
                            ? 'border-[#7c3aed]' 
                            : getStatusColor(ticket.status)
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
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs bg-[#1a1f35] px-2 py-0.5 rounded-full text-white/60 flex items-center gap-1">
                            {getCategoryIcon(ticket.category)} {ticket.category === 'tournoi' ? 'Tournoi' :
                             ticket.category === 'coins' ? 'Coins' :
                             ticket.category === 'compte' ? 'Compte' :
                             ticket.category === 'paiement' ? 'Paiement' :
                             ticket.category === 'classement' ? 'Classement' : 'Autre'}
                          </span>
                          {ticket.priority !== 'normal' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority === 'urgent' ? 'URGENT' : 'CRITIQUE'}
                            </span>
                          )}
                          {isAdmin && ticket.user && (
                            <span className="text-xs bg-[#1a1f35] px-2 py-0.5 rounded-full text-white/60">
                              {ticket.user.full_name}
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
                          <span className={`px-3 py-1 text-xs rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                            {selectedTicket.priority === 'normal' ? 'NORMAL' :
                             selectedTicket.priority === 'urgent' ? 'URGENT' : 'CRITIQUE'}
                          </span>
                          <span className="px-3 py-1 bg-[#1a1f35] text-white/60 rounded-full text-xs flex items-center gap-1">
                            {getCategoryIcon(selectedTicket.category)} {selectedTicket.category}
                          </span>
                          {selectedTicket.assigned_to && (
                            <span className="px-3 py-1 bg-[#7c3aed]/20 text-[#7c3aed] rounded-full text-xs">
                              Assigné à: {selectedTicket.assigned_to.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isAdmin && !selectedTicket.assigned_to && (
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
                          placeholder="Votre message..."
                          rows="2"
                          className="flex-1 px-4 py-3 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl text-white focus:border-[#7c3aed] transition resize-none"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-xl font-bold text-white hover:opacity-90 transition disabled:opacity-50"
                        >
                          ENVOYER
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
                    {!isAdmin && (
                      <p className="text-white/20 text-sm mt-2">
                        Ou créez un nouveau ticket pour commencer
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // ========== ANNOUNCEMENTS SECTION ==========
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-[#7c3aed] rounded-full"></span>
                📢 ANNONCES OFFICIELLES
              </h2>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-lg text-sm text-white/60 hover:text-white transition"
                >
                  TOUT MARQUER COMME LU
                </button>
              )}
            </div>

            {adminMessages.length > 0 ? (
              <div className="space-y-4">
                {adminMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    onClick={() => !msg.read && markAsRead(msg.id)}
                    className={`relative bg-gradient-to-r from-[#7c3aed]/10 to-[#06b6d4]/10 border rounded-xl p-6 hover:scale-[1.01] transition-all duration-300 cursor-pointer ${
                      !msg.read ? 'border-l-4 border-[#7c3aed]' : 'border-[rgba(124,58,237,0.3)]'
                    }`}
                  >
                    {!msg.read && (
                      <div className="absolute top-6 right-6 w-2 h-2 bg-[#7c3aed] rounded-full animate-pulse" />
                    )}

                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">
                        {msg.type === 'warning' ? '⚠️' : msg.type === 'update' ? '🔄' : '📢'}
                      </span>
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                          {msg.title}
                        </h3>
                        <p className="text-sm text-white/40 mt-1">
                          {msg.is_global ? '📢 ANNONCE GÉNÉRALE' : '📩 MESSAGE PERSONNEL'}
                        </p>
                      </div>
                    </div>

                    <p className="text-white/60 mt-3 leading-relaxed">
                      {msg.content}
                    </p>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-[rgba(124,58,237,0.1)]">
                      <p className="text-xs text-white/30">
                        {new Date(msg.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {msg.type === 'warning' && (
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                          ATTENTION
                        </span>
                      )}
                      {msg.type === 'update' && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                          MISE À JOUR
                        </span>
                      )}
                      {msg.type === 'info' && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                          INFORMATION
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4 opacity-30">📭</div>
                <p className="text-white/40 text-lg">AUCUNE ANNONCE POUR LE MOMENT</p>
              </div>
            )}
          </div>
        )}

        {/* New Ticket Modal */}
        <AnimatePresence>
          {showNewTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowNewTicket(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.3)] rounded-2xl p-8 max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-white mb-6">🎟️ NOUVEAU TICKET</h2>

                <div className="space-y-4">
                  {/* Sujet */}
                  <div>
                    <label className="block text-sm text-white/40 mb-2">SUJET</label>
                    <input
                      type="text"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                      placeholder="Décrivez votre problème..."
                      className="w-full px-4 py-3 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl text-white focus:border-[#7c3aed] transition"
                    />
                  </div>

                  {/* Catégorie */}
                  <div>
                    <label className="block text-sm text-white/40 mb-2">CATÉGORIE</label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                      className="w-full px-4 py-3 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl text-white focus:border-[#7c3aed] transition"
                    >
                      <option value="tournoi">🎮 Problème tournoi</option>
                      <option value="coins">💰 Coins manquants</option>
                      <option value="compte">⚠️ Compte bloqué</option>
                      <option value="paiement">💳 Paiement</option>
                      <option value="classement">📊 Classement incorrect</option>
                      <option value="autre">❓ Autre</option>
                    </select>
                  </div>

                  {/* Priorité */}
                  <div>
                    <label className="block text-sm text-white/40 mb-2">PRIORITÉ</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewTicket({...newTicket, priority: "normal"})}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition ${
                          newTicket.priority === "normal"
                            ? "bg-white/20 text-white"
                            : "bg-[#11152b] text-white/60 hover:text-white"
                        }`}
                      >
                        NORMAL
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTicket({...newTicket, priority: "urgent"})}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition ${
                          newTicket.priority === "urgent"
                            ? "bg-orange-500 text-white"
                            : "bg-[#11152b] text-white/60 hover:text-white"
                        }`}
                      >
                        URGENT
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTicket({...newTicket, priority: "critique"})}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition ${
                          newTicket.priority === "critique"
                            ? "bg-red-500 text-white"
                            : "bg-[#11152b] text-white/60 hover:text-white"
                        }`}
                      >
                        CRITIQUE
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setShowNewTicket(false)}
                      className="flex-1 px-4 py-3 border border-[rgba(124,58,237,0.2)] hover:border-[rgba(124,58,237,0.5)] rounded-xl text-white transition"
                    >
                      ANNULER
                    </button>
                    <button
                      onClick={createTicket}
                      disabled={!newTicket.subject}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-xl font-bold text-white hover:opacity-90 transition disabled:opacity-50"
                    >
                      CRÉER
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}