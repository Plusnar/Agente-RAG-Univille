const API_BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Algo deu errado. Tente novamente.");
  }
  return data;
}

function adminHeaders(admin) {
  return {
    "X-Admin-Username": admin.username,
    "X-Admin-Password": admin.password,
  };
}

export const api = {
  base: API_BASE,

  health() {
    return request("/api/health");
  },

  listDocuments() {
    return request("/api/documents");
  },

  ask(question, history = []) {
    return request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        history: history.slice(-6).map(({ role, content }) => ({ role, content })),
      }),
    });
  },

  upload(files, admin) {
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    return request("/api/admin/upload", {
      method: "POST",
      headers: adminHeaders(admin),
      body,
    });
  },

  index(admin) {
    return request("/api/admin/index", {
      method: "POST",
      headers: adminHeaders(admin),
    });
  },

  deleteDocuments(fileNames, admin) {
    return request("/api/admin/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...adminHeaders(admin) },
      body: JSON.stringify({ file_names: fileNames }),
    });
  },

  documentUrl(fileName) {
    return `${API_BASE}/documents/${encodeURIComponent(fileName)}`;
  },

  documentPageUrl(fileName, page) {
    const baseUrl = this.documentUrl(fileName);
    if (!page) return baseUrl;
    return `${baseUrl}#page=${encodeURIComponent(page)}&view=FitH`;
  },
};
