export default function BarList({ data = [], labelKey = 'label', valueKey = 'count', colors = ['#6366f1'], maxBars = 12 }) {
  if (!data || data.length === 0) return null;

  const rows = data.slice(0, maxBars);
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);

  return (
    <div className="bar-list">
      {rows.map((row, i) => {
        const v = Number(row[valueKey]) || 0;
        const pct = (v / max) * 100;
        return (
          <div key={i} className="bar-item">
            <div className="bar-label">{row[labelKey]}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
            </div>
            <div className="bar-value">{v}</div>
          </div>
        );
      })}
    </div>
  );
}