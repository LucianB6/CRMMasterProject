# Lead Pipeline – analiză backend + DB + query-uri propuse

## 1) Ce există deja în backend/DB (context pentru integrare)

- Stack backend: Spring Boot + JPA, PostgreSQL, UUID pe entități, coloane `created_at`/`updated_at` prin clasele de audit (`AuditedEntity`).
- Model multi-tenant deja existent prin `companies` + `company_memberships`.
- Convenții existente utile pentru noul modul:
  - relații pe `company_id`;
  - soft-state prin flaguri de tip `is_active` (deja folosit în `companies`, `users`);
  - flyway scripts în `backend/src/main/resources/db/migration`.

> Concluzie: pipeline-ul de lead-uri se potrivește natural ca modul nou legat de `company_id`, fără a modifica fluxurile actuale (daily reports, goals, calendar etc.).

---

## 2) Model DB recomandat pentru Lead Form configurabil

DDL-ul de mai jos poate fi rulat manual direct în pgAdmin (fără fișier SQL păstrat în repo).

### Tabele

1. `lead_forms`
   - 1 formular / companie (`UNIQUE(company_id)`).
   - `public_slug` pentru link public / embed.

2. `lead_form_questions`
   - întrebări custom pentru formular;
   - `display_order` pentru reorder;
   - `is_active` pentru „ștergere logică” (inactive, fără pierdere istoric).

3. `leads`
   - fiecare submit de formular creează un lead.

4. `lead_standard_fields`
   - câmpurile standard: nume, prenume, email, telefon.

5. `lead_answers`
   - răspunsurile custom;
   - păstrează snapshot metadată întrebare la submit:
     - `question_label_snapshot`
     - `question_type_snapshot`
     - `required_snapshot`
     - `options_snapshot`

### De ce snapshot pe răspuns?

Acesta rezolvă cerința critică: dacă managerul schimbă label/type/opțiuni ulterior, lead-urile vechi rămân perfect afișabile cu „realitatea de la momentul submit-ului”.

---


> Notă: query-urile pot fi rulate manual în pgAdmin, fără a păstra un fișier SQL separat în repo.

## 2.1) DDL complet (create tables + constraints + indexes)

```sql
CREATE TABLE IF NOT EXISTS lead_forms (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Lead Form',
  public_slug VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_lead_forms_company UNIQUE (company_id),
  CONSTRAINT uq_lead_forms_public_slug UNIQUE (public_slug),
  CONSTRAINT fk_lead_forms_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS lead_form_questions (
  id UUID PRIMARY KEY,
  lead_form_id UUID NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  placeholder VARCHAR(255),
  help_text TEXT,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options_json JSONB,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_lead_form_questions_form FOREIGN KEY (lead_form_id) REFERENCES lead_forms(id),
  CONSTRAINT chk_lead_form_questions_type CHECK (
    question_type IN ('short_text', 'long_text', 'single_select', 'multi_select', 'number', 'date', 'boolean')
  ),
  CONSTRAINT chk_lead_form_questions_order CHECK (display_order >= 1)
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  lead_form_id UUID NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'form',
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_leads_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_leads_form FOREIGN KEY (lead_form_id) REFERENCES lead_forms(id)
);

CREATE TABLE IF NOT EXISTS lead_standard_fields (
  lead_id UUID PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_lead_standard_fields_lead FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS lead_answers (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL,
  question_id UUID,
  answer_value JSONB NOT NULL,
  question_label_snapshot VARCHAR(255) NOT NULL,
  question_type_snapshot VARCHAR(50) NOT NULL,
  required_snapshot BOOLEAN NOT NULL,
  options_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_lead_answers_lead FOREIGN KEY (lead_id) REFERENCES leads(id),
  CONSTRAINT fk_lead_answers_question FOREIGN KEY (question_id) REFERENCES lead_form_questions(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_form_questions_form_active_order
  ON lead_form_questions (lead_form_id, is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_leads_company_submitted_at
  ON leads (company_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_form_submitted_at
  ON leads (lead_form_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_answers_lead
  ON lead_answers (lead_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_answers_lead_question
  ON lead_answers (lead_id, question_id)
  WHERE question_id IS NOT NULL;
```

## 3) Query-uri DB pentru operațiile cerute (pgAdmin-ready, fără `:param`)

> Toate query-urile de mai jos sunt executabile direct în pgAdmin Query Tool.

### 3.1. Upsert formular companie (un singur formular)

```sql
INSERT INTO lead_forms (
  id, company_id, title, public_slug, is_active, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  'REPLACE_COMPANY_ID'::uuid,
  'Lead Form Principal',
  'lead-form-principal-acme',
  TRUE,
  now(),
  now()
)
ON CONFLICT (company_id)
DO UPDATE SET
  title = EXCLUDED.title,
  public_slug = EXCLUDED.public_slug,
  is_active = EXCLUDED.is_active,
  updated_at = now()
RETURNING *;
```

### 3.2. Citire formular public (doar întrebări active, ordonate)

```sql
SELECT
  f.id AS form_id,
  f.company_id,
  f.title,
  f.public_slug,
  q.id AS question_id,
  q.question_type,
  q.label,
  q.placeholder,
  q.help_text,
  q.required,
  q.options_json,
  q.display_order
FROM lead_forms f
LEFT JOIN lead_form_questions q
  ON q.lead_form_id = f.id
 AND q.is_active = TRUE
WHERE f.public_slug = 'lead-form-principal-acme'
  AND f.is_active = TRUE
ORDER BY q.display_order ASC;
```

### 3.3. Adăugare întrebare

```sql
INSERT INTO lead_form_questions (
  id, lead_form_id, question_type, label, placeholder, help_text,
  required, options_json, display_order, is_active, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  'REPLACE_FORM_ID'::uuid,
  'short_text',
  'Sursa lead-ului',
  'Ex: Facebook Ads',
  'Spune-ne de unde ai aflat de noi',
  TRUE,
  NULL,
  1,
  TRUE,
  now(),
  now()
)
RETURNING *;
```

### 3.4. Editare întrebare (fără afectare istoric)

```sql
WITH params AS (
  SELECT
    'REPLACE_QUESTION_ID'::uuid AS question_id,
    'REPLACE_FORM_ID'::uuid AS lead_form_id,
    'Label nou'::varchar AS label,
    TRUE::boolean AS required,
    '["Opțiunea 1", "Opțiunea 2"]'::jsonb AS options_json,
    'Placeholder nou'::varchar AS placeholder,
    'Help text nou'::text AS help_text
)
UPDATE lead_form_questions q
SET
  label = COALESCE(p.label, q.label),
  required = COALESCE(p.required, q.required),
  options_json = COALESCE(p.options_json, q.options_json),
  placeholder = COALESCE(p.placeholder, q.placeholder),
  help_text = COALESCE(p.help_text, q.help_text),
  updated_at = now()
FROM params p
WHERE q.id = p.question_id
  AND q.lead_form_id = p.lead_form_id
RETURNING q.*;
```

### 3.5. Reorder întrebări (bulk)

```sql
WITH params AS (
  SELECT
    'REPLACE_FORM_ID'::uuid AS lead_form_id,
    ARRAY[
      'REPLACE_QUESTION_ID_1'::uuid,
      'REPLACE_QUESTION_ID_2'::uuid
    ] AS question_ids,
    ARRAY[1, 2]::int[] AS display_orders
),
payload AS (
  SELECT p.lead_form_id, t.question_id, t.new_order
  FROM params p,
       unnest(p.question_ids, p.display_orders) AS t(question_id, new_order)
)
UPDATE lead_form_questions q
SET display_order = payload.new_order,
    updated_at = now()
FROM payload
WHERE q.id = payload.question_id
  AND q.lead_form_id = payload.lead_form_id
RETURNING q.id, q.label, q.display_order;
```

### 3.6. Dezactivare întrebare (soft delete)

```sql
UPDATE lead_form_questions
SET is_active = FALSE,
    updated_at = now()
WHERE id = 'REPLACE_QUESTION_ID'::uuid
  AND lead_form_id = 'REPLACE_FORM_ID'::uuid
RETURNING *;
```

### 3.7. Submit lead (tranzacțional)

```sql
BEGIN;

INSERT INTO leads (
  id, company_id, lead_form_id, source, status, submitted_at, created_at, updated_at
)
VALUES (
  'REPLACE_LEAD_ID'::uuid,
  'REPLACE_COMPANY_ID'::uuid,
  'REPLACE_FORM_ID'::uuid,
  'form',
  'new',
  now(),
  now(),
  now()
);

INSERT INTO lead_standard_fields (
  lead_id, first_name, last_name, email, phone, created_at, updated_at
)
VALUES (
  'REPLACE_LEAD_ID'::uuid,
  'Ana',
  'Popescu',
  'ana@example.com',
  '+40740111222',
  now(),
  now()
);

WITH incoming AS (
  SELECT
    (elem->>'question_id')::uuid AS question_id,
    elem->'value' AS answer_value
  FROM jsonb_array_elements(
    '[
      {"question_id":"REPLACE_QUESTION_ID_1","value":"Facebook Ads"},
      {"question_id":"REPLACE_QUESTION_ID_2","value":["B2B","SaaS"]}
    ]'::jsonb
  ) elem
),
active_questions AS (
  SELECT q.*
  FROM lead_form_questions q
  WHERE q.lead_form_id = 'REPLACE_FORM_ID'::uuid
    AND q.is_active = TRUE
)
INSERT INTO lead_answers (
  id, lead_id, question_id, answer_value,
  question_label_snapshot, question_type_snapshot, required_snapshot, options_snapshot,
  created_at
)
SELECT
  gen_random_uuid(),
  'REPLACE_LEAD_ID'::uuid,
  q.id,
  i.answer_value,
  q.label,
  q.question_type,
  q.required,
  q.options_json,
  now()
FROM incoming i
JOIN active_questions q ON q.id = i.question_id;

COMMIT;
```

### 3.8. Validare întrebări obligatorii înainte de insert answers

```sql
WITH params AS (
  SELECT
    'REPLACE_FORM_ID'::uuid AS lead_form_id,
    '[
      {"question_id":"REPLACE_QUESTION_ID_1","value":"Facebook Ads"}
    ]'::jsonb AS answers_json
),
incoming AS (
  SELECT
    (elem->>'question_id')::uuid AS question_id
  FROM params p,
       jsonb_array_elements(p.answers_json) elem
)
SELECT q.id, q.label
FROM lead_form_questions q
JOIN params p ON p.lead_form_id = q.lead_form_id
LEFT JOIN incoming i ON i.question_id = q.id
WHERE q.is_active = TRUE
  AND q.required = TRUE
  AND i.question_id IS NULL;
```

Dacă query-ul returnează rânduri => lipsesc răspunsuri obligatorii.

### 3.9. Listare lead-uri pentru companie

```sql
SELECT
  l.id,
  l.status,
  l.submitted_at,
  s.first_name,
  s.last_name,
  s.email,
  s.phone
FROM leads l
JOIN lead_standard_fields s ON s.lead_id = l.id
WHERE l.company_id = 'REPLACE_COMPANY_ID'::uuid
ORDER BY l.submitted_at DESC
LIMIT 20 OFFSET 0;
```

### 3.10. Detaliu lead + răspunsuri (inclusiv întrebări inactive)

```sql
SELECT
  l.id AS lead_id,
  l.status,
  l.submitted_at,
  s.first_name,
  s.last_name,
  s.email,
  s.phone,
  a.question_id,
  a.question_label_snapshot,
  a.question_type_snapshot,
  a.required_snapshot,
  a.options_snapshot,
  a.answer_value
FROM leads l
JOIN lead_standard_fields s ON s.lead_id = l.id
LEFT JOIN lead_answers a ON a.lead_id = l.id
WHERE l.id = 'REPLACE_LEAD_ID'::uuid
  AND l.company_id = 'REPLACE_COMPANY_ID'::uuid
ORDER BY a.created_at ASC;
```

---

## 4) Structură backend propusă (fără implementare acum)

## 4.1. Module / pachete

- `com.salesway.leads.form`
  - `LeadFormController` (manager CRUD form + questions)
  - `LeadFormService`
  - `LeadFormRepository`, `LeadFormQuestionRepository`
  - DTO-uri: create/update/reorder
- `com.salesway.leads.capture`
  - `PublicLeadFormController` (GET form public, POST submit)
  - `LeadCaptureService`
  - `LeadRepository`, `LeadStandardFieldsRepository`, `LeadAnswerRepository`
- `com.salesway.leads.management`
  - `LeadManagementController` (list/detail/status update)

## 4.2. Endpoint-uri recomandate pentru Postman

Manager (autentificat, role manager/admin):

- `GET /api/manager/lead-form`
- `PUT /api/manager/lead-form`
- `POST /api/manager/lead-form/questions`
- `PATCH /api/manager/lead-form/questions/{questionId}`
- `PATCH /api/manager/lead-form/questions/reorder`
- `DELETE /api/manager/lead-form/questions/{questionId}` (soft delete)

Public:

- `GET /api/public/lead-form/{publicSlug}`
- `POST /api/public/lead-form/{publicSlug}/submit`

Lead management intern:

- `GET /api/manager/leads?status=&page=&size=`
- `GET /api/manager/leads/{leadId}`
- `PATCH /api/manager/leads/{leadId}/status`

---

## 5) Contract request/response propus (compact)

### POST /api/public/lead-form/{publicSlug}/submit

Request:

```json
{
  "standard": {
    "firstName": "Ana",
    "lastName": "Popescu",
    "email": "ana@demo.ro",
    "phone": "+40740111222"
  },
  "answers": [
    {"questionId": "d4c1...", "value": "Facebook Ads"},
    {"questionId": "7a11...", "value": ["B2B", "SaaS"]},
    {"questionId": "8b22...", "value": true}
  ]
}
```

Response:

```json
{
  "leadId": "6e8f...",
  "submittedAt": "2026-02-17T12:30:10Z",
  "status": "new"
}
```

---

## 6) Observații importante de implementare ulterioară

- La submit, citești întrebările active din acel moment și salvezi snapshot în `lead_answers`.
- Nu șterge fizic întrebări; doar `is_active = false`.
- Pentru consistență la reorder, ideal validezi că ordinea nu are duplicate/gaps.
- Pentru volum mare, păstrezi index pe `leads(company_id, submitted_at)` și `lead_form_questions(lead_form_id, is_active, display_order)`.
- Pentru embed/public link: recomandat un `public_slug` random + ratelimit la submit endpoint.
