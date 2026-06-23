import { FileText, Lock, LogOut, Trash2, Upload, X } from "lucide-react";

function AdminPanel({
  documents,
  selectedDelete,
  setSelectedDelete,
  selectedFiles,
  setSelectedFiles,
  onUpload,
  onIndex,
  onDelete,
  onLogout,
}) {
  function toggleDelete(name) {
    setSelectedDelete(
      selectedDelete.includes(name)
        ? selectedDelete.filter((item) => item !== name)
        : [...selectedDelete, name]
    );
  }

  return (
    <>
      <label className="upload-box">
        <Upload size={18} />
        <span>{selectedFiles.length ? `${selectedFiles.length} arquivo(s)` : "Selecionar PDFs / TXT"}</span>
        <input
          type="file"
          accept=".pdf,.txt"
          multiple
          onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
        />
      </label>
      <button className="primary" onClick={onUpload}>
        Salvar documentos
      </button>
      <button onClick={onIndex}>Indexar documentos</button>

      <div className="document-list">
        {documents.map((document) => (
          <button
            key={document.name}
            className={selectedDelete.includes(document.name) ? "doc selected" : "doc"}
            onClick={() => toggleDelete(document.name)}
          >
            <FileText size={14} /> {document.name}
          </button>
        ))}
      </div>

      <button className="danger" onClick={onDelete} disabled={!selectedDelete.length}>
        <Trash2 size={16} /> Remover selecionados
      </button>
      <button onClick={onLogout}>
        <LogOut size={16} /> Sair
      </button>
    </>
  );
}

export function AdminModal({
  onClose,
  admin,
  setAdmin,
  notice,
  documents,
  selectedFiles,
  setSelectedFiles,
  selectedDelete,
  setSelectedDelete,
  onUpload,
  onIndex,
  onDelete,
}) {
  return (
    <div className="modal-backdrop admin-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <div className="admin-modal-title">
          <Lock size={17} />
          <div>
            <strong>Documentos do assistente</strong>
            <span>Login admin para enviar, indexar ou remover arquivos.</span>
          </div>
        </div>

        {!admin.authenticated ? (
          <div className="admin-login">
            <input
              placeholder="Nome"
              value={admin.username}
              onChange={(e) => setAdmin({ ...admin, username: e.target.value })}
            />
            <input
              placeholder="Senha"
              type="password"
              value={admin.password}
              onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
            />
            <button
              className="primary"
              onClick={() =>
                setAdmin({
                  ...admin,
                  authenticated: admin.username === "admin" && admin.password === "admin123456",
                })
              }
            >
              Entrar
            </button>
          </div>
        ) : (
          <AdminPanel
            documents={documents}
            selectedDelete={selectedDelete}
            setSelectedDelete={setSelectedDelete}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            onUpload={onUpload}
            onIndex={onIndex}
            onDelete={onDelete}
            onLogout={() => setAdmin({ username: "", password: "", authenticated: false })}
          />
        )}
        {notice && <div className="notice">{notice}</div>}
      </div>
    </div>
  );
}
