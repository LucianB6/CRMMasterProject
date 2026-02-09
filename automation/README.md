# Automation testing

Acest folder gazduieste structura pentru testare automata a fluxurilor utilizator din SalesWay.
Scopul este sa avem o organizare clara pentru documentare, planificare si implementare treptata
(in viitor) a testelor automate.

## Structura propusa

- `config/` - configurari de rulare (ex: URL-uri, environments).
- `docs/` - documentatie: plan de testare, conventii, definirea fluxurilor.
- `fixtures/` - date de test (utilizatori, payload-uri sample).
- `flows/` - descrierea fluxurilor utilizator (pas cu pas).
- `specs/` - specificatii pentru test-case-uri, grupate pe zone functionale.
- `scripts/` - scripturi helper (ex: reset date, seed data).
- `reports/` - rapoarte generate de testele automate (daca/atunci cand vor exista).

## Cum folosim structura

1. Definim fluxurile principale in `flows/`.
2. Stabilim planul general in `docs/test-plan.md`.
3. Detaliem test-case-urile in `specs/` (cate un fisier per flux/feature).
4. Adaugam datele de test in `fixtures/`.
5. Implementam automatizarea propriu-zisa cand decidem un framework.
