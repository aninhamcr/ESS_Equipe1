import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { FiEye, FiEyeOff } from "react-icons/fi";


export default function Login() {
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userData = await api.post("/users/login", { cpf, senha });
      login({ ...userData, senha });
      navigate("/perfil");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Erro ao fazer login"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.wrapper}>
      <div style={s.bg} aria-hidden="true">
        <div style={s.blob1} />
        <div style={s.blob2} />
      </div>

      <div style={s.card}>
        <Link to="/" style={s.brand}>Salla</Link>
        <p style={s.subtitle}>Entre com sua conta universitária</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>CPF</label>
            <input name="cpf" style={s.input} placeholder="000.000.000-00" value={cpf}
              onChange={(e) => setCpf(e.target.value)} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Senha</label>
            <div style={s.passwordField}>
              <input name="senha" style={s.inputPassword} type={mostrarSenha ? "text" : "password"} placeholder="••••••••" value={senha}
                onChange={(e) => setSenha(e.target.value)} required />
              <button
                type="button"
                style={s.togglePasswordBtn}
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={s.footer}>
          Não tem conta? <Link to="/cadastro" style={s.link}>Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  wrapper:  { minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", position: "relative", overflow: "hidden" },
  bg:       { position: "absolute", inset: 0, pointerEvents: "none" },
  blob1:    { position: "absolute", top: "-120px", right: "-120px", width: "400px", height: "400px", borderRadius: "50%", background: "#4361ee", opacity: 0.07 },
  blob2:    { position: "absolute", bottom: "-100px", left: "-100px", width: "300px", height: "300px", borderRadius: "50%", background: "#4361ee", opacity: 0.05 },
  card:     { position: "relative", zIndex: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "2.5rem 2rem", width: "100%", maxWidth: "380px", backdropFilter: "blur(12px)" },
  brand:    { display: "block", fontSize: "1.8rem", fontWeight: "700", color: "#fff", textDecoration: "none", fontFamily: "Georgia, serif", letterSpacing: "-0.03em", marginBottom: "0.25rem" },
  subtitle: { fontSize: "0.85rem", color: "#666", marginBottom: "2rem" },
  form:     { display: "flex", flexDirection: "column", gap: "1rem" },
  field:    { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label:    { fontSize: "0.78rem", fontWeight: "600", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" },
  input:    { background: "#ffffff0f", border: "1px solid #ffffff1a", borderRadius: "8px", padding: "10px 14px", color: "#f0f0f0", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" },
  error:    { color: "#ff6b6b", fontSize: "0.82rem", margin: 0 },
  btn:      { marginTop: "0.25rem", background: "#4361ee", color: "#fff", border: "none", borderRadius: "8px", padding: "11px", fontSize: "0.95rem", fontWeight: "700", cursor: "pointer", width: "100%" },
  footer:   { marginTop: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: "#666" },
  link:     { color: "#7b96ff", textDecoration: "none", fontWeight: "600" },
  passwordField:  {width:"100%",display: "flex", gap: "0.5rem", alignItems: "center", position: "relative" },
  inputPassword:  {border: "1px solid #ffffff1a", borderRadius: "8px", padding: "9px 13px", fontSize: "0.92rem", color: "#f0f0f0", outline: "none", background: "#ffffff0f",width: "100%",boxSizing: "border-box"},
  togglePasswordBtn:{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "16px", color: "#666",},   
};