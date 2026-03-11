import { useState } from "react";

const DURATIONS = [
  { label: "1 min", value: 1 },
  { label: "2 min", value: 2 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
];

export default function StartMatchModal({ onConfirm, onClose }) {
  const [selected, setSelected] = useState(10);
  const [custom, setCustom] = useState("");

  const finalDuration = custom ? parseInt(custom) : selected;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg,#0f0f1a,#1a0a2e)",
          border: "1px solid rgba(139,92,246,0.4)",
          borderRadius: 16,
          padding: 32,
          width: 420,
          maxWidth: "90vw",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#a78bfa",
              letterSpacing: 2,
            }}
          >
            LANCER LE MATCH
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
            Choisissez la durée du match
          </div>
        </div>

        {/* Duration presets */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => { setSelected(d.value); setCustom(""); }}
              style={{
                padding: "12px 4px",
                borderRadius: 10,
                border: selected === d.value && !custom
                  ? "2px solid #7c3aed"
                  : "1px solid rgba(255,255,255,0.1)",
                background: selected === d.value && !custom
                  ? "rgba(124,58,237,0.3)"
                  : "rgba(255,255,255,0.03)",
                color: selected === d.value && !custom ? "#a78bfa" : "#9ca3af",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, letterSpacing: 1 }}
          >
            OU DURÉE PERSONNALISÉE (minutes)
          </div>
          <input
            type="number"
            min="1"
            max="180"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setSelected(0); }}
            placeholder="Ex: 25"
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: custom
                ? "1px solid #7c3aed"
                : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#e2e8f0",
              fontSize: 16,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Preview */}
        <div
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#9ca3af", fontSize: 13 }}>Durée sélectionnée</span>
          <span style={{ color: "#10b981", fontWeight: 800, fontSize: 20 }}>
            {finalDuration || "?"} min
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#9ca3af",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ANNULER
          </button>
          <button
            onClick={() => finalDuration > 0 && onConfirm(finalDuration)}
            disabled={!finalDuration || finalDuration <= 0}
            style={{
              flex: 2,
              padding: "13px 0",
              borderRadius: 8,
              border: "none",
              background: finalDuration > 0
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "rgba(255,255,255,0.05)",
              color: finalDuration > 0 ? "#fff" : "#4b5563",
              fontWeight: 800,
              cursor: finalDuration > 0 ? "pointer" : "not-allowed",
              fontSize: 15,
              letterSpacing: 1,
              boxShadow: finalDuration > 0 ? "0 0 20px rgba(16,185,129,0.3)" : "none",
            }}
          >
            ▶ LANCER ({finalDuration || "?"}min)
          </button>
        </div>
      </div>
    </div>
  );
}