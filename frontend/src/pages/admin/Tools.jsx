import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client";
import Navbar from "../../components/Navbar";

const ROLES = ["discente", "docente", "admin"];

// ── Toast ──────────────────────────────────────────────────────────────
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

// ── Gerenciar tipos de usuários ───────────────────────────────────────
function UsersManager({ onToast }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [busyId, setBusyId]   = useState(null);
  const [filtro, setFiltro]   = useState("");
  const [editando, setEditando]     = useState(null); // { user, nome }
  const [excluindo, setExcluindo]   = useState(null); // user
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/api/admin/tools/users");
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function changeType(user, novoTipo) {
    if (novoTipo === user.tipo) return;
    setBusyId(user.id);
    try {
      await api.patch(`/api/admin/tools/users/${user.id}/tipo`, { tipo: novoTipo });
      onToast("success", `${user.nome} agora é ${novoTipo}.`);
      fetchUsers();
    } catch (err) {
      onToast("error", err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmarEdicao() {
    if (!editando) return;
    const novoNome = editando.nome.trim();
    if (!novoNome || novoNome === editando.user.nome) {
      setEditando(null);
      return;
    }
    setModalLoading(true);
    try {
      // PATCH /users/{id} aceita { nome } via UserUpdate
      await api.patch(`/users/${editando.user.id}`, { nome: novoNome });
      onToast("success", `Nome atualizado para "${novoNome}".`);
      setEditando(null);
      fetchUsers();
    } catch (err) {
      onToast("error", err.message);
    } finally {
      setModalLoading(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setModalLoading(true);
    try {
      // Soft delete via /deactivate (preserva histórico e nega reservas ativas)
      await api.patch(`/users/${excluindo.id}/deactivate`, {});
      onToast("success", `${excluindo.nome} foi desativado.`);
      setExcluindo(null);
      fetchUsers();
    } catch (err) {
      onToast("error", err.message);
    } finally {
      setModalLoading(false);
    }
  }

  const usersFiltrados = filtro
    ? users.filter(
        (u) =>
          u.nome.toLowerCase().includes(filtro.toLowerCase()) ||
          u.cpf.includes(filtro)
      )
    : users;

  return (
    <div style={s.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={s.cardTitle}>Gerenciar usuários</h2>
          <p style={s.muted}>Troque o tipo de qualquer usuário (discente / docente / admin).</p>
        </div>
        <input
          style={{ ...s.input, width: "240px" }}
          placeholder="Buscar por nome ou CPF..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {loading && <p style={s.muted}>Carregando usuários...</p>}
      {error   && <p style={s.error}>{error}</p>}

      {!loading && !error && (
        usersFiltrados.length === 0 ? (
          <p style={s.muted}>Nenhum usuário encontrado.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Nome", "CPF", "Tipo atual", "Status", "Alterar tipo", "Ações"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersFiltrados.map((u) => (
                  <tr key={u.id}>
                    <td style={s.td}>{u.nome}</td>
                    <td style={s.td}>{u.cpf}</td>
                    <td style={s.td}>
                      <span style={tipoBadge(u.tipo)}>{u.tipo}</span>
                    </td>
                    <td style={s.td}>
                      <span style={u.status ? s.statusOn : s.statusOff}>
                        {u.status ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <select
                        style={{ ...s.input, padding: "5px 8px", fontSize: "0.82rem" }}
                        value={u.tipo}
                        disabled={busyId === u.id || !u.status}
                        onChange={(e) => changeType(u, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td style={s.td}>
                      <div style={s.actionsCell}>
                        <button
                          type="button"
                          style={s.btnSm}
                          onClick={() => setEditando({ user: u, nome: u.nome })}
                        >
                          Editar nome
                        </button>
                        <button
                          type="button"
                          style={{ ...s.btnSm, ...s.btnSmDanger }}
                          onClick={() => setExcluindo(u)}
                          disabled={!u.status}
                          title={!u.status ? "Usuário já desativado" : ""}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {editando && (
        <EditNameModal
          user={editando.user}
          nome={editando.nome}
          loading={modalLoading}
          onChange={(nome) => setEditando((e) => ({ ...e, nome }))}
          onConfirm={confirmarEdicao}
          onClose={() => !modalLoading && setEditando(null)}
        />
      )}

      {excluindo && (
        <DeleteConfirmModal
          user={excluindo}
          loading={modalLoading}
          onConfirm={confirmarExclusao}
          onClose={() => !modalLoading && setExcluindo(null)}
        />
      )}
    </div>
  );
}

// ── Modal: editar nome ──────────────────────────────────────────────────
function EditNameModal({ user, nome, loading, onChange, onConfirm, onClose }) {
  function handleSubmit(e) {
    e.preventDefault();
    onConfirm();
  }
  const inalterado = nome.trim() === user.nome || !nome.trim();

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={s.modalTitle}>Editar nome do usuário</h2>
          <button style={s.closeBtn} onClick={onClose} type="button" disabled={loading}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label} htmlFor="edit-nome">Novo nome</label>
            <input
              id="edit-nome"
              style={s.input}
              value={nome}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
              required
            />
            <span style={s.muted}>CPF: {user.cpf}</span>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem" }}>
            <button type="submit" style={s.btn} disabled={loading || inalterado}>
              {loading ? "Salvando..." : "Confirmar alteração"}
            </button>
            <button type="button" style={s.btnSecondary} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: confirmar exclusão (soft delete via /deactivate) ────────────
function DeleteConfirmModal({ user, loading, onConfirm, onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: "420px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
        <h2 style={{ ...s.modalTitle, marginBottom: "0.5rem" }}>Excluir usuário?</h2>
        <p style={{ color: "#555", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Você tem certeza que deseja excluir <strong>{user.nome}</strong>?
          O usuário será desativado e suas reservas pendentes/confirmadas serão negadas.
          Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button style={s.btnDanger} type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Excluindo..." : "Sim, excluir"}
          </button>
          <button style={s.btnSecondary} type="button" onClick={onClose} disabled={loading}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gerador de reservas (script) ────────────────────────────────────────
function ReservationSeeder({ onToast }) {
  const [rooms, setRooms]     = useState([]);
  const [form, setForm]       = useState({
    count: 5,
    role: "mixed",
    status: "pending",
    room: "",
    days_window: 14,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/rooms/?limit=100")
      .then(({ rooms }) => setRooms(rooms || []))
      .catch(() => setRooms([]));
  }, []);

  function set(field) {
    return (e) => {
      const value = e.target.type === "number"
        ? Number(e.target.value)
        : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        count: form.count,
        role: form.role,
        status: form.status,
        days_window: form.days_window,
        ...(form.room ? { room: form.room } : {}),
      };
      const res = await api.post("/api/admin/tools/seed-reservations", payload);
      onToast("success", res.message);
    } catch (err) {
      onToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Gerador de reservas (script)</h2>
      <p style={s.muted}>
        Gera reservas em massa sorteando entre os usuários reais do banco para o papel
        escolhido. Útil para popular o sistema em demos e testes.
      </p>

      <form onSubmit={handleSubmit} style={{ ...s.form, marginTop: "1rem" }}>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label} htmlFor="seed-count">Quantidade (1–100)</label>
            <input
              id="seed-count"
              style={s.input}
              type="number"
              min={1}
              max={100}
              value={form.count}
              onChange={set("count")}
              required
            />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="seed-role">Papel do solicitante</label>
            <select id="seed-role" style={s.input} value={form.role} onChange={set("role")}>
              <option value="mixed">Misto (discente + docente)</option>
              <option value="discente">Discente</option>
              <option value="docente">Docente</option>
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="seed-status">Status inicial</label>
            <select id="seed-status" style={s.input} value={form.status} onChange={set("status")}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="denied">Denied</option>
              <option value="random">Aleatório</option>
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="seed-room">Sala</label>
            <select id="seed-room" style={s.input} value={form.room} onChange={set("room")}>
              <option value="">Aleatória (qualquer cadastrada)</option>
              {rooms.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="seed-days">Janela (próximos N dias)</label>
            <input
              id="seed-days"
              style={s.input}
              type="number"
              min={1}
              max={180}
              value={form.days_window}
              onChange={set("days_window")}
              required
            />
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? "Gerando..." : "Gerar reservas"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Gerador de manutenções (script) ──────────────────────────────────
function MaintenanceSeeder({ onToast }) {
  const [rooms, setRooms]     = useState([]);
  const [form, setForm]       = useState({
    count: 5,
    status: "pending",
    room: "",
    days_window: 14,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/rooms/?limit=100")
      .then(({ rooms }) => setRooms(rooms || []))
      .catch(() => setRooms([]));
  }, []);

  function set(field) {
    return (e) => {
      const value = e.target.type === "number"
        ? Number(e.target.value)
        : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        count: form.count,
        status: form.status,
        days_window: form.days_window,
        ...(form.room ? { room: form.room } : {}),
      };
      const res = await api.post("/api/admin/tools/seed-maintenance", payload);
      onToast("success", res.message);
    } catch (err) {
      onToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Gerador de manutenções (script)</h2>
      <p style={s.muted}>
        Gera solicitações de manutenção em massa sorteando entre os docentes ativos
        do banco. Útil para popular o sistema em demos e testes da página /manutencoes.
      </p>

      <form onSubmit={handleSubmit} style={{ ...s.form, marginTop: "1rem" }}>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label} htmlFor="seed-maint-count">Quantidade (1–100)</label>
            <input
              id="seed-maint-count"
              style={s.input}
              type="number"
              min={1}
              max={100}
              value={form.count}
              onChange={set("count")}
              required
            />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="seed-maint-status">Status inicial</label>
            <select id="seed-maint-status" style={s.input} value={form.status} onChange={set("status")}>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmada</option>
              <option value="denied">Negada</option>
              <option value="random">Aleatório</option>
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="seed-maint-room">Sala</label>
            <select id="seed-maint-room" style={s.input} value={form.room} onChange={set("room")}>
              <option value="">Aleatória (qualquer cadastrada)</option>
              {rooms.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="seed-maint-days">Janela do fim (dias, apenas confirmadas)</label>
            <input
              id="seed-maint-days"
              style={s.input}
              type="number"
              min={1}
              max={180}
              value={form.days_window}
              onChange={set("days_window")}
              required
            />
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? "Gerando..." : "Gerar manutenções"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────
export default function Tools() {
  const [toast, setToast] = useState({ type: "", text: "" });

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast({ type: "", text: "" }), 4000);
  }

  return (
    <Navbar>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Toast toast={toast} />

      <div style={s.titleRow}>
        <h1 style={s.pageTitle}>Admin Tools</h1>
        <span style={s.amberAccent} aria-hidden="true" />
      </div>
      <p style={{ ...s.muted, marginBottom: "1.5rem" }}>
        Ferramentas para administração avançada do sistema.
      </p>

      <UsersManager onToast={showToast} />
      <ReservationSeeder onToast={showToast} />
      <MaintenanceSeeder onToast={showToast} />
    </Navbar>
  );
}

// ── Helpers de estilo ────────────────────────────────────────────────
// Cores alinhadas ao design system (docs/design-system.md):
// - admin: navy primário (identidade institucional)
// - docente: azul elétrico (ação/autoridade ativa)
// - discente: âmbar claro derivado do amarelo pendente da paleta
function tipoBadge(tipo) {
  const colors = {
    admin:    { bg: "#1e3a5f", color: "#fff" },
    docente:  { bg: "#4361ee", color: "#fff" },
    discente: { bg: "#ffd166", color: "#333" },
  }[tipo] || { bg: "#e0e0e0", color: "#333" };
  return {
    display: "inline-block", padding: "2px 10px", borderRadius: "12px",
    fontSize: "0.72rem", fontWeight: "700",
    background: colors.bg, color: colors.color,
    textTransform: "uppercase", letterSpacing: "0.04em",
  };
}

// Tokens consistentes com docs/design-system.md (Salla):
// - sombras com leve tonalidade navy (rgba(30,58,95,0.08))
// - bordas em rgba(0,0,0,0.06)
// - texto primário #1a1a2e / secundário #555 / muted #888
// - títulos em navy #1e3a5f, acento âmbar #f5a623 reservado para a identidade do "check"
const s = {
  titleRow:     { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" },
  pageTitle:    { fontSize: "1.4rem", fontWeight: "700", color: "#1e3a5f", margin: 0 },
  amberAccent:  { display: "inline-block", width: "28px", height: "3px", borderRadius: "2px", background: "#f5a623" },
  card:         { background: "#fff", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(30,58,95,0.08)", border: "1px solid rgba(0,0,0,0.06)" },
  cardTitle:    { fontSize: "1rem", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  form:         { display: "flex", flexDirection: "column", gap: "0.85rem" },
  grid2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  field:        { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label:        { fontSize: "0.78rem", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "0.04em" },
  input:        { width: "100%", padding: "8px 12px", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "6px", fontSize: "0.92rem", boxSizing: "border-box", background: "#fff", color: "#1a1a2e" },
  btn:          { background: "#4361ee", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
  btnDanger:    { background: "#e63946", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
  btnSecondary: { background: "#f0f0f5", color: "#333", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "0.9rem", fontWeight: "600", cursor: "pointer" },
  btnSm:        { background: "#4361ee", color: "#fff", border: "none", borderRadius: "5px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" },
  btnSmDanger:  { background: "#e63946" },
  actionsCell:  { display: "inline-flex", gap: "0.4rem", alignItems: "center" },
  modalTitle:   { fontSize: "1rem", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
  modal:        { background: "#fff", borderRadius: "12px", padding: "1.75rem", width: "100%", maxWidth: "460px", boxShadow: "0 8px 40px rgba(30,58,95,0.18)", border: "1px solid rgba(0,0,0,0.06)" },
  closeBtn:     { background: "none", border: "none", fontSize: "1rem", cursor: "pointer", color: "#888", padding: "2px 6px", borderRadius: "4px" },
  error:        { color: "#e63946", fontSize: "0.84rem", margin: 0 },
  muted:        { color: "#888", fontSize: "0.85rem", margin: 0 },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th:           { textAlign: "left", padding: "8px 10px", background: "#f0f0f5", fontSize: "0.78rem", fontWeight: "700", color: "#444" },
  td:           { padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)", verticalAlign: "middle", color: "#1a1a2e" },
  statusOn:     { color: "#06d6a0", fontSize: "0.82rem", fontWeight: "600" },
  statusOff:    { color: "#888", fontSize: "0.82rem", fontWeight: "600" },
  toast:        { position: "fixed", top: "1.25rem", left: "50%", transform: "translateX(-50%)", zIndex: 300, color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "8px", fontSize: "0.92rem", fontWeight: "600", boxShadow: "0 4px 16px rgba(30,58,95,0.18)", display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" },
  toastIcon:    { fontSize: "1rem", fontWeight: "700" },
};
