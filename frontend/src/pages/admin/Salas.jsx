import React, { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import { roomsApi } from "../../api/rooms";
import RoomCard from "../../components/RoomCard";
import RoomFormModal from "../../components/RoomFormModal";
import DeleteRoomModal from "../../components/DeleteRoomModal";
import "../../styles/salas.css";

const FILTERS = [
  { key: "todas",      label: "Todas"         },
  { key: "disponivel", label: "Disponíveis"   },
  { key: "reservada",  label: "Reservadas"    },
  { key: "manutencao", label: "Em manutenção" },
];

function getStatuses(room) {
  const s = [];
  if (room.maintenance_status === "Sim") s.push("manutencao");
  if (room.is_reserved) s.push("reservada");
  if (s.length === 0) s.push("disponivel");
  return s;
}

function Toast({ msg, show }) {
  return (
    <div className={`sala-toast${show ? " show" : ""}`}>
      <div className="sala-toast-icon">✓</div>
      <span>{msg}</span>
    </div>
  );
}

export default function Salas() {
  const [rooms, setRooms]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState("");
  const [filter, setFilter]             = useState("todas");
  const [search, setSearch]             = useState("");
  const [formModal, setFormModal]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError]     = useState("");
  const [toast, setToast]               = useState({ msg: "", show: false });
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      setRooms(await roomsApi.list());
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ msg, show: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  }

  const visible = rooms.filter((r) => {
    const matchFilter = filter === "todas" || getStatuses(r).includes(filter);
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase().trim());
    return matchFilter && matchSearch;
  });

  async function handleCreate(data) {
    setModalLoading(true);
    setModalError("");
    try {
      await roomsApi.create(data);
      setFormModal(null);
      await load();
      showToast(`Sala "${data.name}" cadastrada com sucesso!`);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleEdit(data) {
    setModalLoading(true);
    setModalError("");
    try {
      await roomsApi.update(formModal.name, data);
      setFormModal(null);
      await load();
      showToast(`Sala "${data.name}" atualizada com sucesso!`);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDelete() {
    setModalLoading(true);
    setModalError("");
    try {
      const name = deleteTarget.name;
      await roomsApi.remove(name);
      setDeleteTarget(null);
      await load();
      showToast(`Sala "${name}" removida.`);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  }

  function closeForm()   { setFormModal(null);    setModalError(""); }
  function closeDelete() { setDeleteTarget(null); setModalError(""); }

  return (
    <Navbar>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

        <div className="salas-top-row">
          <div>
            <div className="salas-page-title">Salas cadastradas</div>
            <div className="salas-page-sub">Gerencie as salas disponíveis no sistema</div>
          </div>
          <button
            className="btn-nova"
            onClick={() => { setFormModal("create"); setModalError(""); }}
          >
            + Criar nova sala
          </button>
        </div>

        <div className="salas-controls">
          <div className="salas-search-wrap">
            <span className="salas-search-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <input
              className="salas-search-input"
              type="text"
              placeholder="Buscar sala pelo nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="chips-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`chip${filter === f.key ? " active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading    && <p className="salas-feedback">Carregando salas…</p>}
        {fetchError && <p className="salas-feedback" style={{ color: "#E24B4A" }}>{fetchError}</p>}

        {!loading && !fetchError && (
          <div className="rooms-grid">
            {visible.length === 0 ? (
              <div className="rooms-empty">
                <span style={{ fontSize: 32 }}>🏫</span>
                <span>Nenhuma sala encontrada</span>
              </div>
            ) : (
              visible.map((room) => (
                <RoomCard
                  key={room.name}
                  room={room}
                  onEdit={(r)   => { setFormModal(r);    setModalError(""); }}
                  onDelete={(r) => { setDeleteTarget(r); setModalError(""); }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {formModal !== null && (
        <RoomFormModal
          room={formModal === "create" ? null : formModal}
          onClose={closeForm}
          onSave={formModal === "create" ? handleCreate : handleEdit}
          loading={modalLoading}
          error={modalError}
        />
      )}

      {deleteTarget && (
        <DeleteRoomModal
          room={deleteTarget}
          onClose={closeDelete}
          onConfirm={handleDelete}
          loading={modalLoading}
          error={modalError}
        />
      )}

      <Toast msg={toast.msg} show={toast.show} />
    </Navbar>
  );
}
