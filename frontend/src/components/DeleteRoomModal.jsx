import React from "react";

export default function DeleteRoomModal({ room, onClose, onConfirm, loading, error }) {
  if (!room) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box sm">
        <div className="modal-nav danger">
          <span className="modal-nav-title">Excluir sala</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#FCEBEB", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, marginTop: 2,
              }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 6v4m0 4h.01M3 10a7 7 0 1 1 14 0A7 7 0 0 1 3 10Z"
                    stroke="#A32D2D" strokeWidth="1.6" strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1E3A5F", marginBottom: 5 }}>
                  Tem certeza que deseja excluir?
                </div>
                <div style={{ fontSize: 13, color: "#6a7e92", lineHeight: 1.55 }}>
                  A sala <strong style={{ color: "#1E3A5F" }}>"{room.name}"</strong> será removida
                  permanentemente do sistema. Esta ação não pode ser desfeita.
                </div>
              </div>
            </div>

            {error && <p style={{ color: "#E24B4A", fontSize: 12 }}>{error}</p>}

            <hr className="divider-sala" />
            <div className="form-actions-sala">
              <button className="btn-sec-sala" onClick={onClose} disabled={loading}>Cancelar</button>
              <button
                onClick={onConfirm}
                disabled={loading}
                style={{
                  padding: "8px 20px", borderRadius: 7, border: "none",
                  background: loading ? "#c56b6b" : "#A32D2D", color: "#fff",
                  fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "background .15s",
                }}
              >
                {loading ? "Excluindo…" : "Sim, excluir sala"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
