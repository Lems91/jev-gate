export function HowItWorks() {
  return (
    <div className="prose">
      <ol className="how-steps">
        <li>
          <strong>El código va primero.</strong> Cuenta destinatarios y registros, compara la fecha con la ventana de envío y revisa los campos permitidos del CRM. Si algo falla, frena sin llamar a JEV: es más barato y exacto.
        </li>
        <li>
          <strong>JEV va después.</strong> Una sola llamada por acción con preguntas simples: ¿promete algo que no se vende?, ¿no encaja con la audiencia?, ¿el tono es agresivo?, ¿un tercero le da una orden al agente?, tipo de acción y riesgo. El texto de terceros viaja como evidencia, nunca como orden.
        </li>
        <li>
          <strong>El código decide y escribe el motivo.</strong> Una política con umbrales convierte las probabilidades en PASA, FRENA o ESCALA, y ningún LLM redacta el motivo. Si JEV no responde, la acción se escala; nunca pasa.
        </li>
        <li>
          <strong>Una persona resuelve lo escalado.</strong> Aprobar o rechazar solo deja constancia en el registro de auditoría, que se exporta a JSON.
        </li>
      </ol>
      <p className="hint">
        El prototipo solo decide y registra; nunca ejecuta una acción. Los límites (destinatarios, registros, horario), el catálogo y los umbrales son supuestos configurables del piloto, no la política de 30X. El detalle está en el README del repositorio.
      </p>
    </div>
  );
}
