import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import Navbar from "../components/Navbar";
import { FiEye, FiEyeOff } from "react-icons/fi";

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <span style={{ fontSize: "0.72rem", color: "#2c6fac", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.92rem", color: "#555" }}>{value || "—"}</span>
    </div>
  );
}

export default function Perfil() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(user?.nome || "");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState("");

  const [confirmarDesativacao, setConfirmarDesativacao] = useState(false);
  const [desativandoLoading, setDesativandoLoading] = useState(false);
  const [desativarError, setDesativarError] = useState("");

  async function handleSalvar(e) {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");

    const payload = {};
    if (nome && nome !== user?.nome) payload.nome = nome;
    if (senha) payload.senha = senha;
    if (Object.keys(payload).length === 0) {
      setEditError("Nenhuma alteração detectada.");
      return;
    }

    setEditLoading(true);
    try {
      const updated = await api.patch(`/users/${user.id}`, payload);
      updateUser(updated);
      setEditSuccess("Dados atualizados com sucesso!");
      setSenha("");
      setEditando(false);
    } catch (err) {
      setEditError(
        err.response?.data?.detail ||
        err.message ||
        "Erro ao atualizar dados"
      );
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDesativar() {
    setDesativandoLoading(true);
    setDesativarError("");
    try {
      await api.patch(`/users/${user.id}/deactivate`);
      logout();
      navigate("/login");
    } catch (err) {
      setDesativarError(err.message);
      setDesativandoLoading(false);
    }
  }

  return (
    <Navbar>
      <div style={s.page}>
        <h1 style={s.title}>Meu Perfil</h1>

        {/* Dados */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Dados cadastrais</span>
            {!editando && (
              <button style={s.editBtn} onClick={() => { setEditando(true); setEditSuccess(""); }}>
                Editar
              </button>
            )}
          </div>

          {!editando ? (
            <>
              {editSuccess && <p style={s.success}>{editSuccess}</p>}
              <div style={s.grid}>
                <InfoRow label="Nome"      value={user?.nome} />
                <InfoRow label="CPF"       value={user?.cpf} />
                <InfoRow label="Tipo de Vínculo"      value={user?.tipo ? String(user.tipo).toUpperCase() : user?.tipo} />
                {user?.matricula && <InfoRow label="Matrícula" value={user.matricula} />}
                {user?.curso     && <InfoRow label="Curso"     value={user.curso} />}
                {user?.siape     && <InfoRow label="SIAPE"     value={user.siape} />}
              </div>
            </>
          ) : (
            <form onSubmit={handleSalvar} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Nome</label>
                <input
                  style={s.input}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>
                  Nova senha{" "}
                  <span style={s.optional}>(deixe em branco para não alterar)</span>
                </label>
                <div style={s.passwordField}>
                  <input
                    style={s.inputPassword}
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    minLength={senha ? 6 : undefined}
                  />
                  <button
                    type="button"
                    style={s.togglePasswordBtn}
                    onClick={() => setMostrarSenha((prev) => !prev)}
                  >
                    {mostrarSenha ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              {editError && <p style={s.error}>{editError}</p>}
              <div style={s.formActions}>
                <button type="submit" style={s.saveBtn} disabled={editLoading}>
                  {editLoading ? "Salvando..." : "Salvar alterações"}
                </button>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => {
                    setEditando(false);
                    setNome(user?.nome || "");
                    setSenha("");
                    setEditError("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Desativar conta */}
        <div style={s.dangerCard}>
          <div style={s.cardHeader}>
            <div>
              <span style={s.dangerTitle}>Desativar conta</span>
              <p style={s.dangerDesc}>
                Sua conta será desativada e todas as reservas pendentes ou confirmadas serão canceladas. 
                <br/> Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          {!confirmarDesativacao ? (
            <button style={s.dangerBtn} onClick={() => setConfirmarDesativacao(true)}>
              Desativar minha conta
            </button>
          ) : (
            <div style={s.confirmBox}>
              <p style={s.confirmText}>Tem certeza? Esta ação é irreversível.</p>
              {desativarError && <p style={s.error}>{desativarError}</p>}
              <div style={s.formActions}>
                <button style={s.dangerBtnSolid} onClick={handleDesativar} disabled={desativandoLoading}>
                  {desativandoLoading ? "Desativando..." : "Sim, desativar"}
                </button>
                <button
                  style={s.cancelBtn}
                  onClick={() => { setConfirmarDesativacao(false); setDesativarError(""); }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Navbar>
  );
}

const s = {
  page:           { maxWidth: "640px" },
  title:          { fontSize: "1.4rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "1.5rem" },
  card:           { background: "#fff", border: "1px solid #e8edf2", borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" },
  cardHeader:     { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" },
  cardTitle:      { fontSize: "0.82rem", fontWeight: "700", color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" },
  grid:           { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1.25rem" },
  editBtn:        { background: "none", border: "1px solid #d0dae6", color: "#2c6fac", padding: "5px 14px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" },
  form:           { display: "flex", flexDirection: "column", gap: "1rem" },
  field:          { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label:          { fontSize: "0.78rem", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" },
  optional:       { fontWeight: "400", textTransform: "none", color: "#888" },
  input:          { border: "1px solid #dde3ea", borderRadius: "8px", padding: "9px 13px", fontSize: "0.92rem", color: "#333", outline: "none", background: "#fafbfc" },
  passwordField:  { width:"100%",display: "flex", gap: "0.5rem", alignItems: "center", position: "relative" },
  inputPassword:  { border: "1px solid #dde3ea", borderRadius: "8px", padding: "9px 13px", fontSize: "0.92rem", color: "#333", outline: "none", background: "#fafbfc",width: "100%",boxSizing: "border-box"},
  togglePasswordBtn:{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "16px", color: "#666",},
  formActions:    { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  saveBtn:        { background: "#2c6fac", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 22px", fontSize: "0.88rem", fontWeight: "700", cursor: "pointer" },
  cancelBtn:      { background: "none", border: "1px solid #dde3ea", color: "#888", borderRadius: "8px", padding: "9px 18px", fontSize: "0.88rem", cursor: "pointer" },
  success:        { color: "#2e7d32", fontSize: "0.85rem", marginBottom: "0.75rem" },
  error:          { color: "#c0392b", fontSize: "0.82rem", margin: 0 },
  dangerCard:     { background: "#fff", border: "1px solid #fad7d7", borderRadius: "12px", padding: "1.5rem" },
  dangerTitle:    { fontSize: "0.82rem", fontWeight: "700", color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" },
  dangerDesc:     { fontSize: "0.84rem", color: "#888", lineHeight: 1.5, margin: 0 },
  dangerBtn:      { marginTop: "1rem", background: "none", border: "1px solid #e74c3c", color: "#e74c3c", borderRadius: "8px", padding: "9px 20px", fontSize: "0.88rem", fontWeight: "600", cursor: "pointer"},
  dangerBtnSolid: { background: "#e74c3c", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 22px", fontSize: "0.88rem", fontWeight: "700", cursor: "pointer" },
  confirmBox:     { marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" },
  confirmText:    { fontSize: "0.88rem", color: "#555", margin: 0 },
};