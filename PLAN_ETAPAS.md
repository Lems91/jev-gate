# PLAN_ETAPAS.md — cómo se desarrolla JEV Gate

Horas en Bogotá. Cierre oficial: domingo 18-oct 11:59. Objetivo de entrega: 11:15.
Cada etapa tiene un entregable cerrado y una prohibición explícita de adelantarse. Al terminar: checkpoint (formato en CLAUDE.md) y esperar "aprobado".

## Preparación (Luis, PowerShell; un comando por vez)

```powershell
mkdir C:\dev\jev-gate\docs
```
Copia en `C:\dev\jev-gate`: `CLAUDE.md` y `PLAN_ETAPAS.md`. Copia en `C:\dev\jev-gate\docs`: `01_Ficha_Decision_Reto.md` y `02_PRD_JEV_Gate.md`.

```powershell
cd C:\dev\jev-gate
```
```powershell
git init
```
```powershell
claude
```
Crea tú mismo `.env.local` (nunca lo pegues en el chat) con las claves que necesite JEV. Primer prompt para Claude Code: "Lee CLAUDE.md y PLAN_ETAPAS.md y ejecuta solo la Etapa 0."

## Etapa 0 — Acceso a JEV y esqueleto (01:50–02:15) · COMPUERTA G0
Entregable: proyecto Next.js + TypeScript mínimo desplegado en Vercel ("hola mundo" en URL pública) y un script `scripts/jev-ping.ts` que haga UNA llamada real a JEV con una pregunta Noul y muestre la probabilidad, la latencia y los tokens.
Prohibido: motor, UI, fixtures.
Validación: ping con probabilidad real. Si falla el acceso a las 02:15, parar y decidir con Luis el cambio a Blinka.

## Etapa 1 — Contratos y datos sintéticos (02:15–02:50)
Entregable: esquemas zod (`Action`, `JevQuestion`, `Decision`, `AuditEntry`), catálogo de ofertas permitidas, lista de campos permitidos del CRM, y 48 acciones sintéticas etiquetadas (16 seguras, 16 escalar, 16 frenar) en `fixtures/`.
Prohibido: motor, UI, llamadas a JEV.
Validación: todos los fixtures validan contra los esquemas; distribución 16/16/16.

## Etapa 2 — Motor de decisión + tests + verificador (02:50–03:30) · COMPUERTA G1
Entregable: `src/engine` con (a) chequeos de código (conteos, ventana de envío, límite de destinatarios, campos permitidos), (b) cliente JEV con modos live/record/replay, (c) política PASA/FRENA/ESCALA, (d) compositor de motivos, (e) tests Vitest incluyendo casos borde, (f) `npm run eval` y `npm run verify`.
Prohibido: UI, tocar el verificador para que pase.
Validación: `npm run verify` en verde; primera corrida del eval registrada en `reports/`.
Al terminar: dormir.

## Etapa 3 — Interfaz de una pantalla (07:00–08:15)
Entregable: página única con lista de acciones, tarjeta de decisión, cola de revisión humana, métricas del eval y campo "prueba tu acción". Móvil legible.
Prohibido: lógica de negocio en la UI; páginas extra; login.
Validación: smoke Playwright del flujo (proponer → escalar → aprobar → registro).

## Etapa 4 — Calibrar, desplegar y revisar seguridad (08:15–09:30) · COMPUERTA G2
Entregable: umbrales calibrados con el eval; deploy en Vercel con JEV real; revisión de secretos y entradas (`/security-review`); URL probada en otro dispositivo.
Prohibido: funciones nuevas.
Validación: `npm run verify` más 200 en la URL desplegada.

## Etapa 5 — Release y documentación (09:30–10:00) · COMPUERTA G3
Entregable: README (qué es, arquitectura, cómo correrlo, resultados reales del eval, costo y latencia medidos, límites conocidos), `docs/` con PRD, y grabación de respaldo en modo replay lista.
Prohibido: código nuevo salvo correcciones.
Regla: todo lo que diga el README tiene respaldo en código o en una corrida real.

## Etapa 6 — Playbook, video y entrega (10:00–11:15)
Entregable: playbook ≤ 8 slides (se arma en el chat del proyecto con los números reales del eval), video de 3 min, repo público, formulario de HackRadar con los 3 enlaces más el playbook.
Hecho cuando: Luis confirma que HackRadar muestra el proyecto como entregado.
Prohibido: cambiar código después de grabar el video.

## Si algo se atrasa
Recortar primero: tipos de acción (de 3 a 2), tamaño del eval (de 48 a 30), "prueba tu acción". No recortar: tests, verificador, el demo con JEV real, el video.
