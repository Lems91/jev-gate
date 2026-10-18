# Ficha de decisión — Hackathon 30X (cierre: domingo 18-oct-2026, 11:59 a. m. hora Colombia)

Estado: recomendación basada en las 4 fichas de HackRadar y en las clases previas. Las puntuaciones son juicio mío, no medición.
Criterios oficiales de evaluación: 30% impacto · 20% innovación · 20% viabilidad técnica · 20% viabilidad de implementación · 10% presentación.

## 1. Hallazgos al leer las fichas

1. **JEV pide más entregables que los 3 generales.** Además del video (máx. 3 min), el demo desplegado y el repo público, la ficha pide un **playbook de aplicación (máx. 5 páginas u 8 slides)**: decisiones, esquema de preguntas, umbrales, quién lo opera y cómo se mide. Hay que reservarle tiempo.
2. **Acceso a JEV:** consola de TypeSafe, Vercel AI Gateway, DigitalOcean y LangChain. Ya tienes Vercel. VERIFICAR: modelo/ID exacto, si el Gateway exige tarjeta o créditos, y si 30X dio clave o repo (Alfredo mostró un repo `jev-pdp-flow`, una guía `docs/hackathon.md` y un servidor MCP "jev" ya listo; dijo que compartiría el repo).
3. **Límites de JEV (de la ficha):** no sirve para contar, hacer aritmética ni comparar fechas (eso va en código); rinde mejor con preguntas simples combinadas en código; puede equivocarse con confianza. Diseño recomendado: opción "otro", umbrales de confianza y camino hacia una persona.
4. **Restricciones JEV:** nada de datos personales reales (datos simulados o públicos); el prototipo debe correr fuera de los sistemas de 30X; no entra: clones de personas de 30X ni soluciones que supongan que 30X vende algo que no vende.
5. **Radar de contenido:** no entra contenido tras login ni técnicas que violen términos de servicio, y el ejemplo del entregable habla de LinkedIn. "Temas que más crecen esta semana" necesita serie temporal, y no hay fuente de datos entregada. Riesgo alto de datos en 11 horas.
6. **Blinka:** flujo cerrado, métricas objetivas (autonomía, seguridad, explicabilidad) y "aprobar un pago indebido descalifica". Los datos los inventa cada equipo. Reto bien definido pero muy probable que lo elija mucha gente.
7. **Dapta:** pide leads reales encontrados en vivo, contacto por canal y entorno de Dapta. Mayor dependencia externa (fuentes, mensajería, términos de servicio).

## 2. Puntuación comparada (1 a 5, juicio mío)

| Reto | Impacto 30% | Innov. 20% | Téc. 20% | Impl. 20% | Present. 10% | Total |
|---|---|---|---|---|---|---|
| JEV (Tech · Guardrails) | 4 | 4 | 4 | 5 | 4 | 4.2 |
| Blinka | 4 | 2 | 4 | 3 | 3 | 3.3 |
| Radar de contenido | 3 | 3 | 2 | 3 | 3 | 2.8 |
| Dapta | 3 | 3 | 2 | 2 | 3 | 2.6 |

## 3. Recomendación

**Reto JEV, área Tech, idea "Guardrails para agentes internos" → proyecto "JEV Gate".**

Por qué:
- Datos sintéticos permitidos y demo totalmente controlable.
- Encaja con el patrón que Alfredo mostró (preguntas cerradas → probabilidades → el código decide → un hook bloquea) y con tu metodología (aprobación humana obligatoria).
- Se puede medir con un set de evaluación (aciertos, falsos permisos, costo, latencia), lo que alimenta viabilidad técnica y de implementación.
- Es menos obvio que "alertas de riesgo de abandono" (Arantxa ya la presentó) y que las ideas de e-commerce de Alfredo.

Riesgos:
- JEV es el reto más popular [Suposición]; se compite con ángulo y pitch.
- El acceso a JEV no está verificado.
- El playbook agrega trabajo.

## 4. Compuertas go / no-go (hora Bogotá)

| Compuerta | Hora | Criterio | Si falla |
|---|---|---|---|
| G0 — acceso a JEV | 02:15 | Una llamada real con una pregunta Noul devuelve probabilidad | Cambiar a Blinka reutilizando la misma arquitectura (motor de políticas + escalar a humano + registro explicable) |
| G1 — motor listo | 03:30 | Motor + tests + datos sintéticos en verde | Recortar acciones a 3 tipos |
| G2 — demo real | 09:00 | URL en Vercel funcionando con JEV real | Usar modo replay solo para respaldo, no para el demo principal |
| G3 — congelar | 10:00 | No se agrega nada nuevo | Solo corregir, grabar y subir |

Entrega objetivo: todo subido antes de las 11:15 (margen de 44 min sobre el cierre; la subida no admite excepciones).
