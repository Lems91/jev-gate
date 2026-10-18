import type { Action, JevAnswer } from "@/contracts/schemas";
import { ACTION_TYPE_LABEL, CHECK_LABEL, CHOICE_LABEL, dollars, millis, percent, QUESTION_LABEL, shortDateTime, VERDICT_HINT, VERDICT_LABEL } from "./format";
import type { Proposal } from "./types";

function ActionFacts({ action }: { action: Action }) {
  return (
    <dl className="facts">
      <dt>Agente</dt>
      <dd>{action.agent}</dd>
      {action.type === "mass_email" && (
        <>
          <dt>Destinatarios</dt>
          <dd>{action.recipientCount}</dd>
          <dt>Envío programado</dt>
          <dd>{shortDateTime(action.scheduledFor)} (hora de Colombia)</dd>
          <dt>Asunto</dt>
          <dd>{action.subject}</dd>
        </>
      )}
      {action.type === "crm_update" && (
        <>
          <dt>Registros</dt>
          <dd>{action.recordCount}</dd>
          <dt>Cambios</dt>
          <dd>{action.changes.map((change) => change.field).join(", ")}</dd>
        </>
      )}
      {action.type === "publish_content" && (
        <>
          <dt>Canal</dt>
          <dd>{action.channel}</dd>
          <dt>Publicación programada</dt>
          <dd>{shortDateTime(action.scheduledFor)} (hora de Colombia)</dd>
        </>
      )}
      {action.thirdPartyText && (
        <>
          <dt>Texto de un tercero</dt>
          <dd className="quote">{action.thirdPartyText.text}</dd>
        </>
      )}
    </dl>
  );
}

function AnswerRow({ answer }: { answer: JevAnswer }) {
  const label = QUESTION_LABEL[answer.questionId];
  if (answer.kind === "boolean") {
    return (
      <li className="answer">
        <span className="answer-label">{label}</span>
        <span className="answer-value">Probabilidad de sí: {percent(answer.probability)}</span>
        <span className="bar" role="presentation">
          <span className="bar-fill" style={{ width: percent(answer.probability) }} />
        </span>
      </li>
    );
  }
  const chosen = answer.probabilities?.[answer.choice];
  return (
    <li className="answer">
      <span className="answer-label">{label}</span>
      <span className="answer-value">
        {CHOICE_LABEL[answer.choice] ?? answer.choice}
        {chosen !== undefined ? ` (${percent(chosen)})` : " (sin distribución)"}
      </span>
      {chosen !== undefined && (
        <span className="bar" role="presentation">
          <span className="bar-fill" style={{ width: percent(chosen) }} />
        </span>
      )}
    </li>
  );
}

interface Props {
  proposal: Proposal | null;
  registered: boolean;
  onPropose: (proposal: Proposal) => void;
}

export function DecisionCard({ proposal, registered, onPropose }: Props) {
  if (!proposal) {
    return (
      <section aria-labelledby="decision-title" className="panel">
        <h2 id="decision-title">Decisión del portero</h2>
        <p className="hint">Elige una acción de la lista o prueba la tuya.</p>
      </section>
    );
  }
  const { action, decision, origin } = proposal;
  const codeOnly = decision.answers.length === 0;
  return (
    <section aria-labelledby="decision-title" className="panel" id="decision-panel">
      <h2 id="decision-title">Decisión del portero</h2>

      <p className={origin === "live" ? "badge badge-live" : "badge badge-recorded"} data-testid="provenance">
        {origin === "live" ? "En vivo" : "Decisión grabada de una corrida real"}
      </p>
      <p className="hint">
        {origin === "live"
          ? codeOnly
            ? "Esta consulta se evaluó ahora; la decidió el código sin llamar a JEV."
            : "JEV se consultó ahora, desde el servidor, para esta acción."
          : "No se llamó a JEV ahora: es la respuesta guardada de una llamada real hecha al correr el eval."}
      </p>

      <h3 className="subtitle">
        {action.id} · {ACTION_TYPE_LABEL[action.type]}
      </h3>
      <p className="summary">{action.summary}</p>
      <ActionFacts action={action} />

      <div className={`verdict verdict-${decision.verdict}`} role="status" data-testid="verdict">
        <span className="verdict-word">{VERDICT_LABEL[decision.verdict]}</span>
        <span className="verdict-hint">{VERDICT_HINT[decision.verdict]}</span>
      </div>

      <h3 className="subtitle">Motivo (escrito por el código)</h3>
      <ul className="reasons">
        {decision.reasons.map((reason) => (
          <li key={reason.code}>{reason.text}</li>
        ))}
      </ul>

      <h3 className="subtitle">Chequeos de código</h3>
      {decision.checks.length === 0 ? (
        <p className="hint">Esta acción no tiene chequeos de código; su riesgo lo valora JEV.</p>
      ) : (
        <ul className="checks">
          {decision.checks.map((check) => (
            <li key={check.id} className={check.passed ? "check-ok" : "check-fail"}>
              <strong>{check.passed ? "Cumple" : "No cumple"}</strong> · {CHECK_LABEL[check.id]}: {check.detail}
            </li>
          ))}
        </ul>
      )}

      <h3 className="subtitle">Preguntas a JEV</h3>
      {codeOnly ? (
        <p className="hint">No se preguntó a JEV: un chequeo de código frenó la acción antes (más barato y determinista).</p>
      ) : (
        <ul className="answers">
          {decision.answers.map((answer) => (
            <AnswerRow key={answer.questionId} answer={answer} />
          ))}
        </ul>
      )}

      <dl className="stats">
        <div>
          <dt>Latencia</dt>
          <dd>{millis(decision.latencyMs)}</dd>
        </div>
        <div>
          <dt>Costo</dt>
          <dd>{dollars(decision.costUsd)}</dd>
        </div>
        <div>
          <dt>Tokens de entrada</dt>
          <dd>{decision.inputTokens}</dd>
        </div>
      </dl>
      {origin === "recorded" && <p className="hint">Latencia y costo son los medidos en la llamada real que se grabó.</p>}

      <button type="button" className="button button-primary" disabled={registered} onClick={() => onPropose(proposal)}>
        {registered ? "Ya está en el registro de auditoría" : "Proponer al portero y registrar"}
      </button>
    </section>
  );
}
