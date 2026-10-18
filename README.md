# JEV Gate

Un portero que decide **PASA / FRENA / ESCALA** para las acciones que proponen agentes internos (correo masivo, cambios en el CRM, publicaciones). Nada de la acción se ejecuta: el portero solo decide y deja el motivo escrito. Proyecto del hackathon 30X (reto JEV, área Tech).

> **Estado:** en desarrollo (Etapa 2 de 6). Este README se completa en la Etapa 5 con los resultados finales del eval.

## Los límites y el catálogo son supuestos configurables

Los límites (500 destinatarios por envío, 20 registros del CRM por acción, ventana de envío lunes a sábado de 08:00 a 18:00 hora de Colombia), la lista de campos permitidos del CRM, el catálogo de ofertas y los umbrales de probabilidad son **supuestos del piloto, configurables** en `src/contracts/catalog.ts` y `src/engine/config.ts`. **No son la política de 30X.** Los datos de las 48 acciones de prueba (`fixtures/actions.json`) son sintéticos; los nombres y empresas son ficticios.

## Calibración y set de desarrollo

Los umbrales (bloqueo 0,90, escalamiento 0,50, confianza mínima 0,50 en `action_kind`, y que `risk_level` escale solo con `high`, `critical` u `other`) se **calibraron sobre el set de desarrollo de 48 acciones**, que es el mismo con el que se mide. Por eso las cifras de ese set no demuestran cómo se comportará el portero con acciones nuevas. En la Etapa 4 se mide contra un **set nuevo, no usado para calibrar**, y esa cifra es la que se reporta como resultado.

## Cómo está hecho

- `src/contracts`: esquemas zod (acción, pregunta a JEV, decisión, registro) y datos de referencia.
- `src/engine`: el motor, sin interfaz.
  - `checks.ts`: chequeos de código (conteos, ventana de envío, campos permitidos). Usan la fecha de la propia acción, nunca el reloj real. Si uno falla, se frena **sin llamar a JEV**.
  - `questions.ts`: arma **una sola llamada a JEV por acción** con todas sus preguntas (una propiedad por pregunta, instrucciones en inglés, el texto de terceros viaja como evidencia).
  - `jev-client.ts`: modos `JEV_MODE=live|record|replay`. `record` graba cada respuesta en `recordings/` y `replay` las repite sin red ni costo. Sin variable, el modo es `replay`.
  - `policy.ts`: la política (umbrales) que convierte las respuestas en veredicto. `reasons.ts` compone el motivo con código, no con un LLM.
  - `gate.ts`: junta todo; máximo 4 decisiones en paralelo. Si JEV no responde, la acción se **escala**, nunca pasa.
  - `metrics.ts`: métricas del eval.

## Comandos

```powershell
npm run test          # tests del motor (Vitest)
npm run eval          # eval en modo replay (usa recordings/, sin red)
npm run eval:record   # eval llamando a JEV y grabando (requiere AI_GATEWAY_API_KEY en .env.local)
npm run verify        # next typegen, typecheck, tests, eval con los umbrales del PRD, build
```

Los informes del eval quedan en `reports/`: el de replay se sobrescribe en `eval-replay-latest.*`; los de `record` y `live` se conservan con fecha y hora.

## Umbrales del eval (PRD)

`npm run eval` falla (y por tanto `npm run verify`) si no se cumple alguno: exactitud global ≥ 85 %, 0 falsos permisos en críticas (etiquetadas FRENA) y autonomía en seguras ≥ 60 %. Los resultados medidos están en `reports/`.
