import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home     from "./pages/Home";
import Login    from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Perfil   from "./pages/Perfil";

import ReservasSalaDiscente         from "./pages/discente/ReservasSala";
import ReservasEquipamentosDiscente from "./pages/discente/ReservasEquipamentos";

import ManutencoesDocente from "./pages/docente/Manutencoes";

import AdminSalas       from "./pages/admin/Salas";
import AdminReservas    from "./pages/admin/Reservas";
import AdminManutencoes from "./pages/admin/Manutencoes";

import "./styles/global.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/"         element={<Home />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          {/* Perfil — todos os papéis */}
          <Route path="/perfil"
            element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

          {/* Discente e Docente */}
          <Route path="/reservas-de-sala"
            element={
              <ProtectedRoute roles={["discente", "docente"]}>
                <ReservasSalaDiscente />
              </ProtectedRoute>
            }
          />
          <Route path="/reservas-de-equipamento"
            element={<ProtectedRoute roles={["discente"]}><ReservasEquipamentosDiscente /></ProtectedRoute>} />
          <Route path="/solicitacoes-de-manutencao"
            element={<ProtectedRoute roles={["docente"]}><ManutencoesDocente /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/salas"
            element={<ProtectedRoute roles={["admin"]}><AdminSalas /></ProtectedRoute>} />
          <Route path="/reservas"
            element={<ProtectedRoute roles={["admin"]}><AdminReservas /></ProtectedRoute>} />
          <Route path="/manutencoes"
            element={<ProtectedRoute roles={["admin"]}><AdminManutencoes /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
