import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client";
import Navbar from "../../components/Navbar";

// Mapeamento de status para rótulo + badge colorido
const STATUS = {
  pending:   { label: "Pendente",   badge: badge("ffd166", "333") },
  confirmed: { label: "Confirmada", badge: badge("06d6a0", "fff") },
  denied:    { label: "Negada",     badge: badge("e63946", "fff") },
  completed: { label: "Concluída",  badge: badge("4361ee", "fff") },
};

// Tipos reconhecidos como docente (alinhado com TEACHER_TYPES do backend)
const TEACHER_TYPES = new Set(["teacher", "docente", "professor"]);

function badge(bg, color) {
  return {
    display: "inline-block", padding: "2px 10px", borderRadius: "12px",
    fontSize: "0.72rem", fontWeight: "700",
    background: `#${bg}`, color: `#${color}`,
  };
}

function isTeacher(userType) {
  return !!userType && TEACHER_TYPES.has(userType.trim().toLowerCase());
}

function formatDate(isoStr) {
  const [y, m, d] = isoStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatTime(isoStr) {
  return isoStr.split("T")[1]?.slice(0, 5) ?? "";
}

// ── Toast ───────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast.text) return null;
  const isSuccess = toast.type === "success";
  return (
    <div style={{
      ...s.toast,
      background: isSuccess ? "#06d6a0" : "#e63946",
      animation: "fadeSlideIn 0.3s ease",
    }}>
      <span style={s.toastIcon}>{isSuccess ? "✓" : "✕"}</span>
      {toast.text}
    </div>
  );
}

// ── Modal de confirmação de ação (Confirmar / Negar) ──────────────────
function ActionConfirmModal({ reserva, action, onConfirm, onClose, loading }) {
  const isConfirm = action === "confirm";
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: "400px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
          {isConfirm ? "✅" : "⚠️"}
        </div>
        <h2 style={{ ...s.modalTitle, marginBottom: "0.5rem" }}>
          {isConfirm ? "Confirmar reserva?" : "Negar reserva?"}
        </h2>
        <p style={{ color: "#555", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Você tem certeza que deseja {isConfirm ? "confirmar" : "negar"} a reserva da sala{" "}
          <strong>{reserva.room}</strong> de <strong>{reserva.user_name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            style={isConfirm ? s.btn : s.btnDanger}
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processando..." : isConfirm ? "Sim, confirmar" : "Sim, negar"}
          </button>
          <button style={s.btnSecondary} type="button" onClick={onClose} disabled={loading}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Linha da tabela ──────────────────────────────────────────────
function ReservaRow({ reserva, onAction }) {
  const info = STATUS[reserva.status] ?? { label: reserva.status, badge: {} };
  const isPending = reserva.status === "pending";
  const teacher = isTeacher(reserva.user_type);

  // Linhas de docente recebem fundo levemente destacado
  const rowStyle = teacher
    ? { ...s.tr, background: "#eef4ff" }
    : s.tr;

  return (
    <tr style={rowStyle}>
      <td style={s.td}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>{reserva.user_name}</span>
          <span style={teacher ? s.roleTextTeacher : s.roleText}>
            {reserva.user_type || "—"}
          </span>
        </div>
      </td>
      <td style={s.td}>{reserva.room}</td>
      <td style={s.td}>{formatDate(reserva.start_time)}</td>
      <td style={s.td}>{formatTime(reserva.start_time)} – {formatTime(reserva.end_time)}</td>
      <td style={s.td}><span style={info.badge}>{info.label}</span></td>
      <td style={s.td}>
        {isPending ? (
          <div style={s.actionsCell}>
            <button style={s.btnSm} type="button" onClick={() => onAction(reserva, "confirm")}>
              Confirmar
            </button>
            <button style={{ ...s.btnSm, ...s.btnSmDanger }} type="button" onClick={() => onAction(reserva, "deny")}>
              Negar
            </button>
          </div>
        ) : (
          <span style={s.muted}>—</span>
        )}
      </td>
    </tr>
  );
}

function EquipmentReservationsSection({ onToast }) {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReservas(await api.get("/api/admin/equipment-reservations"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  async function decide(reservation, action) {
    try {
      const result = await api.patch(
        `/api/admin/equipment-reservations/${reservation.id}/${action}`,
        {},
      );
      onToast("success", result.message);
      fetchReservations();
    } catch (requestError) {
      onToast("error", requestError.message);
    }
  }

  return (
    <div style={s.card} data-cy="admin-equipment-reservations">
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={s.cardTitle}>Reservas de computadores</h2>
        <p style={{ ...s.muted, marginTop: "0.25rem" }}>
          Confirme ou negue solicitações pendentes de computadores de laboratório.
        </p>
      </div>

      {loading && <p style={s.muted}>Carregando reservas de computadores...</p>}
      {error && <p style={s.error}>{error}</p>}
      {!loading && !error && reservas.length === 0 && (
        <p style={s.muted}>Nenhuma reserva de computadores no sistema.</p>
      )}

      {!loading && !error && reservas.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Solicitante", "Sala", "Computadores", "Data", "Horário", "Status", "Ações"].map((heading) => (
                  <th key={heading} style={s.th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva) => {
                const info = STATUS[reserva.status] ?? {
                  label: reserva.status,
                  badge: {},
                };
                return (
                  <tr key={reserva.id} data-cy="admin-equipment-reservation-row">
                    <td style={s.td}>{reserva.user_name}</td>
                    <td style={s.td}>{reserva.room}</td>
                    <td style={s.td}>{reserva.computer_quantity}</td>
                    <td style={s.td}>{formatDate(reserva.start_time)}</td>
                    <td style={s.td}>
                      {formatTime(reserva.start_time)} – {formatTime(reserva.end_time)}
                    </td>
                    <td style={s.td}><span style={info.badge}>{info.label}</span></td>
                    <td style={s.td}>
                      {reserva.status === "pending" ? (
                        <div style={s.actionsCell}>
                          <button
                            data-cy="confirm-equipment-reservation"
                            style={s.btnSm}
                            type="button"
                            onClick={() => decide(reserva, "confirm")}
                          >
                            Confirmar
                          </button>
                          <button
                            data-cy="deny-equipment-reservation"
                            style={{ ...s.btnSm, ...s.btnSmDanger }}
                            type="button"
                            onClick={() => decide(reserva, "deny")}
                          >
                            Negar
                          </button>
                        </div>
                      ) : (
                        <span style={s.muted}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────
export default function Reservas() {
  const [reservas, setReservas]         = useState([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [listError, setListError]       = useState("");
  const [aba, setAba] = useState("pendentes"); // pendentes | decididas | todas
  const [pending, setPending]           = useState(null);   // { reserva, action }
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]               = useState({ type: "", text: "" });

  const fetchReservas = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const data = await api.get("/api/admin/reservations");
      setReservas(data);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchReservas(); }, [fetchReservas]);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast({ type: "", text: "" }), 4000);
  }

  function requestAction(reserva, action) {
    setPending({ reserva, action });
  }

  async function confirmAction() {
    if (!pending) return;
    const { reserva, action } = pending;
    setActionLoading(true);
    try {
      const path = `/api/admin/reservations/${reserva.id}/${action}`;
      const result = await api.patch(path, {});
      showToast("success", result.message);
      setPending(null);
      fetchReservas();
    } catch (err) {
      showToast("error", err.message);
      setPending(null);
    } finally {
      setActionLoading(false);
    }
  }

  // Abas aplicadas no client — ordenação (docente → discente) permanece a do backend.
  // - pendentes: apenas pending
  // - decididas: confirmed + denied + completed (tudo que saiu do limbo)
  // - todas: sem filtro
  const reservasFiltradas =
    aba === "pendentes" ? reservas.filter((r) => r.status === "pending") :
    aba === "decididas" ? reservas.filter((r) => r.status !== "pending") :
    reservas;

  const contagens = {
    pendentes: reservas.filter((r) => r.status === "pending").length,
    decididas: reservas.filter((r) => r.status !== "pending").length,
    todas: reservas.length,
  };

  const ABAS = [
    { key: "pendentes", label: "Pendentes" },
    { key: "decididas", label: "Decididas" },
    { key: "todas",     label: "Todas" },
  ];

  return (
    <Navbar>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Toast toast={toast} />

      {pending && (
        <ActionConfirmModal
          reserva={pending.reserva}
          action={pending.action}
          loading={actionLoading}
          onConfirm={confirmAction}
          onClose={() => !actionLoading && setPending(null)}
        />
      )}

      <div style={s.titleRow}>
        <h1 style={s.pageTitle}>Verificação de Reservas</h1>
        <span style={s.amberAccent} aria-hidden="true" />
      </div>

      <div style={s.card}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={s.cardTitle}>Reservas do sistema</h2>
          <p style={{ ...s.muted, marginTop: "0.25rem" }}>
            Reservas de docentes aparecem priorizadas no topo.
          </p>
        </div>

        <div style={s.tabs} role="tablist">
          {ABAS.map((t) => {
            const ativo = aba === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={ativo}
                type="button"
                style={{ ...s.tab, ...(ativo ? s.tabActive : {}) }}
                onClick={() => setAba(t.key)}
              >
                {t.label}
                <span style={{ ...s.tabCount, ...(ativo ? s.tabCountActive : {}) }}>
                  {contagens[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        {loadingList && <p style={s.muted}>Carregando reservas...</p>}
        {listError   && <p style={s.error}>{listError}</p>}

        {!loadingList && !listError && (
          reservasFiltradas.length === 0 ? (
            <p style={s.muted}>
              {aba === "pendentes" ? "Nenhuma reserva pendente." :
               aba === "decididas" ? "Nenhuma reserva decidida ainda." :
               "Nenhuma reserva no sistema."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Solicitante", "Sala", "Data", "Horário", "Status", "Ações"].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map((r) => (
                    <ReservaRow key={r.id} reserva={r} onAction={requestAction} />
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <EquipmentReservationsSection onToast={showToast} />
    </Navbar>
  );
}

// Tokens alinhados a docs/design-system.md (Salla):
// - sombras com tinta navy rgba(30,58,95,0.08/0.18)
// - bordas suaves rgba(0,0,0,0.06)
// - títulos em navy #1e3a5f, acento âmbar #f5a623 reservado ao "check" do logo
// - docente recebe navy institucional para hierarquizar prioridade
const s = {
  titleRow:     { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" },
  pageTitle:    { fontSize: "1.4rem", fontWeight: "700", color: "#1e3a5f", margin: 0 },
  amberAccent:  { display: "inline-block", width: "28px", height: "3px", borderRadius: "2px", background: "#f5a623" },
  card:         { background: "#fff", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(30,58,95,0.08)", border: "1px solid rgba(0,0,0,0.06)" },
  cardTitle:    { fontSize: "1rem", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  modalTitle:   { fontSize: "1rem", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  input:        { width: "100%", padding: "8px 12px", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "6px", fontSize: "0.92rem", boxSizing: "border-box", background: "#fff", color: "#1a1a2e" },
  btn:          { background: "#06d6a0", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
  btnDanger:    { background: "#e63946", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
  btnSecondary: { background: "#f0f0f5", color: "#333", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "600", cursor: "pointer" },
  btnSm:        { background: "#06d6a0", color: "#fff", border: "none", borderRadius: "5px", padding: "4px 12px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" },
  actionsCell:  { display: "inline-flex", gap: "0.4rem", alignItems: "center" },
  tabs:         { display: "flex", gap: "0.25rem", borderBottom: "1px solid rgba(0,0,0,0.06)", marginBottom: "1.25rem" },
  tab:          { display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem", background: "transparent", border: "none", borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "transparent", marginBottom: "-1px", cursor: "pointer", fontSize: "0.88rem", fontWeight: "600", color: "#666" },
  tabActive:    { color: "#1e3a5f", borderBottomColor: "#f5a623" },
  tabCount:     { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "22px", height: "20px", padding: "0 6px", borderRadius: "10px", background: "#f0f0f5", color: "#666", fontSize: "0.72rem", fontWeight: "700" },
  tabCountActive: { background: "#1e3a5f", color: "#fff" },
  btnSmDanger:  { background: "#e63946" },
  error:        { color: "#e63946", fontSize: "0.84rem", margin: 0 },
  muted:        { color: "#888", fontSize: "0.85rem", margin: 0 },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th:           { textAlign: "left", padding: "8px 10px", background: "#f0f0f5", fontSize: "0.78rem", fontWeight: "700", color: "#444" },
  td:           { padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)", verticalAlign: "middle", color: "#1a1a2e" },
  tr:           {},
  roleText:        { fontSize: "0.75rem", color: "#666" },
  roleTextTeacher: { fontSize: "0.75rem", color: "#1e3a5f", fontWeight: "700" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
  modal:        { background: "#fff", borderRadius: "12px", padding: "1.75rem", width: "100%", maxWidth: "460px", boxShadow: "0 8px 40px rgba(30,58,95,0.18)", border: "1px solid rgba(0,0,0,0.06)" },
  toast:        { position: "fixed", top: "1.25rem", left: "50%", transform: "translateX(-50%)", zIndex: 300, color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "8px", fontSize: "0.92rem", fontWeight: "600", boxShadow: "0 4px 16px rgba(30,58,95,0.18)", display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" },
  toastIcon:    { fontSize: "1rem", fontWeight: "700" },
};
