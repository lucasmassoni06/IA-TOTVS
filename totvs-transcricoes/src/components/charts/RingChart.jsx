export default function RingChart({ value = 0, max = 10, size = 140, label = '', color = '#22c55e' }) {
  const pct = max ? Math.min(value / max, 1) : 0;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="12"
        strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700" fill="#1e293b">{value}</text>
      {label && <text x="50%" y="68%" textAnchor="middle" fontSize="9" fill="#64748b">{label}</text>}
    </svg>
  );
}