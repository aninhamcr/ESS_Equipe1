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

function badge(bg, color) {
  return {
    display: "inline-block", padding: "2px 10px", borderRadius: "12px",
    fontSize: "0.72rem", fontWeight: "700",
    background: `#${bg}`, color: `#${color}`,
  };
}

// Converte ISO/Date string em dd/mm/yyyy; retorna "—" quando ausente.
function formatDate(isoStr) {
  if (!isoStr) return "—";
  const [y, m, d] = isoStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

// Data mínima permitida no input de data de fim (hoje em YYYY-MM-DD).
function todayIso() {
  const t = new Date();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${mm}-${dd}`;
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

// ── Modal de confirmação (preenche data de fim) ──────────────────────────────
// Também serve como segundo passo quando o backend devolve 409 com aviso
// de reservas pendentes (Cenário 4): exibe a mensagem e reenvia com force=true.
function ConfirmModal({ request, pendingWarning, endDate, onEndDateChange, onSubmit, onClose, loading }) {
  const today = todayIso();
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: "440px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={s.modalTitle}>Confirmar manutenção</h2>
          <button style={s.closeBtn} onClick={onClose} type="button" disabled={loading}>✕</button>
        </div>

        <p style={{ color: "#555", fontSize: "0.92rem", marginBottom: "1rem" }}>
          Sala <strong>{request.room}</strong> — solicitação de{" "}
          <strong>{request.teacher_name}</strong>.
        </p>

        <div style={s.field}>
          <label style={s.label} htmlFor="end-date">
            Data de fim da manutenção <span style={s.required}>*</span>
          </label>
          <input
            id="end-date"
            type="date"
            style={s.input}
            min={today}
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {pendingWarning && (
          <div style={s.warningBox}>
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>⚠️ Atenção</strong>
            <span style={{ fontSize: "0.88rem" }}>{pendingWarning}</span>
            <p style={{ fontSize: "0.82rem", color: "#666", marginTop: "0.5rem", marginBottom: 0 }}>
              Ao prosseguir, as reservas pendentes no período serão automaticamente negadas.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
          <button style={s.btnSecondary} type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button style={s.btn} type="button" onClick={onSubmit} disabled={loading || !endDate}>
            {loading ? "Processando..." : pendingWarning ? "Sim, confirmar mesmo assim" : "Confirmar manutenção"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de negação ─────────────────────────────────────────────────────────
function DenyModal({ request, onConfirm, onClose, loading }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: "400px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
        <h2 style={{ ...s.modalTitle, marginBottom: "0.5rem" }}>Negar solicitação?</h2>
        <p style={{ color: "#555", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Você tem certeza que deseja negar a solicitação de manutenção da sala{" "}
          <strong>{request.room}</strong> de <strong>{request.teacher_name}</strong>?
          A sala permanece disponível para reservas.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button style={s.btnDanger} type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Processando..." : "Sim, negar"}
          </button>
          <button style={s.btnSecondary} type="button" onClick={onClose} disabled={loading}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Linha da tabela ──────────────────────────────────────────────────────────
function RequestRow({ request, onConfirm, onDeny }) {
  const info = STATUS[request.status] ?? { label: request.status, badge: {} };
  const isPending = request.status === "pending";

  return (
    <tr>
      <td style={s.td}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>{request.teacher_name}</span>
          <span style={s.roleText}>docente</span>
        </div>
      </td>
      <td style={s.td}>{request.room}</td>
      <td style={{ ...s.td, maxWidth: "280px" }}>
        <span style={s.descText} title={request.description}>
          {request.description.length > 60
            ? request.description.slice(0, 60) + "…"
            : request.description}
        </span>
      </td>
      <td style={s.td}><span style={info.badge}>{info.label}</span></td>
      <td style={s.td}>{formatDate(request.start_date)}</td>
      <td style={s.td}>{formatDate(request.end_date)}</td>
      <td style={s.td}>
        {isPending ? (
          <div style={s.actionsCell}>
            <button style={s.btnSm} type="button" onClick={() => onConfirm(request)}>
              Confirmar
            </button>
            <button style={{ ...s.btnSm, ...s.btnSmDanger }} type="button" onClick={() => onDeny(request)}>
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

// ── Página principal ────────────────────────────────────────────────────────
export default function Manutencoes() {
  const [requests, setRequests]         = useState([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [listError, setListError]       = useState("");
  const [aba, setAba] = useState("pendentes"); // pendentes | decididas | todas

  // Estado dos modais
  const [confirmTarget, setConfirmTarget]   = useState(null); // solicitação alvo
  const [endDate, setEndDate]               = useState("");
  const [pendingWarning, setPendingWarning] = useState("");   // mensagem do 409 pending
  const [denyTarget, setDenyTarget]         = useState(null);
  const [actionLoading, setActionLoading]   = useState(false);

  const [toast, setToast] = useState({ type: "", text: "" });

  const fetchRequests = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const data = await api.get("/api/maintenance/admin/requests");
      setRequests(data);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast({ type: "", text: "" }), 4000);
  }

  // Abre o modal de confirmação limpando estado anterior.
  function openConfirm(req) {
    setConfirmTarget(req);
    setEndDate("");
    setPendingWarning("");
  }

  function closeConfirm() {
    if (actionLoading) return;
    setConfirmTarget(null);
    setEndDate("");
    setPendingWarning("");
  }

  // Submete o PUT /confirm. Se receber 409 com reservas pendentes, mantém o
  // modal aberto e mostra o aviso; o próximo submit envia force=true.
  async function submitConfirm() {
    if (!confirmTarget || !endDate) return;
    setActionLoading(true);
    try {
      const force = !!pendingWarning;
      await api.put(
        `/api/maintenance/admin/${confirmTarget.id}/confirm`,
        { end_date: endDate, force }
      );
      showToast("success", "Manutenção confirmada com sucesso");
      setConfirmTarget(null);
      setEndDate("");
      setPendingWarning("");
      fetchRequests();
    } catch (err) {
      // Backend devolve 409 nos dois cenários de conflito.
      // - Cenário 4 (pendentes): detail é objeto { message, pending_reservation_ids }
      // - Cenário 5 (confirmadas): detail é string com a mensagem de bloqueio
      const isPendingConflict =
        err.status === 409 &&
        err.detail &&
        typeof err.detail === "object" &&
        Array.isArray(err.detail.pending_reservation_ids);

      const isConfirmedConflict =
        err.status === 409 && typeof err.detail === "string";

      if (isPendingConflict) {
        setPendingWarning(err.detail.message || err.message);
      } else if (isConfirmedConflict) {
        showToast("error", err.message);
        setConfirmTarget(null);
        setEndDate("");
        setPendingWarning("");
      } else {
        showToast("error", err.message);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function submitDeny() {
    if (!denyTarget) return;
    setActionLoading(true);
    try {
      await api.put(`/api/maintenance/admin/${denyTarget.id}/deny`, {});
      showToast("success", "Solicitação negada com sucesso");
      setDenyTarget(null);
      fetchRequests();
    } catch (err) {
      showToast("error", err.message);
      setDenyTarget(null);
    } finally {
      setActionLoading(false);
    }
  }

  // Filtros por aba (aplicados no client).
  const requestsFiltrados =
    aba === "pendentes" ? requests.filter((r) => r.status === "pending") :
    aba === "decididas" ? requests.filter((r) => r.status !== "pending") :
    requests;

  const contagens = {
    pendentes: requests.filter((r) => r.status === "pending").length,
    decididas: requests.filter((r) => r.status !== "pending").length,
    todas:     requests.length,
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

      {confirmTarget && (
        <ConfirmModal
          request={confirmTarget}
          pendingWarning={pendingWarning}
          endDate={endDate}
          onEndDateChange={setEndDate}
          onSubmit={submitConfirm}
          onClose={closeConfirm}
          loading={actionLoading}
        />
      )}

      {denyTarget && (
        <DenyModal
          request={denyTarget}
          onConfirm={submitDeny}
          onClose={() => !actionLoading && setDenyTarget(null)}
          loading={actionLoading}
        />
      )}

      <div style={s.titleRow}>
        <h1 style={s.pageTitle}>Verificação de Manutenções</h1>
        <span style={s.amberAccent} aria-hidden="true" />
      </div>

      <div style={s.card}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={s.cardTitle}>Solicitações de manutenção</h2>
          <p style={{ ...s.muted, marginTop: "0.25rem" }}>
            Confirme para colocar a sala em manutenção ou negue para manter a sala disponível.
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

        {loadingList && <p style={s.muted}>Carregando solicitações...</p>}
        {listError   && <p style={s.error}>{listError}</p>}

        {!loadingList && !listError && (
          requestsFiltrados.length === 0 ? (
            <p style={s.muted}>
              {aba === "pendentes" ? "Nenhuma solicitação pendente." :
               aba === "decididas" ? "Nenhuma solicitação decidida ainda." :
               "Nenhuma solicitação no sistema."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Solicitante", "Sala", "Descrição", "Status", "Início", "Fim", "Ações"].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requestsFiltrados.map((r) => (
                    <RequestRow
                      key={r.id}
                      request={r}
                      onConfirm={openConfirm}
                      onDeny={setDenyTarget}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </Navbar>
  );
}

// Tokens alinhados ao design-system do projeto (mesmos da página /reservas)
const s = {
  titleRow:     { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" },
  pageTitle:    { fontSize: "1.4rem", fontWeight: "700", color: "#1e3a5f", margin: 0 },
  amberAccent:  { display: "inline-block", width: "28px", height: "3px", borderRadius: "2px", background: "#f5a623" },
  card:         { background: "#fff", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(30,58,95,0.08)", border: "1px solid rgba(0,0,0,0.06)" },
  cardTitle:    { fontSize: "1rem", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  modalTitle:   { fontSize: "1rem", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  field:        { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label:        { fontSize: "0.78rem", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "0.04em" },
  required:     { color: "#e63946", fontWeight: "700" },
  input:        { width: "100%", padding: "8px 12px", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "6px", fontSize: "0.92rem", boxSizing: "border-box", background: "#fff", color: "#1a1a2e" },
  btn:          { background: "#06d6a0", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
  btnDanger:    { background: "#e63946", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
  btnSecondary: { background: "#f0f0f5", color: "#333", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "600", cursor: "pointer" },
  btnSm:        { background: "#06d6a0", color: "#fff", border: "none", borderRadius: "5px", padding: "4px 12px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" },
  btnSmDanger:  { background: "#e63946" },
  closeBtn:     { background: "none", border: "none", fontSize: "1rem", cursor: "pointer", color: "#888", padding: "2px 6px", borderRadius: "4px" },
  actionsCell:  { display: "inline-flex", gap: "0.4rem", alignItems: "center" },
  tabs:         { display: "flex", gap: "0.25rem", borderBottom: "1px solid rgba(0,0,0,0.06)", marginBottom: "1.25rem" },
  tab:          { display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem", background: "transparent", border: "none", borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "transparent", marginBottom: "-1px", cursor: "pointer", fontSize: "0.88rem", fontWeight: "600", color: "#666" },
  tabActive:    { color: "#1e3a5f", borderBottomColor: "#f5a623" },
  tabCount:     { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "22px", height: "20px", padding: "0 6px", borderRadius: "10px", background: "#f0f0f5", color: "#666", fontSize: "0.72rem", fontWeight: "700" },
  tabCountActive: { background: "#1e3a5f", color: "#fff" },
  error:        { color: "#e63946", fontSize: "0.84rem", margin: 0 },
  muted:        { color: "#888", fontSize: "0.85rem", margin: 0 },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th:           { textAlign: "left", padding: "8px 10px", background: "#f0f0f5", fontSize: "0.78rem", fontWeight: "700", color: "#444" },
  td:           { padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)", verticalAlign: "middle", color: "#1a1a2e" },
  descText:     { display: "block", color: "#555" },
  roleText:     { fontSize: "0.75rem", color: "#666" },
  warningBox:   { marginTop: "0.85rem", padding: "0.75rem 0.9rem", borderRadius: "6px", background: "#fff8e1", border: "1px solid #ffd166", color: "#5a4500" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
  modal:        { background: "#fff", borderRadius: "12px", padding: "1.75rem", width: "100%", maxWidth: "460px", boxShadow: "0 8px 40px rgba(30,58,95,0.18)", border: "1px solid rgba(0,0,0,0.06)" },
  toast:        { position: "fixed", top: "1.25rem", left: "50%", transform: "translateX(-50%)", zIndex: 300, color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "8px", fontSize: "0.92rem", fontWeight: "600", boxShadow: "0 4px 16px rgba(30,58,95,0.18)", display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" },
  toastIcon:    { fontSize: "1rem", fontWeight: "700" },
};
