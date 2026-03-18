# Lead Details + Campaigns Backend API

## Campaigns (Form Editor)

### `GET /manager/lead-form/{formId}/campaigns`
- Returnează campaniile active pentru formular.
- Sortare: `createdAt DESC`.

### `POST /manager/lead-form/{formId}/campaigns`
- Creează campanie.
- Validări:
  - `name` obligatoriu.
  - `channel` obligatoriu: `META | GOOGLE | ORGANIC | OTHER | FORM`.
  - `campaignCode` obligatoriu și unic (case-insensitive) pe formular pentru campaniile active.

### `PATCH /manager/lead-form/{formId}/campaigns/{campaignId}`
- Update parțial: `name`, `channel`, `campaignCode`, `utmSource`, `utmMedium`, `isActive`.

### `DELETE /manager/lead-form/{formId}/campaigns/{campaignId}`
- Soft delete (`isActive=false`).

## Lead Details

### `GET /manager/leads/{leadId}/answers`
- Returnează răspunsurile formularului.
- Include: `questionId`, `questionLabel`, `questionType`, `answer`, `answeredAt`.
- Sortare: `display_order_snapshot ASC`, apoi `createdAt ASC`.

### `GET /manager/leads/{leadId}/activities?page=&size=`
- Returnează timeline paginat (desc după `createdAt`).
- Tipuri expuse: `note`, `call`, `task`, `status_change`, `email`.

### `POST /manager/leads/{leadId}/notes`
- Endpoint existent, păstrat.
- Creează notă + event în timeline (`NOTE_ADDED`).

### `POST /manager/leads/{leadId}/calls`
- Creează call log persistent (`lead_call_logs`) + event timeline (`CALL_LOGGED`).

### `POST /manager/leads/{leadId}/tasks`
- Creează task board item asociat lead-ului + event timeline (`TASK_CREATED`).

### `GET /manager/leads/{leadId}/ai-insights`
- Returnează payload stabil:
  - `score` (0-100),
  - `recommendedAction`,
  - `suggestedApproach`,
  - `scoreFactors[]`,
  - `generatedAt`.

## Security / Tenant Boundaries

- Toate endpoint-urile de mai sus necesită autentificare.
- Accesul este limitat la compania din membership-ul managerului curent.
- Pentru resurse inexistente sau cross-company se returnează `404` / `400` / `403` în funcție de caz.
