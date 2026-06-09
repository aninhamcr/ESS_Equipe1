import React from "react";

const BADGE_LABEL = {
  disponivel: "Disponível",
  reservada:  "Reservada",
  manutencao: "Em manutenção",
};

function getStatuses(room) {
  const s = [];
  if (room.maintenance_status === "Sim") s.push("manutencao");
  if (room.is_reserved) s.push("reservada");
  if (s.length === 0) s.push("disponivel");
  return s;
}

const PENCIL = (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M9.5 4.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default function RoomCard({ room, onEdit, onDelete }) {
  const statuses = getStatuses(room);

  return (
    <div className={`room-card ${statuses[0]}`}>
      <div className="room-card-header">
        <div className="room-name-row">
          <span className="room-name">{room.name}</span>
          <button className="btn-edit-room" onClick={() => onEdit(room)} title="Editar sala">
            {PENCIL}
          </button>
        </div>
        <div className="room-badges">
          {statuses.map((s) => (
            <span key={s} className={`room-badge ${s}`}>{BADGE_LABEL[s]}</span>
          ))}
        </div>
      </div>

      <div className="room-fields">
        <div className="room-field">
          <span className="room-field-label">Capacidade</span>
          <span className="room-field-value">{room.capacity} pessoas</span>
        </div>
        <div className="room-field">
          <span className="room-field-label">Descrição</span>
          <span className="room-field-value">{room.description || "—"}</span>
        </div>
        <div className="room-field">
          <span className="room-field-label">Computadores</span>
          <span className="room-field-value">{room.computers}</span>
        </div>
      </div>

      <div className="room-card-footer">
        <button className="act-btn danger" onClick={() => onDelete(room)}>Excluir</button>
      </div>
    </div>
  );
}
