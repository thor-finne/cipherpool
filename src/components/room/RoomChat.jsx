import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function RoomChat({
  messages,
  onSendMessage,
  currentUser,
  role,
  roomLocked,
  onSelectPlayer,
  accentColor,
}) {
  const [newMessage, setNewMessage] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsNearBottom(nearBottom);
  };

  const handleTyping = () => {
    if (role === "spectator") return;
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage("");
  };

  if (role === "spectator") {
    return (
      <div className="h-full bg-[#0E111A] flex flex-col border-t border-white/10">
        <div className="px-4 py-3 flex items-center justify-between bg-[#11151F] border-b border-white/10">
          <h3 className="text-sm font-semibold text-white tracking-wide">ROOM CHAT</h3>
          <span className="text-xs text-white/40">{messages.length} Messages</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40 text-sm">👀 Spectator mode - Chat disabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0E111A] flex flex-col border-t border-white/10">

      <div className="px-4 py-3 flex items-center justify-between bg-[#11151F] border-b border-white/10">
        <h3 className="text-sm font-semibold text-white tracking-wide">ROOM CHAT</h3>
        <span className="text-xs text-white/40">{messages.length} Messages</span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-purple-600/30"
      >
        <AnimatePresence>
          {messages.map((msg) => {
            const isCurrentUser = msg.user_id === currentUser?.id;
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-3 group ${isCurrentUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  onClick={() => onSelectPlayer(msg)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer bg-gradient-to-br from-purple-600 to-indigo-600 hover:scale-110 transition flex-shrink-0"
                  style={{
                    background: accentColor ? `linear-gradient(135deg, ${accentColor}, #4C1D95)` : undefined
                  }}
                >
                  {msg.profiles?.full_name?.charAt(0) || "U"}
                </div>

                <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                    <span
                      onClick={() => onSelectPlayer(msg)}
                      className={`text-xs font-semibold cursor-pointer hover:underline ${
                        isCurrentUser ? 'text-purple-400 order-2' : 'text-purple-400'
                      }`}
                    >
                      {isCurrentUser ? 'You' : (msg.profiles?.full_name?.split(' ')[0] || "Player")}
                    </span>

                    <span className="text-[10px] text-white/30">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {msg.user_id === currentUser?.id && role === "organizer" && (
                      <span className="text-[8px] bg-purple-600/20 text-purple-400 px-1.5 py-0.5 rounded-full">
                        ORG
                      </span>
                    )}
                  </div>

                  <p className={`text-sm text-white/80 mt-1 leading-relaxed break-words ${
                    isCurrentUser ? 'text-purple-100' : ''
                  }`}>
                    {msg.message}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-white/40 text-xs"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
            <span>{typingUsers.join(', ')} typing...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!roomLocked && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-[#11151F] border-t border-white/10"
        >
          <div className="flex gap-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleTyping}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-[#0E111A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition transform hover:scale-105"
              style={{ backgroundColor: accentColor }}
            >
              Send
            </button>
          </div>
        </form>
      )}

      {roomLocked && (
        <div className="p-4 bg-[#11151F] border-t border-white/10 text-center text-white/40 text-sm">
          🔒 Room locked - Chat disabled
        </div>
      )}
    </div>
  );
}