import { useState } from 'react';
import { api } from '../api.js';

export default function ProfileForm({ user, dictionaries, onSaved, submitLabel = 'Сохранить' }) {
  const [form, setForm] = useState({
    industry: user.industry || '',
    companySize: user.companySize || '',
    region: user.region || '',
    goals: user.goals || [],
    about: user.about || '',
    request: user.request || '',
    tags: (user.tags || []).join(', '),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleGoal = (g) =>
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(g) ? f.goals.filter((x) => x !== g) : [...f.goals, g],
    }));

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { user: updated } = await api('/profile', { method: 'PUT', body: form });
      onSaved(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const ready = form.industry && form.region && form.goals.length && form.about.trim();

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <label className="field">
          <span className="field-label">Отрасль</span>
          <select value={form.industry} onChange={set('industry')}>
            <option value="">Выберите отрасль</option>
            {dictionaries.industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Сотрудников в компании</span>
          <select value={form.companySize} onChange={set('companySize')}>
            <option value="">Не указано</option>
            {dictionaries.companySizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Город или регион</span>
          <input type="text" value={form.region} onChange={set('region')} placeholder="Москва" />
        </label>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <span className="field-label">Зачем вы здесь</span>
        <div className="chips">
          {Object.entries(dictionaries.goals).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`chip ${form.goals.includes(key) ? 'on' : ''}`}
              onClick={() => toggleGoal(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <label className="field">
          <span className="field-label">О компании и о себе</span>
          <textarea
            value={form.about}
            onChange={set('about')}
            placeholder="Чем занимается компания, какой масштаб, чем вы сильны"
          />
        </label>

        <label className="field">
          <span className="field-label">Кого вы ищете — по этому тексту работает подбор</span>
          <textarea
            value={form.request}
            onChange={set('request')}
            placeholder="Например: ищу поставщика замороженной ягоды для кондитерского производства в ЦФО"
          />
        </label>

        <label className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Ключевые темы через запятую</span>
          <input
            type="text"
            value={form.tags}
            onChange={set('tags')}
            placeholder="логистика, маркетплейсы, СТМ"
          />
        </label>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="sticky-actions">
        <button className="btn btn-wide" onClick={submit} disabled={busy || !ready}>
          {busy ? 'Сохраняем…' : submitLabel}
        </button>
        {!ready && (
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Заполните отрасль, регион, цели и описание — без них подбор не запустится.
          </p>
        )}
      </div>
    </div>
  );
}
