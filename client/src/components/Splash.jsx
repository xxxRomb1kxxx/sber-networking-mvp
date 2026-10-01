/**
 * Экран запуска. Единственное движение — линия, которая прочерчивается слева
 * направо: тот же жест «соединения», что и точка в логотипе.
 */
export default function Splash({ exiting }) {
  return (
    <div className={`splash ${exiting ? 'splash-exit' : ''}`}>
      <div className="splash-mark">
        <span className="brand-logo brand-logo--lg">Сберконнект</span>
      </div>

      <p className="splash-tag">Деловые знакомства и встречи СберБизнеса</p>

      <div className="splash-progress" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
