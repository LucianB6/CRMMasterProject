# Plan de testare automatizare (draft)

## 1. Obiectiv
Sa acoperim fluxurile critice pentru utilizatori (agent, manager, admin) astfel incat sa avem
siguranta functionala si un material clar pentru disertatie.

## 2. Scope

### In scope (initial)
- Autentificare si acces pe roluri.
- Completare raport zilnic (draft/autosave + submit).
- Vizualizare dashboard si KPI-uri.
- Notificari si statusuri pentru manager.

### Out of scope (pentru faze ulterioare)
- Load testing / performance.
- Testare end-to-end pe integrari externe (ex: email/SMS).

## 3. Tipuri de teste
- Smoke tests (fluxuri esentiale).
- Happy path.
- Negative path (validari, drepturi de acces).

## 4. Medii
- `local` / `staging` (configurat in `automation/config/`).

## 5. Livrabile
- Specificatii test-case in `automation/specs/`.
- Rapoarte in `automation/reports/`.
