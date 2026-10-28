import { useState } from 'react';
import './MemberHighlights.css';

const SECTIONS = [
  { key: 'news', title: 'Noticias' },
  { key: 'promotions', title: 'Promociones' },
  { key: 'activities', title: 'Actividades extras' },
];
const MAX_ITEMS = 6;
const TITLE_MAX = 80;
const TEXT_MAX = 200;

const groupClassName = (key) => (
  key === 'promotions' ? 'member-highlights-group member-highlights-promo' : 'member-highlights-group'
);

export const MemberHighlights = ({ highlights, canEdit = false, onSave, disabled = false }) => {
  const [draft, setDraft] = useState(null);

  if (!highlights) {
    return null;
  }

  const updateEntry = (section, index, field, value) => setDraft((current) => ({
    ...current,
    [section]: current[section].map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry)),
  }));

  const removeEntry = (section, index) => setDraft((current) => ({
    ...current,
    [section]: current[section].filter((_, entryIndex) => entryIndex !== index),
  }));

  const addEntry = (section) => setDraft((current) => ({
    ...current,
    [section]: [...current[section], { title: '', text: '' }],
  }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = Object.fromEntries(SECTIONS.map(({ key }) => [
      key,
      draft[key].filter((entry) => entry.title.trim() || entry.text.trim()),
    ]));

    if (await onSave(payload)) {
      setDraft(null);
    }
  };

  if (draft) {
    return (
      <form className="member-highlights-editor" onSubmit={handleSubmit}>
        <div className="member-highlights">
          {SECTIONS.map(({ key, title }) => (
            <section key={key} className={groupClassName(key)}>
              <h3>{title}</h3>
              <ul>
                {draft[key].map((entry, index) => (
                  <li key={index} className="member-highlights-edit-item">
                    <input
                      type="text"
                      aria-label={`${title}: título ${index + 1}`}
                      placeholder="Título"
                      maxLength={TITLE_MAX}
                      value={entry.title}
                      onChange={(event) => updateEntry(key, index, 'title', event.target.value)}
                    />
                    <textarea
                      aria-label={`${title}: descripción ${index + 1}`}
                      placeholder="Descripción"
                      maxLength={TEXT_MAX}
                      rows={2}
                      value={entry.text}
                      onChange={(event) => updateEntry(key, index, 'text', event.target.value)}
                    />
                    <button type="button" className="member-highlights-link" onClick={() => removeEntry(key, index)}>
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
              {draft[key].length < MAX_ITEMS ? (
                <button type="button" className="member-highlights-link" onClick={() => addEntry(key)}>
                  + Añadir
                </button>
              ) : null}
            </section>
          ))}
        </div>
        <div className="member-highlights-actions">
          <button className="button button-primary" type="submit" disabled={disabled}>Guardar</button>
          <button
            className="button member-highlights-cancel"
            type="button"
            onClick={() => setDraft(null)}
            disabled={disabled}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="member-highlights-wrap">
      <div className="member-highlights">
        {SECTIONS.map(({ key, title }) => (
          <section key={key} className={groupClassName(key)}>
            <h3>{title}</h3>
            <ul>
              {highlights[key].map((item) => (
                <li key={`${item.title}-${item.text}`}>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {canEdit ? (
        <div className="member-highlights-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => setDraft(structuredClone(highlights))}
            disabled={disabled}
          >
            Editar contenido
          </button>
        </div>
      ) : null}
    </div>
  );
};
