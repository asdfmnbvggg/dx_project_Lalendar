import { X } from "lucide-react";
import { TEMPLATE_GROUPS } from "./scheduleConstants.js";

export default function TemplateSelector({ onClose, onApply }) {
  return (
    <div className="composer-backdrop" role="presentation">
      <section className="composer template-selector" role="dialog" aria-modal="true" aria-labelledby="template-selector-title">
        <div className="composer-head">
          <div>
            <p>템플릿 불러오기</p>
            <h2 id="template-selector-title">자주 쓰는 일정</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="template-list">
          {TEMPLATE_GROUPS.map((template) => (
            <article key={template.id} className="template-card">
              <div>
                <strong>{template.title}</strong>
                <span>{template.description}</span>
              </div>
              <div className="template-actions">
                <button type="button" onClick={() => onApply(template, "append")}>
                  유지하고 추가
                </button>
                <button type="button" onClick={() => onApply(template, "replace")}>
                  지우고 적용
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
