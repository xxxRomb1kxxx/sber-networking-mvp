import { useEffect, useState } from 'react';

/**
 * Кольцо-мера: дуга показывает величину, число в центре — её значение.
 * Один и тот же элемент кодирует совместимость кандидата и занятость мест,
 * поэтому подбор и мероприятия читаются одинаково.
 *
 * tone: 'brand' | 'amber' | 'muted' — задаёт цвет дуги.
 */
export default function Meter({ percent, label, tone = 'brand', size = 'md', className = '' }) {
  const target = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const [fill, setFill] = useState(0);

  // Дуга наливается от нуля после монтирования: переход по --pct работает,
  // только если значение действительно меняется уже на живом элементе.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFill(target));
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <span
      className={`meter meter--${size} meter--${tone} ${className}`}
      style={{ '--pct': fill }}
      role="img"
      aria-label={label}
    >
      <span className="meter-value">{label}</span>
    </span>
  );
}
