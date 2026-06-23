import { WEEKDAY_LABELS } from '../utils.js';

// Seleção de dias da semana (0=Dom..6=Sáb) + horário. Repete toda semana.
export default function WeekDaysPicker({ days, setDays, time, setTime }) {
  const toggle = (d) =>
    setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  return (
    <div>
      <label>Dias da semana</label>
      <div className="week-grid">
        {WEEKDAY_LABELS.map((label, d) => (
          <button
            type="button"
            key={d}
            className={`day-cell ${days.includes(d) ? 'sel' : ''}`}
            onClick={() => toggle(d)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label>Horário do envio</label>
        <input
          type="time"
          className="form-control"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      {days.length > 0 && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          📆 Repete toda semana:{' '}
          <strong>{[...days].sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]).join(', ')}</strong>
        </div>
      )}
    </div>
  );
}
