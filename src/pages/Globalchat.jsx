import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// Security: sanitize text to prevent XSS
const sanitize = (str) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim()
    .slice(0, 500);
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: "general",     label: "général",     icon: "⚡", desc: "Discussion libre" },
  { id: "tournaments", label: "tournois",    icon: "🏆", desc: "Infos & résultats" },
  { id: "recrutement", label: "recrutement", icon: "🎯", desc: "Cherche équipe" },
  { id: "off-topic",   label: "off-topic",   icon: "💬", desc: "Hors-sujet" },
];

const REACTIONS = ["🔥", "💀", "👑", "⚡", "🎯", "💪", "😂", "🤝"];

const ROLE_CONFIG = {
  super_admin: { label: "SUPER ADMIN", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: "👑" },
  admin:       { label: "ADMIN",       color: "#06b6d4", bg: "rgba(6,182,212,0.15)",  icon: "🛡️" },
  founder:     { label: "FOUNDER",     color: "#a855f7", bg: "rgba(168,85,247,0.15)", icon: "⚡" },
  user:        { label: "JOUEUR",      color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: "🎮" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.user;

const formatTime = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "maintenant";
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}min`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const getAvatar = (name) => {
  if (!name) return "?";
  return name.trim()[0].toUpperCase();
};

const AVATAR_COLORS = [
  "linear-gradient(135deg,#7c3aed,#06b6d4)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#f97316,#eab308)",
];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function GlobalChat() {
  const navigate = useNavigate();
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [channel, setChannel]         = useState("general");
  const [messages, setMessages]       = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [reactionPicker, setReactionPicker] = useState(null); // msgId
  const [hoveredMsg, setHoveredMsg]   = useState(null);
  const [showMembers, setShowMembers] = useState(true);
  const [unread, setUnread]           = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch]   = useState(false);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const typingTimer = useRef(null);
  const channelSub  = useRef(null);
  const presenceSub = useRef(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);

      // Update last_seen
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id);

      setLoading(false);
    };
    init();
  }, [navigate]);

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (ch) => {
    const { data } = await supabase
      .from("chat_messages")
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey (
          id, full_name, role, avatar_url, free_fire_id
        ),
        reactions:chat_reactions (
          emoji, user_id
        )
      `)
      .eq("channel", ch)
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages(data || []);
  }, []);

  // ── Fetch online users ─────────────────────────────────────────────────────
  const fetchOnlineUsers = useCallback(async () => {
    const threshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .gte("last_seen", threshold)
      .order("full_name");

    setOnlineUsers(data || []);
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;

    fetchMessages(channel);
    fetchOnlineUsers();

    // Cleanup old sub
    if (channelSub.current) supabase.removeChannel(channelSub.current);

    // New messages
    channelSub.current = supabase
      .channel(`chat:${channel}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `channel=eq.${channel}`
      }, async (payload) => {
        const { data: fullMsg } = await supabase
          .from("chat_messages")
          .select(`
            *,
            sender:profiles!chat_messages_sender_id_fkey (
              id, full_name, role, avatar_url, free_fire_id
            ),
            reactions:chat_reactions ( emoji, user_id )
          `)
          .eq("id", payload.new.id)
          .single();

        if (fullMsg) {
          setMessages(prev => [...prev, fullMsg]);
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_reactions"
      }, () => fetchMessages(channel))
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "chat_reactions"
      }, () => fetchMessages(channel))
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id === profile.id) return;
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.id !== payload.user_id);
          if (payload.typing) return [...filtered, { id: payload.user_id, name: payload.name }];
          return filtered;
        });
      })
      .subscribe();

    // Online presence
    if (presenceSub.current) supabase.removeChannel(presenceSub.current);
    presenceSub.current = supabase
      .channel("online-users")
      .on("presence", { event: "sync" }, () => fetchOnlineUsers())
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceSub.current.track({
            user_id: profile.id,
            name: profile.full_name,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      if (channelSub.current) supabase.removeChannel(channelSub.current);
      if (presenceSub.current) supabase.removeChannel(presenceSub.current);
    };
  }, [profile, channel, fetchMessages, fetchOnlineUsers]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────
  // Rate limit: max 1 message per second
  const lastMsgTime = useRef(0);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !profile) return;

    // Rate limit check
    const now = Date.now();
    if (now - lastMsgTime.current < 1000) return; // 1 msg/sec max
    lastMsgTime.current = now;

    // Sanitize content
    const safeText = sanitize(text);
    if (!safeText) return;

    setSending(true);
    setInput("");

    const { error } = await supabase
      .from("chat_messages")
      .insert([{
        sender_id: profile.id,
        channel,
        content: safeText
      }]);

    if (error) {
      console.error("Send error:", error);
      setInput(text);
    }

    setSending(false);
    inputRef.current?.focus();

    // Stop typing indicator
    broadcastTyping(false);
  };

  // ── Typing indicator ───────────────────────────────────────────────────────
  const broadcastTyping = (typing) => {
    if (!channelSub.current) return;
    channelSub.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: profile.id, name: profile.full_name?.split(" ")[0], typing }
    });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    broadcastTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Reactions ──────────────────────────────────────────────────────────────
  const toggleReaction = async (msgId, emoji) => {
    if (!profile) return;

    const msg = messages.find(m => m.id === msgId);
    const existing = msg?.reactions?.find(r => r.emoji === emoji && r.user_id === profile.id);

    if (existing) {
      await supabase
        .from("chat_reactions")
        .delete()
        .eq("message_id", msgId)
        .eq("user_id", profile.id)
        .eq("emoji", emoji);
    } else {
      await supabase
        .from("chat_reactions")
        .insert([{ message_id: msgId, user_id: profile.id, emoji }]);
    }

    setReactionPicker(null);
  };

  // ── Delete message ─────────────────────────────────────────────────────────
  const deleteMessage = async (msgId) => {
    const isAdmin = ["admin","super_admin"].includes(profile?.role);
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    if (msg.sender_id !== profile.id && !isAdmin) return;

    await supabase.from("chat_messages").delete().eq("id", msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  // ── Channel switch ─────────────────────────────────────────────────────────
  const switchChannel = (ch) => {
    setChannel(ch);
    setMessages([]);
    setUnread(prev => ({ ...prev, [ch]: 0 }));
  };

  // ── Filtered messages ──────────────────────────────────────────────────────
  const displayMessages = searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // ── Group messages by sender + time ───────────────────────────────────────
  const groupedMessages = displayMessages.reduce((acc, msg, i) => {
    const prev = displayMessages[i - 1];
    const isGrouped = prev &&
      prev.sender_id === msg.sender_id &&
      new Date(msg.created_at) - new Date(prev.created_at) < 120000;
    return [...acc, { ...msg, isGrouped }];
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#7c3aed]/20 border-t-[#7c3aed] animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-2 border-[#06b6d4]/20 border-b-[#06b6d4] animate-spin" style={{animationDirection:"reverse",animationDuration:"0.8s"}}></div>
          </div>
          <p className="text-white/30 text-sm tracking-widest">CONNEXION AU CHAT...</p>
        </div>
      </div>
    );
  }

  const currentChannel = CHANNELS.find(c => c.id === channel);
  const isAdmin = ["admin", "super_admin"].includes(profile?.role);

  return (
    <div className="h-screen bg-[#030014] text-white flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Orbitron:wght@700;900&display=swap');
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.6); }

        .chat-input::placeholder { color: rgba(255,255,255,0.2); }
        .chat-input:focus { outline: none; }

        .msg-hover:hover .msg-actions { opacity: 1; pointer-events: all; }
        .msg-actions { opacity: 0; pointer-events: none; transition: opacity 0.15s; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-enter { animation: slideUp 0.2s ease forwards; }

        @keyframes pulse-dot {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.4); opacity: 0.7; }
        }
        .typing-dot { animation: pulse-dot 1.2s ease infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        .glow-border { box-shadow: 0 0 0 1px rgba(124,58,237,0.3), inset 0 0 20px rgba(124,58,237,0.03); }
        .neon-text { text-shadow: 0 0 20px currentColor; }

        .channel-active { background: linear-gradient(90deg, rgba(124,58,237,0.2), transparent); border-left: 2px solid #7c3aed; }
        .channel-hover:hover { background: rgba(255,255,255,0.04); }
      `}</style>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#08091a]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center">
              <span className="text-sm font-bold" style={{fontFamily:"Orbitron,sans-serif"}}>C</span>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-white/80" style={{fontFamily:"Orbitron,sans-serif"}}>CIPHERPOOL</p>
              <p className="text-[10px] text-white/30 tracking-wider">CHAT CENTRAL</p>
            </div>
          </div>

          <div className="w-px h-8 bg-white/5"></div>

          <div className="flex items-center gap-2">
            <span className="text-lg">{currentChannel?.icon}</span>
            <div>
              <p className="text-sm font-semibold text-white">#{currentChannel?.label}</p>
              <p className="text-[10px] text-white/30">{currentChannel?.desc}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <AnimatePresence>
            {showSearch && (
              <motion.input
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="chat-input bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                autoFocus
              />
            )}
          </AnimatePresence>

          <button
            onClick={() => { setShowSearch(p => !p); setSearchQuery(""); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${showSearch ? "bg-[#7c3aed]/30 text-[#7c3aed]" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>

          <button
            onClick={() => setShowMembers(p => !p)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${showMembers ? "bg-[#7c3aed]/30 text-[#7c3aed]" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>

          {/* Profile chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: avatarColor(profile?.full_name) }}
            >
              {getAvatar(profile?.full_name)}
            </div>
            <span className="text-xs font-medium text-white/70 hidden sm:block max-w-[100px] truncate">
              {profile?.full_name?.split(" ")[0]}
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── CHANNELS SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="w-52 flex-shrink-0 border-r border-white/5 bg-[#06071a] flex flex-col">
          <div className="px-3 pt-4 pb-2">
            <p className="text-[10px] text-white/25 tracking-[2px] font-semibold px-2 mb-2">CANAUX</p>
            <div className="space-y-0.5">
              {CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => switchChannel(ch.id)}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all channel-hover
                    ${channel === ch.id ? "channel-active text-white" : "text-white/40 hover:text-white/70"}`}
                >
                  <span className="text-base w-5 text-center">{ch.icon}</span>
                  <span className="text-sm font-medium truncate">#{ch.label}</span>
                  {unread[ch.id] > 0 && (
                    <span className="ml-auto bg-[#7c3aed] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unread[ch.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 py-2 mt-2 border-t border-white/5">
            <p className="text-[10px] text-white/25 tracking-[2px] font-semibold px-2 mb-2">EN LIGNE — {onlineUsers.length}</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {onlineUsers.slice(0, 15).map(u => {
                const rc = getRoleConfig(u.role);
                return (
                  <div key={u.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/3 transition">
                    <div className="relative">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: avatarColor(u.full_name) }}
                      >
                        {getAvatar(u.full_name)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-[#06071a]"></span>
                    </div>
                    <span className="text-xs text-white/50 truncate">{u.full_name?.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role badge */}
          <div className="mt-auto p-3 border-t border-white/5">
            {(() => {
              const rc = getRoleConfig(profile?.role);
              return (
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: rc.bg }}>
                  <span>{rc.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold tracking-wider" style={{ color: rc.color }}>{rc.label}</p>
                    <p className="text-[9px] text-white/30 truncate max-w-[100px]">{profile?.full_name?.split(" ")[0]}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </aside>

        {/* ── MESSAGE AREA ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#030014] relative">

          {/* Subtle bg pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 relative z-10">

            {/* Welcome banner */}
            {messages.length === 0 && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center py-16"
              >
                <div className="text-6xl mb-4">{currentChannel?.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2" style={{fontFamily:"Orbitron,sans-serif"}}>
                  BIENVENUE SUR #{currentChannel?.label.toUpperCase()}
                </h3>
                <p className="text-white/30 text-sm max-w-xs">{currentChannel?.desc} — Soyez le premier à écrire !</p>
              </motion.div>
            )}

            {searchQuery && displayMessages.length === 0 && (
              <div className="flex items-center justify-center h-32 text-white/30 text-sm">
                Aucun résultat pour "{searchQuery}"
              </div>
            )}

            {groupedMessages.map((msg, idx) => {
              const rc = getRoleConfig(msg.sender?.role);
              const isOwn = msg.sender_id === profile?.id;
              const canDelete = isOwn || isAdmin;

              // Group reactions by emoji
              const reactionGroups = (msg.reactions || []).reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || []);
                acc[r.emoji].push(r.user_id);
                return acc;
              }, {});

              return (
                <div
                  key={msg.id}
                  className={`msg-hover group relative flex gap-3 rounded-xl px-3 py-1 transition-colors hover:bg-white/[0.02] msg-enter
                    ${msg.isGrouped ? "pt-0.5" : "pt-2"}
                    ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                  onMouseEnter={() => setHoveredMsg(msg.id)}
                  onMouseLeave={() => { setHoveredMsg(null); if (reactionPicker === msg.id) setReactionPicker(null); }}
                >
                  {/* Avatar column */}
                  <div className="w-9 flex-shrink-0 flex items-start justify-center pt-0.5">
                    {!msg.isGrouped ? (
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg"
                        style={{ background: avatarColor(msg.sender?.full_name) }}
                      >
                        {getAvatar(msg.sender?.full_name)}
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/15 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {!msg.isGrouped && (
                      <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <span className="text-sm font-semibold text-white/90 hover:text-white cursor-pointer transition">
                          {isOwn ? "Vous" : (msg.sender?.full_name || "Inconnu")}
                        </span>
                        <span
                          className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                          style={{ color: rc.color, background: rc.bg }}
                        >
                          {rc.icon} {rc.label}
                        </span>
                        {!isOwn && msg.sender?.free_fire_id && (
                          <span className="text-[10px] text-white/20 font-mono">FF:{msg.sender.free_fire_id}</span>
                        )}
                        <span className="text-[10px] text-white/20">{formatTime(msg.created_at)}</span>
                      </div>
                    )}

                    <div
                      className="max-w-[75%] px-3 py-2 rounded-2xl"
                      style={{
                        background: isOwn
                          ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                          : "rgba(255,255,255,0.06)",
                        borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        border: isOwn ? "none" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <p className="text-[0.875rem] text-white/90 leading-relaxed break-words">
                        {msg.content}
                      </p>
                    </div>

                    {/* Reactions display */}
                    {Object.keys(reactionGroups).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(reactionGroups).map(([emoji, users]) => {
                          const hasReacted = users.includes(profile?.id);
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border
                                ${hasReacted
                                  ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 text-white"
                                  : "bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                                }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-semibold">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action buttons on hover */}
                  <div className="msg-actions absolute right-3 top-1 flex items-center gap-1 bg-[#0d0f24] border border-white/10 rounded-lg p-1 shadow-xl">
                    <button
                      onClick={() => setReactionPicker(p => p === msg.id ? null : msg.id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition text-sm"
                      title="Réagir"
                    >
                      😊
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition text-sm"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {/* Reaction picker */}
                  <AnimatePresence>
                    {reactionPicker === msg.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 4 }}
                        className="absolute right-3 top-10 flex items-center gap-1 bg-[#0d0f24] border border-white/10 rounded-xl p-2 shadow-2xl z-30"
                      >
                        {REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className="text-xl w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Typing indicator */}
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="w-9 flex-shrink-0"></div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 items-center bg-white/5 px-3 py-2 rounded-xl rounded-bl-sm">
                      <span className="typing-dot w-1.5 h-1.5 bg-white/40 rounded-full"></span>
                      <span className="typing-dot w-1.5 h-1.5 bg-white/40 rounded-full"></span>
                      <span className="typing-dot w-1.5 h-1.5 bg-white/40 rounded-full"></span>
                    </div>
                    <span className="text-[11px] text-white/30 italic">
                      {typingUsers.map(u => u.name).join(", ")} {typingUsers.length === 1 ? "écrit" : "écrivent"}...
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef}></div>
          </div>

          {/* ── INPUT BAR ──────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2 relative z-10">
            <div className="flex items-end gap-2 bg-[#0d0f24] border border-white/8 rounded-xl p-2 glow-border focus-within:border-[#7c3aed]/40 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${currentChannel?.label}...`}
                rows={1}
                className="chat-input flex-1 bg-transparent text-white text-sm resize-none py-2 px-2 max-h-32 leading-relaxed"
                style={{ scrollbarWidth: "none" }}
              />

              <div className="flex items-center gap-1 flex-shrink-0 pb-1">
                {/* Quick reactions */}
                <div className="hidden md:flex gap-0.5">
                  {["🔥", "💀", "👑"].map(e => (
                    <button
                      key={e}
                      onClick={() => setInput(p => p + e)}
                      className="text-base w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/80 hover:bg-white/5 transition"
                    >
                      {e}
                    </button>
                  ))}
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
                  style={{
                    background: input.trim()
                      ? "linear-gradient(135deg, #7c3aed, #06b6d4)"
                      : "rgba(255,255,255,0.05)"
                  }}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-white/15 text-center mt-1.5">
              Entrée pour envoyer · Shift+Entrée pour nouvelle ligne · Règles: respect & fair-play
            </p>
          </div>
        </main>

        {/* ── MEMBERS SIDEBAR ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {showMembers && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-l border-white/5 bg-[#06071a] overflow-hidden"
            >
              <div className="w-[200px] h-full flex flex-col">
                <div className="p-3 border-b border-white/5">
                  <p className="text-[10px] text-white/25 tracking-[2px] font-semibold">MEMBRES EN LIGNE — {onlineUsers.length}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {/* Group by role */}
                  {["super_admin", "admin", "founder", "user"].map(roleKey => {
                    const group = onlineUsers.filter(u => (u.role || "user") === roleKey);
                    if (group.length === 0) return null;
                    const rc = getRoleConfig(roleKey);

                    return (
                      <div key={roleKey} className="mb-3">
                        <p className="text-[9px] font-bold tracking-widest px-2 pb-1 pt-1" style={{ color: rc.color }}>
                          {rc.icon} {rc.label} — {group.length}
                        </p>
                        {group.map(u => (
                          <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/4 transition cursor-default">
                            <div className="relative">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                                style={{ background: avatarColor(u.full_name) }}
                              >
                                {getAvatar(u.full_name)}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#06071a]"></span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-white/70 font-medium truncate">{u.full_name?.split(" ")[0]}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}