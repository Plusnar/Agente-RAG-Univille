import { X } from "lucide-react";
import { api } from "../api";

export function SlideModal({ source, onClose }) {
  const slideUrl = api.documentPageUrl(source.file_name, source.page);

  return (
    <div className="modal-backdrop slide-backdrop" onClick={onClose}>
      <div className="slide-modal" onClick={(event) => event.stopPropagation()}>
        <div className="slide-modal-header">
          <div>
            <strong>{source.file_name}</strong>
            <span>Página {source.page || "não informada"}</span>
          </div>
          <button className="modal-close slide-close" onClick={onClose} aria-label="Fechar slide">
            <X size={18} />
          </button>
        </div>
        <iframe className="slide-frame" src={slideUrl} title={`Slide ${source.page || ""}`} />
      </div>
    </div>
  );
}
