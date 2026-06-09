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
