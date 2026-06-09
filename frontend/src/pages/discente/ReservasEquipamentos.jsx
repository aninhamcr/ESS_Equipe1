import React, { useCallback, useEffect, useState } from "react";

import { api } from "../../api/client";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";


export const EQUIPMENT_STATUS = {
  pending: { label: "Pendente", color: "#ffd166", textColor: "#333" },
  confirmed: { label: "Confirmada", color: "#06d6a0", textColor: "#fff" },
  denied: { label: "Negada", color: "#e63946", textColor: "#fff" },
  completed: { label: "Concluída", color: "#4361ee", textColor: "#fff" },
};


export function toIso(datetimeLocal) {
  if (!datetimeLocal) return datetimeLocal;
  return datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal;
}


export function formatReservationDate(isoString) {
  const [year, month, day] = isoString.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}


export function formatReservationTime(isoString) {
  return isoString.split("T")[1]?.slice(0, 5) ?? "";
}


export function formatDateForInput(isoString) {
  if (!isoString) return "";
  return isoString.split("T")[0];
}


export function formatTimeForInput(isoString) {
  if (!isoString) return "";
  return formatReservationTime(isoString);
}


export function brazilianDateTimeToLocal(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^\d{2}:\d{2}$/.test(time ?? "")) {
    throw new Error("Informe uma data e um horário válidos");
  }
  return `${date}T${time}`;
}


export function buildReservationPayload(form) {
  const startTime = form.start_date === undefined
    ? form.start_time
    : brazilianDateTimeToLocal(form.start_date, form.start_clock);
  const endTime = form.end_date === undefined
    ? form.end_time
    : brazilianDateTimeToLocal(form.end_date, form.end_clock);

  return {
    room: form.room.trim(),
    computer_quantity: Number(form.computer_quantity),
    start_time: toIso(startTime),
    end_time: toIso(endTime),
  };
}


export function buildReservationUpdate(form, reservation) {
  const payload = buildReservationPayload(form);
  const updates = {};

  if (payload.room !== reservation.room) updates.room = payload.room;
  if (payload.computer_quantity !== reservation.computer_quantity) {
    updates.computer_quantity = payload.computer_quantity;
  }
  if (payload.start_time !== reservation.start_time) {
    updates.start_time = payload.start_time;
  }
  if (payload.end_time !== reservation.end_time) {
    updates.end_time = payload.end_time;
  }
  return updates;
}


export function filterReservationsByStatus(reservations, status) {
  if (!status) return reservations;
  return reservations.filter((reservation) => reservation.status === status);
}


function StatusBadge({ status }) {
  const info = EQUIPMENT_STATUS[status] ?? {
    label: status,
    color: "#adb5bd",
    textColor: "#fff",
  };
  return (
    <span
      data-cy={`equipment-status-${status}`}
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        background: info.color,
        color: info.textColor,
        fontSize: "0.72rem",
        fontWeight: 700,
      }}
    >
      {info.label}
    </span>
  );
}


function Toast({ toast }) {
  if (!toast.text) return null;
  return (
    <div
      data-cy="equipment-toast"
      role="status"
      style={{
        ...styles.toast,
        background: toast.type === "success" ? "#2dc653" : "#e63946",
      }}
    >
      {toast.text}
    </div>
  );
}


const MONTHS_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS_PT_BR = ["D", "S", "T", "Q", "Q", "S", "S"];


function padNumber(value) {
  return String(value).padStart(2, "0");
}


function formatBrazilianInputDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}


function parseBrazilianInputDate(value) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";

  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year)
    || parsed.getMonth() !== Number(month) - 1
    || parsed.getDate() !== Number(day)
  ) {
    return "";
  }
  return `${year}-${month}-${day}`;
}


function BrazilianDatePicker({ id, dataCy, value, onChange }) {
  const selectedDate = value
    ? new Date(`${value}T12:00:00`)
    : new Date();
  const [text, setText] = useState(() => formatBrazilianInputDate(value));
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  useEffect(() => {
    setText(formatBrazilianInputDate(value));
    if (value) {
      const nextDate = new Date(`${value}T12:00:00`);
      setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }
  }, [value]);

  function handleTextChange(event) {
    const nextText = event.target.value
      .replace(/[^\d/]/g, "")
      .slice(0, 10);
    setText(nextText);

    if (!nextText) {
      onChange("");
      return;
    }
    const parsed = parseBrazilianInputDate(nextText);
    if (parsed) onChange(parsed);
  }

  function changeMonth(offset) {
    setVisibleMonth((current) => (
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    ));
  }

  function selectDay(day) {
    const nextValue = [
      visibleMonth.getFullYear(),
      padNumber(visibleMonth.getMonth() + 1),
      padNumber(day),
    ].join("-");
    onChange(nextValue);
    setText(formatBrazilianInputDate(nextValue));
    setOpen(false);
  }

  const firstWeekday = visibleMonth.getDay();
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div style={styles.datePicker}>
      <div style={styles.dateInputRow}>
        <input
          id={id}
          data-cy={dataCy}
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          pattern="\d{2}/\d{2}/\d{4}"
          maxLength="10"
          value={text}
          onChange={handleTextChange}
          required
        />
        <button
          data-cy={`${dataCy}-calendar`}
          style={styles.calendarTrigger}
          type="button"
          aria-label="Abrir calendário"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          &#128197;
        </button>
      </div>

      {open && (
        <div data-cy={`${dataCy}-calendar-panel`} style={styles.calendarPanel}>
          <div style={styles.calendarHeader}>
            <button
              style={styles.calendarNavigation}
              type="button"
              aria-label="Mês anterior"
              onClick={() => changeMonth(-1)}
            >
              &lt;
            </button>
            <strong>
              {MONTHS_PT_BR[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
            </strong>
            <button
              style={styles.calendarNavigation}
              type="button"
              aria-label="Próximo mês"
              onClick={() => changeMonth(1)}
            >
              &gt;
            </button>
          </div>
          <div style={styles.calendarGrid}>
            {WEEKDAYS_PT_BR.map((weekday, index) => (
              <span key={`${weekday}-${index}`} style={styles.calendarWeekday}>
                {weekday}
              </span>
            ))}
            {calendarCells.map((day, index) => (
              day ? (
                <button
                  key={day}
                  data-cy={`${dataCy}-day-${day}`}
                  style={{
                    ...styles.calendarDay,
                    ...(value === [
                      visibleMonth.getFullYear(),
                      padNumber(visibleMonth.getMonth() + 1),
                      padNumber(day),
                    ].join("-") ? styles.calendarSelectedDay : {}),
                  }}
                  type="button"
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function Time24Picker({ dataCy, value, onChange }) {
  const [hour = "", minute = ""] = value ? value.split(":") : [];
  const hours = Array.from({ length: 24 }, (_, index) => padNumber(index));
  const minutes = Array.from({ length: 60 }, (_, index) => padNumber(index));

  function updateTime(nextHour, nextMinute) {
    if (!nextHour && !nextMinute) {
      onChange("");
      return;
    }
    onChange(`${nextHour || "00"}:${nextMinute || "00"}`);
  }

  return (
    <div data-cy={dataCy} style={styles.timePicker}>
      <select
        data-cy={`${dataCy}-hour`}
        aria-label="Hora"
        value={hour}
        onChange={(event) => updateTime(event.target.value, minute)}
        required
      >
        <option value="">HH</option>
        {hours.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <span style={styles.timeSeparator}>:</span>
      <select
        data-cy={`${dataCy}-minute`}
        aria-label="Minuto"
        value={minute}
        onChange={(event) => updateTime(hour, event.target.value)}
        required
      >
        <option value="">MM</option>
        {minutes.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}


function ReservationForm({
  rooms,
  initialReservation,
  onSubmit,
  onClose,
  loading,
  error,
}) {
  const isEditing = Boolean(initialReservation);
  const [form, setForm] = useState(() => ({
    room: initialReservation?.room ?? rooms[0]?.name ?? "",
    computer_quantity: String(initialReservation?.computer_quantity ?? 1),
    start_date: formatDateForInput(initialReservation?.start_time),
    start_clock: formatTimeForInput(initialReservation?.start_time),
    end_date: formatDateForInput(initialReservation?.end_time),
    end_clock: formatTimeForInput(initialReservation?.end_time),
  }));

  useEffect(() => {
    if (!form.room && rooms.length > 0) {
      setForm((current) => ({ ...current, room: rooms[0].name }));
    }
  }, [rooms, form.room]);

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  const content = (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.grid}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor={isEditing ? "edit-equipment-room" : "equipment-room"}>
            Sala
          </label>
          <select
            id={isEditing ? "edit-equipment-room" : "equipment-room"}
            data-cy={isEditing ? "edit-equipment-room" : "equipment-room"}
            value={form.room}
            onChange={update("room")}
            required
          >
            {rooms.map((room) => (
              <option key={room.name} value={room.name}>
                {room.name} ({room.computers} computadores)
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor={isEditing ? "edit-equipment-quantity" : "equipment-quantity"}>
            Número de computadores
          </label>
          <input
            id={isEditing ? "edit-equipment-quantity" : "equipment-quantity"}
            data-cy={isEditing ? "edit-equipment-quantity" : "equipment-quantity"}
            type="number"
            min="1"
            step="1"
            value={form.computer_quantity}
            onChange={update("computer_quantity")}
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor={isEditing ? "edit-equipment-start-date" : "equipment-start-date"}>
            Data de início
          </label>
          <BrazilianDatePicker
            id={isEditing ? "edit-equipment-start-date" : "equipment-start-date"}
            dataCy={isEditing ? "edit-equipment-start-date" : "equipment-start-date"}
            value={form.start_date}
            onChange={(value) => (
              setForm((current) => ({ ...current, start_date: value }))
            )}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Hora de início
          </label>
          <Time24Picker
            dataCy={isEditing ? "edit-equipment-start-time" : "equipment-start-time"}
            value={form.start_clock}
            onChange={(value) => (
              setForm((current) => ({ ...current, start_clock: value }))
            )}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor={isEditing ? "edit-equipment-end-date" : "equipment-end-date"}>
            Data de fim
          </label>
          <BrazilianDatePicker
            id={isEditing ? "edit-equipment-end-date" : "equipment-end-date"}
            dataCy={isEditing ? "edit-equipment-end-date" : "equipment-end-date"}
            value={form.end_date}
            onChange={(value) => (
              setForm((current) => ({ ...current, end_date: value }))
            )}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Hora de fim
          </label>
          <Time24Picker
            dataCy={isEditing ? "edit-equipment-end-time" : "equipment-end-time"}
            value={form.end_clock}
            onChange={(value) => (
              setForm((current) => ({ ...current, end_clock: value }))
            )}
          />
        </div>
      </div>

      {error && (
        <p data-cy="equipment-form-error" style={styles.error}>
          {error}
        </p>
      )}

      <div style={styles.actions}>
        <button
          data-cy={isEditing ? "save-equipment-reservation" : "create-equipment-reservation"}
          type="submit"
          disabled={loading || rooms.length === 0}
        >
          {loading
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Confirmar reserva"}
        </button>
        {isEditing && (
          <button
            data-cy="close-equipment-edit"
            style={styles.secondaryButton}
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Voltar
          </button>
        )}
      </div>
    </form>
  );

  if (!isEditing) return content;

  return (
    <div data-cy="equipment-edit-modal" style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.cardTitle}>Editar reserva de computadores</h2>
        {content}
      </div>
    </div>
  );
}


function CancelModal({ reservation, loading, onConfirm, onClose }) {
  return (
    <div data-cy="equipment-cancel-modal" style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: "420px", textAlign: "center" }}>
        <h2 style={styles.cardTitle}>Cancelar reserva?</h2>
        <p style={styles.muted}>
          A reserva de {reservation.computer_quantity} computador(es) em{" "}
          <strong>{reservation.room}</strong> será removida.
        </p>
        <div style={{ ...styles.actions, justifyContent: "center" }}>
          <button
            data-cy="confirm-equipment-cancel"
            style={styles.dangerButton}
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Cancelando..." : "Sim, cancelar"}
          </button>
          <button
            data-cy="close-equipment-cancel"
            style={styles.secondaryButton}
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}


function ReservationRow({ reservation, onEdit, onCancel }) {
  const pending = reservation.status === "pending";
  return (
    <tr data-cy="equipment-reservation-row">
      <td style={styles.tableCell}>{reservation.room}</td>
      <td style={styles.tableCell}>{reservation.computer_quantity}</td>
      <td style={styles.tableCell}>{formatReservationDate(reservation.start_time)}</td>
      <td style={styles.tableCell}>{formatReservationTime(reservation.start_time)}</td>
      <td style={styles.tableCell}>{formatReservationTime(reservation.end_time)}</td>
      <td style={styles.tableCell}><StatusBadge status={reservation.status} /></td>
      <td style={styles.tableCell}>
        {pending ? (
          <div style={styles.actions}>
            <button
              data-cy="edit-equipment-reservation"
              style={styles.smallButton}
              type="button"
              onClick={() => onEdit(reservation)}
            >
              Editar
            </button>
            <button
              data-cy="cancel-equipment-reservation"
              style={{ ...styles.smallButton, ...styles.dangerButton }}
              type="button"
              onClick={() => onCancel(reservation)}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <span style={styles.muted}>Sem ações</span>
        )}
      </td>
    </tr>
  );
}


export default function ReservasEquipamentos() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState(null);
  const [canceling, setCanceling] = useState(null);
  const [toast, setToast] = useState({ type: "", text: "" });

  const fetchReservations = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const data = await api.get(
        `/api/equipment/reservations/?user_cpf=${encodeURIComponent(user.cpf)}`,
      );
      setReservations(data);
    } catch (error) {
      setListError(error.message);
    } finally {
      setLoadingList(false);
    }
  }, [user.cpf]);

  useEffect(() => {
    api.get("/api/rooms/?limit=100")
      .then((data) => setRooms(data.rooms.filter((room) => room.computers > 0)))
      .catch((error) => setFormError(error.message));
    fetchReservations();
  }, [fetchReservations]);

  function showToast(type, text) {
    setToast({ type, text });
    window.setTimeout(() => setToast({ type: "", text: "" }), 4000);
  }

  async function createReservation(form) {
    setSaving(true);
    setFormError("");
    try {
      await api.post(
        `/api/equipment/reservations/?user_cpf=${encodeURIComponent(user.cpf)}&user_name=${encodeURIComponent(user.nome)}`,
        buildReservationPayload(form),
      );
      showToast("success", "Reserva de computadores criada com sucesso.");
      await fetchReservations();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateReservation(form) {
    const updates = buildReservationUpdate(form, editing);
    if (Object.keys(updates).length === 0) {
      setEditing(null);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.put(
        `/api/equipment/reservations/${editing.id}?user_cpf=${encodeURIComponent(user.cpf)}`,
        updates,
      );
      setEditing(null);
      showToast("success", "Reserva de computadores atualizada com sucesso.");
      await fetchReservations();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function cancelReservation() {
    setSaving(true);
    try {
      await api.delete(
        `/api/equipment/reservations/${canceling.id}?user_cpf=${encodeURIComponent(user.cpf)}`,
      );
      setCanceling(null);
      showToast("success", "Reserva de computadores cancelada com sucesso.");
      await fetchReservations();
    } catch (error) {
      setCanceling(null);
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  const visibleReservations = filterReservationsByStatus(
    reservations,
    statusFilter,
  );

  return (
    <Navbar>
      <Toast toast={toast} />

      {editing && (
        <ReservationForm
          rooms={rooms}
          initialReservation={editing}
          loading={saving}
          error={formError}
          onSubmit={updateReservation}
          onClose={() => {
            setEditing(null);
            setFormError("");
          }}
        />
      )}

      {canceling && (
        <CancelModal
          reservation={canceling}
          loading={saving}
          onConfirm={cancelReservation}
          onClose={() => setCanceling(null)}
        />
      )}

      <h1 data-cy="equipment-page-title" style={styles.pageTitle}>
        Reservas de Equipamentos
      </h1>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Nova reserva de computadores</h2>
        <p style={styles.muted}>
          Escolha a sala, a quantidade de computadores e o período desejado.
        </p>
        <ReservationForm
          rooms={rooms}
          loading={saving}
          error={!editing ? formError : ""}
          onSubmit={createReservation}
        />
      </section>

      <section style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.cardTitle}>Minhas reservas</h2>
          <select
            data-cy="equipment-status-filter"
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={styles.filter}
          >
            <option value="">Todos os status</option>
            {Object.entries(EQUIPMENT_STATUS).map(([value, info]) => (
              <option key={value} value={value}>{info.label}</option>
            ))}
          </select>
        </div>

        {loadingList && <p data-cy="equipment-loading" style={styles.muted}>Carregando reservas...</p>}
        {listError && <p data-cy="equipment-list-error" style={styles.error}>{listError}</p>}

        {!loadingList && !listError && visibleReservations.length === 0 && (
          <p data-cy="equipment-empty-list" style={styles.muted}>
            Você ainda não tem reservas de computadores.
          </p>
        )}

        {!loadingList && !listError && visibleReservations.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table data-cy="equipment-reservations-table" style={styles.table}>
              <thead>
                <tr>
                  {["Sala", "Computadores", "Data", "Início", "Fim", "Status", "Ações"].map((heading) => (
                    <th key={heading} style={styles.tableHeader}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleReservations.map((reservation) => (
                  <ReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    onEdit={(selected) => {
                      setFormError("");
                      setEditing(selected);
                    }}
                    onCancel={setCanceling}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Navbar>
  );
}


const styles = {
  pageTitle: {
    color: "#1e3a5f",
    fontSize: "1.45rem",
    marginBottom: "1.5rem",
  },
  card: {
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,.07)",
    marginBottom: "1.25rem",
    padding: "1.5rem",
  },
  cardTitle: {
    color: "#1a1a2e",
    fontSize: "1rem",
    margin: "0 0 0.5rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
    marginTop: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  datePicker: {
    position: "relative",
  },
  dateInputRow: {
    alignItems: "stretch",
    display: "flex",
  },
  calendarTrigger: {
    background: "#f8f9fb",
    border: "1px solid #cfd4dc",
    borderLeft: "none",
    borderRadius: "0 6px 6px 0",
    color: "#1a1a2e",
    cursor: "pointer",
    padding: "0 0.75rem",
    width: "auto",
  },
  calendarPanel: {
    background: "#fff",
    border: "1px solid #d9dee7",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,.16)",
    color: "#1a1a2e",
    left: 0,
    minWidth: "260px",
    padding: "0.75rem",
    position: "absolute",
    top: "calc(100% + 4px)",
    zIndex: 50,
  },
  calendarHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.65rem",
  },
  calendarNavigation: {
    background: "#eef0f5",
    border: "none",
    borderRadius: "5px",
    color: "#1a1a2e",
    cursor: "pointer",
    height: "30px",
    padding: 0,
    width: "30px",
  },
  calendarGrid: {
    display: "grid",
    gap: "3px",
    gridTemplateColumns: "repeat(7, 1fr)",
    textAlign: "center",
  },
  calendarWeekday: {
    color: "#667085",
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "4px 0",
  },
  calendarDay: {
    background: "transparent",
    border: "none",
    borderRadius: "5px",
    color: "#1a1a2e",
    cursor: "pointer",
    height: "30px",
    padding: 0,
    width: "100%",
  },
  calendarSelectedDay: {
    background: "#4361ee",
    color: "#fff",
    fontWeight: 700,
  },
  timePicker: {
    alignItems: "center",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "0.4rem",
  },
  timeSeparator: {
    color: "#1a1a2e",
    fontSize: "1.1rem",
    fontWeight: 700,
  },
  label: {
    color: "#555",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  actions: {
    alignItems: "center",
    display: "flex",
    gap: "0.55rem",
  },
  smallButton: {
    background: "#4361ee",
    border: "none",
    borderRadius: "5px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "5px 12px",
  },
  dangerButton: {
    background: "#e63946",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "9px 16px",
  },
  secondaryButton: {
    background: "#eef0f5",
    border: "none",
    borderRadius: "6px",
    color: "#333",
    cursor: "pointer",
    fontWeight: 600,
    padding: "9px 16px",
  },
  headerRow: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1rem",
  },
  filter: {
    background: "#fff",
    color: "#1a1a2e",
    fontSize: "0.82rem",
    padding: "6px 10px",
    width: "auto",
  },
  table: {
    borderCollapse: "collapse",
    color: "#1a1a2e",
    fontSize: "0.88rem",
    width: "100%",
  },
  tableHeader: {
    background: "#f0f0f5",
    color: "#444",
    fontSize: "0.78rem",
    fontWeight: 700,
    padding: "8px 10px",
    textAlign: "left",
  },
  tableCell: {
    borderBottom: "1px solid #eee",
    color: "#1a1a2e",
    padding: "8px 10px",
    verticalAlign: "middle",
  },
  muted: {
    color: "#777",
    fontSize: "0.88rem",
    margin: "0.35rem 0",
  },
  error: {
    color: "#e63946",
    fontSize: "0.85rem",
    margin: 0,
  },
  overlay: {
    alignItems: "center",
    background: "rgba(0,0,0,.45)",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    position: "fixed",
    zIndex: 300,
  },
  modal: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,.18)",
    maxWidth: "620px",
    padding: "1.75rem",
    width: "calc(100% - 2rem)",
  },
  toast: {
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,.18)",
    color: "#fff",
    fontSize: "0.92rem",
    fontWeight: 600,
    left: "50%",
    padding: "0.75rem 1.5rem",
    position: "fixed",
    top: "1.25rem",
    transform: "translateX(-50%)",
    zIndex: 400,
  },
};
