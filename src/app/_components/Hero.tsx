import { VERDICT_GLYPH, VERDICT_HINT } from "./format";

const VERDICTS = ["PASA", "ESCALA", "FRENA"] as const;

export function Hero() {
  return (
    <header className="hero">
      <p className="eyebrow">Prototipo del hackathon · datos sintéticos</p>
      <h1>JEV Gate</h1>
      <p className="hero-lead">El portero de los agentes de IA: pasa, frena o escala a una persona.</p>
      <ul className="legend" aria-label="Los tres veredictos">
        {VERDICTS.map((verdict) => (
          <li key={verdict} className={`legend-item verdict-${verdict}`}>
            <span className="legend-word">
              <span aria-hidden="true">{VERDICT_GLYPH[verdict]}</span> {verdict}
            </span>
            <span className="legend-hint">{VERDICT_HINT[verdict]}</span>
          </li>
        ))}
      </ul>
      <p className="hero-note">Solo decide y registra: nunca ejecuta la acción.</p>
    </header>
  );
}
