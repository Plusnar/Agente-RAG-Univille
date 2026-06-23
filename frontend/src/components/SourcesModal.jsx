import { FileText, MonitorPlay, X } from "lucide-react";
import { api } from "../api";

export function SourcesModal({ sources, onClose, presentationMode = false, onShowSlide }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="source-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <h3>
          <FileText size={18} /> Fonte consultada
        </h3>
        {sources.map((source, index) => (
          <article key={index}>
            <strong>{source.file_name}</strong>
            <small>
              Página {source.page || "não informada"} · Linhas {source.line_start || "?"} a{" "}
              {source.line_end || "?"}
            </small>
            {(!presentationMode || source.file_type === "txt") && (
              <a
                className="source-link"
                href={api.documentUrl(source.file_name)}
                target="_blank"
                rel="noreferrer"
              >
                Abrir {source.file_type === "txt" ? "documento" : "PDF"}
              </a>
            )}
            {presentationMode && source.file_type === "pdf" && source.page && (
              <button
                type="button"
                className="source-slide-button"
                onClick={() => onShowSlide?.(source)}
              >
                <MonitorPlay size={15} /> Mostrar slide
              </button>
            )}
            <p className="source-excerpt">{source.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
