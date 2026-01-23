# Prediction workspace

Acest folder este un spațiu de lucru pentru antrenare și predicție pe baza rapoartelor zilnice (daily reports).
Scopul este să obținem prognoze pentru vânzările totale pe următoarele 3/6/12 luni și să exportăm rezultatele
într-un format ușor de consumat în frontend.

## Structură

- `data/daily_report.csv` – dataset de antrenare (export din DB sau exemplu sintetic pentru demo).
- `models/` – modele salvate (opțional, dacă doriți serializare).
- `outputs/` – rezultate (ex: `forecast.json`, `metrics.json`).
- `train_forecast.py` – script principal pentru antrenare + predicție.

## Format CSV (daily_report.csv)

Fișierul CSV folosește câmpurile din `daily_report_inputs` plus data raportului.
Coloane așteptate:

```
report_date,
outbound_dials,
pickups,
conversations_30s_plus,
sales_call_booked_from_outbound,
sales_call_on_calendar,
no_show,
reschedule_request,
cancel,
deposits,
sales_one_call_close,
followup_sales,
upsell_conversation_taken,
upsells,
contract_value,
new_cash_collected
```

## Rulare

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train_forecast.py --csv data/daily_report.csv --target new_cash_collected
```

Scriptul va genera:

- `outputs/metrics.json` – acuratețe (MAE, RMSE, MAPE) pe setul de test.
- `outputs/forecast.json` – totaluri estimate pe 3/6/12 luni + serie zilnică.

## Note pentru integrare frontend

Frontend-ul poate consuma `outputs/forecast.json` (sau un endpoint backend care îl expune).
Cheile principale sunt:

- `totals`: totaluri pe 3/6/12 luni
- `daily_predictions`: listă zilnică (date + value)

Astfel, UI-ul poate afișa atât totaluri agregate, cât și un grafic de trend.
