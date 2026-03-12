interface ZScoreBadgeProps {
  value: number;
  size?: 'sm' | 'md';
}

export default function ZScoreBadge({ value, size = 'md' }: ZScoreBadgeProps) {
  const isPositive = value > 0.3;
  const isNegative = value < -0.3;

  let color = '#eab308'; // amber for near zero
  if (isPositive) color = '#22c55e';
  if (isNegative) color = '#ef4444';

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={`inline-flex items-center font-mono tabular-nums font-semibold ${textSize}`}
      style={{ color }}
    >
      {value > 0 ? '+' : ''}
      {value.toFixed(2)}
    </span>
  );
}
