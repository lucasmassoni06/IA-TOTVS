export default function PieChart({ data = [], size = 220, colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#84cc16', '#f97316'] }) {
  const total = data.reduce((s, d) => s + (Number(d.count) || 0), 0);
  if (!total) return null;

  const cx = size / 2, cy = size / 2, radius = size / 2 - 20;
  const polar = (mid, r) => ({ x: cx + r * Math.cos(mid), y: cy + r * Math.sin(mid) });
  let cur = -Math.PI / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfico de pizza">
      {data.map((d, i) => {
        const value = Number(d.count) || 0;
        const ang = (value / total) * Math.PI * 2;
        const mid = cur + ang / 2;
        const p = polar(mid, radius * 0.65);
        const pct = ((value / total) * 100).toFixed(1);
        const start = polar(cur, radius);
        const end = polar(cur + ang, radius);
        const largeArc = ang > Math.PI ? 1 : 0;
        cur += ang;
        return (
          <g key={i}>
            <path d={`M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="2" />
            {pct >= 5 && (
              <text x={p.x} y={p.y} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{pct}%</text>
            )}
          </g>
        );
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="9" fill="#64748b">total</text>
    </svg>
  );
}