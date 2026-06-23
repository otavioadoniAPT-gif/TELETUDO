// Grade de dias do mês (1–31) + horário. A mensagem repete todo mês
// nos dias marcados, no horário escolhido.
export default function MonthDaysPicker({ days, setDays, time, setTime }) {
  const toggle = (d) =>
    setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  return (
    <div>
      <label>Dias do mês</label>
      <div className="month-grid">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <button
            type="button"
            key={d}
            className={`day-cell ${days.includes(d) ? 'sel' : ''}`}
            onClick={() => toggle(d)}
          >
            {d}
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
          🗓️ Repete todo mês nos dias: <strong>{[...days].sort((a, b) => a - b).join(', ')}</strong>
        </div>
      )}
    </div>
  );
}
