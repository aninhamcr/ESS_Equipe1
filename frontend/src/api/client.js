const BASE_URL = process.env.API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
  if (!res.ok) {
    const detail = body.detail;
    let msg;
    if (Array.isArray(detail)) {
      // Erros de validação do FastAPI/Pydantic — limpa o prefixo "Value error, " que vem dos field_validators
      msg = detail
        .map((e) => e.msg)
        .join(", ")
        .replace(/Value error,\s*/gi, "");
    } else if (typeof detail === "string") {
      msg = detail;
    } else if (detail && typeof detail === "object" && typeof detail.message === "string") {
      // Detail estruturado (ex.: { message, pending_reservation_ids }) — preserva o objeto em err.detail
      msg = detail.message;
    } else {
      msg = "Erro na requisição";
    }
    const err = new Error(msg);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return body;
}

export const api = {
  get:    (path)                  => request(path),
  post:   (path, body, headers)   => request(path, { method: "POST",   body: JSON.stringify(body),  headers }),
  put:    (path, body, headers)   => request(path, { method: "PUT",    body: JSON.stringify(body),  headers }),
  patch:  (path, body, headers)   => request(path, { method: "PATCH",  body: JSON.stringify(body),  headers }),
  delete: (path, headers)         => request(path, { method: "DELETE", headers }),
};
