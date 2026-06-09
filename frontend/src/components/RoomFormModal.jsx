import React, { useEffect, useState } from "react";

const EMPTY = { name: "", capacity: "", description: "", computers: "" };

export default function RoomFormModal({ room, onClose, onSave, loading, error }) {
  const isEdit = Boolean(room);
  const [form, setForm] = useState(EMPTY);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (room) {
      setForm({
        name:        room.name,
        capacity:    String(room.capacity),
        description: room.description ?? "",
        computers:   String(room.computers),
      });
    } else {
      setForm(EMPTY);
    }
    setFieldError("");
  }, [room]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldError("");
  }

  function handleSave() {
    if (!form.name.trim()) { setFieldError("name"); return; }
    if (!form.capacity || Number(form.capacity) <= 0) { setFieldError("capacity"); return; }
    if (!form.description.trim()) { setFieldError("description"); return; }
    if (form.computers === "" || Number(form.computers) < 0) { setFieldError("computers"); return; }
    onSave({
      name:               form.name.trim(),
      capacity:           Number(form.capacity),
      description:        form.description.trim(),
      computers:          Number(form.computers),
      maintenance_status: isEdit ? room.maintenance_status : "Não",
    });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-nav">
          <span className="modal-nav-title">
            {isEdit ? `Editar sala — ${room.name}` : "Cadastrar nova sala"}
          </span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-grid-sala">
            <div className="two-col-sala">
              <div className="field-group-sala">
                <label className="field-label-sala">
                  Nome da sala <span className="field-req">*</span>
                </label>
                <input
                  className={`field-input-sala${fieldError === "name" ? " error" : ""}`}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ex: D005"
                  disabled={isEdit}
                />
              </div>
              <div className="field-group-sala">
                <label className="field-label-sala">
                  Capacidade <span className="field-req">*</span>
                </label>
                <input
                  className={`field-input-sala${fieldError === "capacity" ? " error" : ""}`}
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  placeholder="Ex: 80"
                />
              </div>
            </div>

            <div className="field-group-sala">
              <label className="field-label-sala">
                Descrição <span className="field-req">*</span>
              </label>
              <input
                className={`field-input-sala${fieldError === "description" ? " error" : ""}`}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Ex: Sala de Reunião"
                maxLength={500}
              />
              <span className="field-hint-sala">Tipo da sala ou informações adicionais relevantes</span>
            </div>

            <div className="field-group-sala">
              <label className="field-label-sala">
                Nº de computadores <span className="field-req">*</span>
              </label>
              <input
                className={`field-input-sala${fieldError === "computers" ? " error" : ""}`}
                type="number"
                min="0"
                value={form.computers}
                onChange={(e) => set("computers", e.target.value)}
                placeholder="0"
              />
            </div>

            {!isEdit && (
              <div className="info-box-sala">
                <div className="info-icon-sala">i</div>
                <span>
                  A sala será criada como <strong>Disponível</strong> e poderá ser reservada
                  imediatamente após o cadastro.
                </span>
              </div>
            )}

            {error && <p style={{ color: "#E24B4A", fontSize: 12 }}>{error}</p>}

            <hr className="divider-sala" />
            <div className="form-actions-sala">
              <button className="btn-sec-sala" onClick={onClose} disabled={loading}>Cancelar</button>
              <button className="btn-pri-sala" onClick={handleSave} disabled={loading}>
                {loading ? "Salvando…" : isEdit ? "Salvar alterações" : "Salvar sala"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
