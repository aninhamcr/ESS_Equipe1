import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar";

const STATUS = {
  pending:   { label: "Pendente",   bg: "#ffd166", color: "#7a5000"  },
  confirmed: { label: "Confirmada", bg: "#06d6a0", color: "#004d38"  },
  denied:    { label: "Negada",     bg: "#e63946", color: "#fff"     },
  completed: { label: "Concluída",  bg: "#4361ee", color: "#fff"     },
};

function StatusBadge({ status }) {
  const info = STATUS[status] ?? { label: status, bg: "#ccc", color: "#333" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: "12px",
      fontSize: "0.72rem", fontWeight: "700",
      background: info.bg, color: info.color,
    }}>
      {info.label}
    </span>
  );
}

function toIso(datetimeLocal) {
  return datetimeLocal.length === 16 ? datetimeLocal + ":00" : datetimeLocal;
}

function formatDate(isoStr) {
  const [y, m, d] = isoStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatTime(isoStr) {
  return isoStr.split("T")[1]?.slice(0, 5) ?? "";
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast.text) return null;
  const isSuccess = toast.type === "success";
  return (
    <div style={{
      ...s.toast,
      background: isSuccess ? "#2dc653" : "#e63946",
      animation: "fadeSlideIn 0.3s ease",
    }}>
      <span style={s.toastIcon}>{isSuccess ? "✓" : "✕"}</span>
      {toast.text}
    </div>
  );
}

// ── Nova Reserva ─────────────────────────────────────────────────────────────

function NovaReservaForm({ authHeaders, onCreated, onToast }) {
  const [rooms, setRooms] = useState([]);
  const [roomsError, setRoomsError] = useState(false);
  const [form, setForm] = useState({ room: "", start_time: "", end_time: "", admin_message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/rooms/?limit=100")
      .then(({ rooms }) => {
        setRooms(rooms);
        if (rooms.length > 0) setForm((f) => ({ ...f, room: rooms[0].name }));
      })
      .catch(() => setRoomsError(true));
  }, []);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/reservations/`, {
        room: form.room,
        start_time: toIso(form.start_time),
        end_time: toIso(form.end_time),
        ...(form.admin_message.trim() ? { admin_message: form.admin_message.trim() } : {}),
      }, authHeaders());
      setForm({ room: rooms.length > 0 ? rooms[0].name : "", start_time: "", end_time: "", admin_message: "" });
      onCreated();
      onToast("success", "Reserva criada com sucesso! Aguardando confirmação do administrador.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Nova Reserva</h2>
      <form onSubmit={handleSubmit} style={s.form}>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label} htmlFor="nova-room">Sala</label>
            {roomsError ? (
              <input id="nova-room" style={s.input} value={form.room}
                onChange={set("room")} placeholder="Ex: D005" required />
            ) : (
              <select id="nova-room" style={s.input} value={form.room}
                onChange={set("room")} required>
                {rooms.map((r) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
            )}
          </div>
          <div />
          <div style={s.field}>
            <label style={s.label} htmlFor="nova-start">Início</label>
            <input id="nova-start" style={s.input} type="datetime-local"
              value={form.start_time} onChange={set("start_time")} required />
          </div>
          <div style={s.field}>
            <label style={s.label} htmlFor="nova-end">Fim</label>
            <input id="nova-end" style={s.input} type="datetime-local"
              value={form.end_time} onChange={set("end_time")} required />
          </div>
        </div>
        <div style={s.field}>
          <label style={s.label} htmlFor="nova-msg">
            Mensagem para o administrador{" "}
            <span style={s.optional}>(opcional)</span>
          </label>
          <textarea id="nova-msg" style={s.textarea} rows={3}
            placeholder="Informe o motivo da reserva ou alguma observação relevante..."
            value={form.admin_message} onChange={set("admin_message")} maxLength={500} />
          <span style={s.charCount}>{form.admin_message.length}/500</span>
        </div>
        {error && <p style={s.error}>{error}</p>}
        <div style={{ marginTop: "0.75rem" }}>
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? "Confirmando..." : "Confirmar reserva"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Modal de Edição ───────────────────────────────────────────────────────────

function EditarModal({ reserva, authHeaders, onSaved, onClose }) {
  const [rooms, setRooms] = useState([]);
  const [roomsError, setRoomsError] = useState(false);
  const [form, setForm] = useState({
    room: reserva.room,
    start_time: reserva.start_time.slice(0, 16),
    end_time: reserva.end_time.slice(0, 16),
    admin_message: reserva.admin_message ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/rooms/?limit=100")
      .then(({ rooms }) => setRooms(rooms))
      .catch(() => setRoomsError(true));
  }, []);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const updates = {};
    if (form.room !== reserva.room) updates.room = form.room;
    if (toIso(form.start_time) !== reserva.start_time) updates.start_time = toIso(form.start_time);
    if (toIso(form.end_time) !== reserva.end_time) updates.end_time = toIso(form.end_time);
    const newMsg = form.admin_message.trim();
    const oldMsg = reserva.admin_message ?? "";
    if (newMsg !== oldMsg) updates.admin_message = newMsg;
    if (Object.keys(updates).length === 0) { onClose(); return; }
    setLoading(true);
    try {
      await api.put(`/api/reservations/${reserva.id}`, updates, authHeaders());
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h2 style={s.modalTitle}>Editar Reserva</h2>
          <button style={s.closeBtn} onClick={onClose} type="button">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label} htmlFor="edit-room">Sala</label>
            {roomsError ? (
              <input id="edit-room" style={s.input} value={form.room} onChange={set("room")} required />
            ) : (
              <select id="edit-room" style={s.input} value={form.room} onChange={set("room")} required>
                {rooms.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                {!rooms.find((r) => r.name === form.room) && (
                  <option value={form.room}>{form.room}</option>
                )}
              </select>
            )}
          </div>
          <div style={s.field}>
            <label style={s.label} htmlFor="edit-start">Início</label>
            <input id="edit-start" style={s.input} type="datetime-local"
              value={form.start_time} onChange={set("start_time")} required />
          </div>
          <div style={s.field}>
            <label style={s.label} htmlFor="edit-end">Fim</label>
            <input id="edit-end" style={s.input} type="datetime-local"
              value={form.end_time} onChange={set("end_time")} required />
          </div>
          <div style={s.field}>
            <label style={s.label} htmlFor="edit-msg">
              Mensagem para o administrador{" "}
              <span style={s.optional}>(opcional)</span>
            </label>
            <textarea id="edit-msg" style={s.textarea} rows={3}
              placeholder="Informe o motivo da reserva ou alguma observação relevante..."
              value={form.admin_message} onChange={set("admin_message")} maxLength={500} />
            <span style={s.charCount}>{form.admin_message.length}/500</span>
          </div>
          {error && <p style={s.error}>{error}</p>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? "Salvando..." : "Salvar alterações"}
            </button>
            <button type="button" style={s.btnDanger} onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de confirmação de cancelamento ──────────────────────────────────────

function CancelConfirmModal({ reserva, onConfirm, onClose }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: "380px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
        <h2 style={{ ...s.modalTitle, marginBottom: "0.5rem" }}>Cancelar reserva?</h2>
        <p style={{ color: "#555", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Você tem certeza que deseja cancelar a reserva da sala{" "}
          <strong>{reserva.room}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button style={s.btnDanger} type="button" onClick={onConfirm}>
            Sim, cancelar
          </button>
          <button style={s.btnSecondary} type="button" onClick={onClose}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Detalhes ─────────────────────────────────────────────────────────

function DetalhesModal({ reserva, onEdit, onCancel, onClose }) {
  const isPending    = reserva.status === "pending";
  const isCancellable = reserva.status === "pending" || reserva.status === "confirmed";

  function DetailRow({ label, value }) {
    if (!value) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
        <span style={{ fontSize: "0.92rem", color: "#1a1a2e" }}>{value}</span>
      </div>
    );
  }

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: "480px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ ...s.modalTitle, fontSize: "1.1rem", marginBottom: "6px" }}>
              Sala {reserva.room}
            </h2>
            <StatusBadge status={reserva.status} />
          </div>
          <button style={s.closeBtn} onClick={onClose} type="button">✕</button>
        </div>

        {/* Detalhes */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 1rem" }}>
            <DetailRow label="Data"   value={formatDate(reserva.start_time)} />
            <DetailRow label="Início" value={formatTime(reserva.start_time)} />
            <DetailRow label="Fim"    value={formatTime(reserva.end_time)}   />
          </div>
          {reserva.admin_message && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "5px" }}>
                Mensagem para o administrador
              </span>
              <p style={{ fontSize: "0.92rem", color: "#1a1a2e", margin: 0, lineHeight: "1.5", background: "#f8f8fb", borderRadius: "6px", padding: "8px 10px", borderLeft: "3px solid #d0d0e8" }}>
                {reserva.admin_message}
              </p>
            </div>
          )}
          {reserva.admin_reply && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "5px" }}>
                Resposta do administrador
              </span>
              <p style={{ fontSize: "0.92rem", color: "#1a1a2e", margin: 0, lineHeight: "1.5", background: "#f8f8fb", borderRadius: "6px", padding: "8px 10px", borderLeft: "3px solid #4361ee" }}>
                {reserva.admin_reply}
              </p>
            </div>
          )}
          <DetailRow label="ID da reserva" value={reserva.id} />
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
          {isPending && (
            <button
              type="button"
              style={s.btn}
              onClick={() => { onClose(); onEdit(reserva); }}
            >
              Editar reserva
            </button>
          )}
          {isCancellable && (
            <button
              type="button"
              style={s.btnDanger}
              onClick={() => { onClose(); onCancel(reserva); }}
            >
              Cancelar reserva
            </button>
          )}
          <button type="button" style={s.btnSecondary} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── SortHeader ────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }) {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" style={{ flexShrink: 0, verticalAlign: "middle" }}>
      <path d="M5 1 L9 6 L1 6 Z" fill={active && dir === "asc"  ? "#4361ee" : "#bbb"} />
      <path d="M5 13 L9 8 L1 8 Z" fill={active && dir === "desc" ? "#4361ee" : "#bbb"} />
    </svg>
  );
}

function SortHeader({ label, field, sortConfig, onSort }) {
  const active = sortConfig.field === field;
  const dir    = active ? sortConfig.dir : null;

  return (
    <th
      style={{ ...s.th, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      onClick={() => onSort(field)}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        {label}
        <SortIcon active={active} dir={dir} />
      </span>
    </th>
  );
}

// ── Linha da tabela ───────────────────────────────────────────────────────────

function ReservaRow({ reserva, onEdit, onCancel, onDetalhes, isOdd }) {
  const isPending = reserva.status === "pending";

  return (
    <tr
      className="reserva-row"
      style={{ ...s.tr, background: isOdd ? "#f9f9fc" : "#fff", cursor: "pointer" }}
      onClick={() => onDetalhes(reserva)}
    >
      <td style={s.td}><strong style={{ fontWeight: "600" }}>{reserva.room}</strong></td>
      <td style={s.td}>{formatDate(reserva.start_time)}</td>
      <td style={s.td}>{formatTime(reserva.start_time)}</td>
      <td style={s.td}>{formatTime(reserva.end_time)}</td>
      <td style={s.td}><StatusBadge status={reserva.status} /></td>
      <td style={{ ...s.td }} onClick={(e) => e.stopPropagation()}><div style={{ display: "flex", gap: "0.4rem" }}>
        {isPending && (
          <>
            <button style={s.btnSm} type="button" onClick={() => onEdit(reserva)}>
              Editar
            </button>
            <button style={{ ...s.btnSm, ...s.btnSmDanger }} type="button" onClick={() => onCancel(reserva)}>
              Cancelar
            </button>
          </>
        )}
      </div></td>
    </tr>
  );
}

// ── StatusPills ───────────────────────────────────────────────────────────────

function StatusPills({ value, onChange, counts }) {
  const options = [
    { key: "", label: "Todos" },
    ...Object.entries(STATUS).map(([key, { label }]) => ({ key, label })),
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {options.map(({ key, label }) => {
        const active = value === key;
        const count  = key === "" ? counts._total : (counts[key] ?? 0);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem",
              fontWeight: active ? "700" : "500", cursor: "pointer",
              border: active ? "2px solid #4361ee" : "1.5px solid #d0d0d0",
              background: active ? "#eef1fd" : "#fff",
              color: active ? "#4361ee" : "#555",
              transition: "all 0.15s",
            }}
          >
            {label}
            {count > 0 && (
              <span style={{
                background: active ? "#4361ee" : "#e0e0e8",
                color: active ? "#fff" : "#555",
                borderRadius: "10px", fontSize: "0.68rem",
                fontWeight: "700", padding: "1px 6px", lineHeight: "1.4",
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ReservasSala() {
  const { user } = useAuth();
  const [reservas, setReservas]             = useState([]);
  const [loadingList, setLoadingList]       = useState(true);
  const [listError, setListError]           = useState("");
  const [filtroStatus, setFiltroStatus]     = useState("");
  const [sortConfig, setSortConfig]         = useState({ field: "start_time", dir: "desc" });
  const [editando, setEditando]             = useState(null);
  const [cancelando, setCancelando]         = useState(null);
  const [detalhes, setDetalhes]             = useState(null);
  const [toast, setToast]                   = useState({ type: "", text: "" });

  function authHeaders() {
    return {
      "X-User-Cpf":   user.cpf,
      "X-User-Nome":  user.nome,
      "X-User-Senha": user.senha,
    };
  }

  const fetchReservas = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const data = await api.get(`/api/reservations/my-reservations?user_cpf=${user.cpf}`);
      setReservas(data);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, [user.cpf]);

  useEffect(() => { fetchReservas(); }, [fetchReservas]);

  // Contagens para as pills (sempre sobre todos os dados)
  const counts = useMemo(() => {
    const c = { _total: reservas.length };
    reservas.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [reservas]);

  // Filtro por status (client-side, pois já temos todos os dados)
  const filtered = useMemo(() => {
    if (!filtroStatus) return reservas;
    return reservas.filter((r) => r.status === filtroStatus);
  }, [reservas, filtroStatus]);

  // Sorting
  const sorted = useMemo(() => {
    if (!sortConfig.field) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.field] ?? "";
      let bVal = b[sortConfig.field] ?? "";
      // Comparação de strings/datas
      if (aVal < bVal) return sortConfig.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  function handleSort(field) {
    setSortConfig((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  }

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast({ type: "", text: "" }), 4000);
  }

  function handleEdited() {
    setEditando(null);
    showToast("success", "Reserva atualizada com sucesso!");
    fetchReservas();
  }

  async function confirmCancel() {
    const reserva = cancelando;
    setCancelando(null);
    try {
      await api.delete(`/api/reservations/${reserva.id}`, authHeaders());
      showToast("success", "Reserva cancelada com sucesso.");
      fetchReservas();
    } catch (err) {
      showToast("error", err.message);
    }
  }

  return (
    <Navbar>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reserva-row:hover td { background: #f0f3ff !important; }
      `}</style>

      <Toast toast={toast} />

      {detalhes && (
        <DetalhesModal
          reserva={detalhes}
          onEdit={setEditando}
          onCancel={setCancelando}
          onClose={() => setDetalhes(null)}
        />
      )}

      {editando && (
        <EditarModal
          reserva={editando}
          authHeaders={authHeaders}
          onSaved={handleEdited}
          onClose={() => setEditando(null)}
        />
      )}

      {cancelando && (
        <CancelConfirmModal
          reserva={cancelando}
          onConfirm={confirmCancel}
          onClose={() => setCancelando(null)}
        />
      )}

      <h1 style={s.pageTitle}>Reservas de Sala</h1>

      <NovaReservaForm authHeaders={authHeaders} onCreated={fetchReservas} onToast={showToast} />

      <div style={s.card}>
        {/* Header: título + pills */}
        <div style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ ...s.cardTitle, marginBottom: "0.85rem" }}>Minhas Reservas</h2>
          <StatusPills value={filtroStatus} onChange={setFiltroStatus} counts={counts} />
        </div>

        {loadingList && <p style={s.muted}>Carregando reservas...</p>}
        {listError   && <p style={s.error}>{listError}</p>}

        {!loadingList && !listError && (
          sorted.length === 0 ? (
            <p style={s.muted}>
              {filtroStatus
                ? `Nenhuma reserva com status "${STATUS[filtroStatus]?.label ?? filtroStatus}".`
                : "Você ainda não tem reservas."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <SortHeader label="Sala"   field="room"       sortConfig={sortConfig} onSort={handleSort} />
                    <SortHeader label="Data"   field="start_time" sortConfig={sortConfig} onSort={handleSort} />
                    <th style={s.th}>Início</th>
                    <th style={s.th}>Fim</th>
                    <SortHeader label="Status" field="status"     sortConfig={sortConfig} onSort={handleSort} />
                    <th style={s.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <ReservaRow
                      key={r.id}
                      reserva={r}
                      onEdit={setEditando}
                      onCancel={setCancelando}
                      onDetalhes={setDetalhes}
                      isOdd={i % 2 === 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Rodapé com contagem */}
        {!loadingList && !listError && sorted.length > 0 && (
          <p style={{ ...s.muted, marginTop: "0.75rem", fontSize: "0.78rem" }}>
            {sorted.length} reserva{sorted.length !== 1 ? "s" : ""}
            {filtroStatus ? ` com status "${STATUS[filtroStatus]?.label}"` : " no total"}
          </p>
        )}
      </div>
    </Navbar>
  );
}

const s = {
  pageTitle:    { fontSize: "1.4rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "1.5rem" },
  card:         { background: "#fff", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,.07)" },
  cardTitle:    { fontSize: "1rem", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  modalTitle:   { fontSize: "1rem", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  form:         { display: "flex", flexDirection: "column", gap: "0.85rem" },
  grid2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  field:        { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label:        { fontSize: "0.78rem", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "0.04em" },
  optional:     { fontWeight: "400", color: "#999", textTransform: "none", letterSpacing: "0" },
  input:        { width: "100%", padding: "8px 12px", border: "1px solid #d0d0d0", borderRadius: "6px", fontSize: "0.92rem", boxSizing: "border-box", background: "#fff", color: "#1a1a2e" },
  textarea:     { width: "100%", padding: "8px 12px", border: "1px solid #d0d0d0", borderRadius: "6px", fontSize: "0.92rem", boxSizing: "border-box", background: "#fff", color: "#1a1a2e", resize: "vertical", fontFamily: "inherit" },
  charCount:    { fontSize: "0.72rem", color: "#aaa", textAlign: "right" },
  btn:          { background: "#4361ee", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
  btnDanger:    { background: "#e63946", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
  btnSecondary: { background: "#f0f0f5", color: "#333", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "600", cursor: "pointer" },
  btnSm:        { background: "#4361ee", color: "#fff", border: "none", borderRadius: "5px", padding: "4px 12px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" },
  btnSmDanger:  { background: "#e63946" },
  error:        { color: "#e63946", fontSize: "0.84rem", margin: 0 },
  muted:        { color: "#888", fontSize: "0.88rem" },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th:           { textAlign: "left", padding: "8px 10px", background: "#f0f0f5", fontSize: "0.78rem", fontWeight: "700", color: "#444" },
  td:           { padding: "8px 10px", borderBottom: "1px solid #eee", verticalAlign: "middle", color: "#1a1a2e", transition: "background 0.1s" },
  tr:           {},
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
  modal:        { background: "#fff", borderRadius: "12px", padding: "1.75rem", width: "100%", maxWidth: "460px", boxShadow: "0 8px 32px rgba(0,0,0,.18)" },
  closeBtn:     { background: "none", border: "none", fontSize: "1rem", cursor: "pointer", color: "#888", padding: "2px 6px", borderRadius: "4px" },
  toast:        { position: "fixed", top: "1.25rem", left: "50%", transform: "translateX(-50%)", zIndex: 300, color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "8px", fontSize: "0.92rem", fontWeight: "600", boxShadow: "0 4px 16px rgba(0,0,0,.18)", display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" },
  toastIcon:    { fontSize: "1rem", fontWeight: "700" },
};