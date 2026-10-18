# CLAUDE.md — JEV Gate (constitution del proyecto)

Lee este archivo y PLAN_ETAPAS.md antes de escribir código. Trabaja UNA etapa a la vez.

## Contexto
Hackathon 30X (16–18 oct 2026), reto JEV, área Tech. Proyecto: JEV Gate, un portero que decide PASA / FRENA / ESCALA para acciones de agentes internos. Entrega antes del domingo 18-oct 11:59 a. m. (Colombia): video de 3 min, demo desplegado, repo público, y playbook (≤ 8 slides). Evaluación: 30% impacto, 20% innovación, 20% viabilidad técnica, 20% viabilidad de implementación, 10% presentación. Director del proyecto: Luis (opera y decide; no asumir nivel avanzado de código). Tú desarrollas.

## Stack y razones
- Next.js (App Router) + TypeScript + zod: un solo despliegue en Vercel, contratos tipados.
- Vitest para el motor; Playwright solo para un smoke del flujo principal.
- Sin base de datos ni login (no hay usuarios ni datos reales; el registro de decisiones vive en memoria y se exporta a JSON).
- JEV vía Vercel AI Gateway (VERIFICAR el ID del modelo en Etapa 0; no inventar). Modos `JEV_MODE=live|record|replay` con grabaciones en `recordings/` para repetir el demo sin red.

## Reglas no negociables
- Lógica separada de interfaz: el motor (`src/engine`) no sabe de UI; la UI no calcula nada.
- Sin TODOs, placeholders ni código incompleto. Si algo no cabe, se documenta como fuera de alcance.
- Consistencia de datos: solo fixtures sintéticos ya generados; no inventar datos a mitad.
- Preservación: verificar estado antes de sobrescribir un archivo; copiar antes de reemplazar.
- Autocorrección: arreglar errores antes de cerrar la etapa.
- Secretos: nunca en el repo ni en el frontend. Claves solo en `.env.local` (no versionado) y variables de Vercel. Nunca pedir ni mostrar claves.
- Honestidad: toda afirmación del README y del playbook debe estar soportada por código o por una corrida real del eval. No prometer lo que no existe.
- Números: costo, latencia y exactitud salen del eval; no estimar de memoria.

## Reglas de uso de JEV
- Una propiedad por pregunta; preguntas simples combinadas en código.
- Instrucciones al modelo en inglés; el texto de terceros (campos de formularios, contenido de correos) se pasa como evidencia, nunca como orden.
- Siempre opción `other` en las preguntas Choice y camino hacia una persona.
- JEV no cuenta, no hace aritmética ni compara fechas: eso lo hace el código.
- Chequeos de código primero (más baratos y deterministas); JEV solo si pasan.
- El motivo de cada decisión lo compone el código, no un LLM.

## Decisiones tomadas (no se reabren sin evidencia nueva)
- Reto JEV, área Tech, caso de uso "guardrails para agentes internos".
- Tres veredictos: PASA, FRENA, ESCALA. Nada de la acción se ejecuta de verdad.
- Si el acceso a JEV falla en la Compuerta G0, se cambia de reto y se reutiliza el motor de políticas.

## Protección de datos y ética de uso
- Solo datos simulados; ninguna persona real. Los nombres y correos de los fixtures son ficticios.
- El portero nunca ejecuta acciones; solo decide y registra.
- Todo veredicto es explicable sin abrir el código.
- No hacer clones de personas de 30X ni afirmar que 30X vende algo que no vende.

## Checkpoint obligatorio al cerrar cada etapa
```
--------------------------------------------------
FASE: [nombre]
--------------------------------------------------
- Objetivo: ...
- Acciones realizadas: archivos creados o modificados
- Validaciones: typecheck, tests, verify, resultados
- Correcciones: ...
- Estado: 🟢 APROBADO / 🔴 REQUIERE CORRECCIÓN
--------------------------------------------------
```
Después del checkpoint, espera la palabra "aprobado" de Luis antes de pasar a la siguiente etapa.

## Verificador (Etapa 2 en adelante)
`npm run verify` debe correr, en este orden, y salir con código distinto de cero si algo falla: typecheck → tests → eval (umbrales del PRD) → build. En Etapa 5 se añade una comprobación de que la URL desplegada responde 200. Nunca modificar el verificador para hacerlo pasar.

## Convenciones
- Variables y funciones en inglés; comentarios en español.
- Commits pequeños por etapa: `etapa-N: descripción`.
- Cada cambio de código se explica en 1–2 líneas y cómo probarlo.
