import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

import psycopg2
from fastapi import FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import get_allowed_origins_list, get_database_url, settings


BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Prediction Service")

def require_api_key(x_api_key: Optional[str]) -> None:
    expected = os.getenv("PREDICTION_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


class RefreshRequest(BaseModel):
    company_id: Optional[str] = None


def run_pipeline(company_id: Optional[str]) -> None:
    env = os.environ.copy()
    database_url = get_database_url(settings) or env.get("DATABASE_URL")
    if database_url and not env.get("PREDICTION_DB_URL"):
        env["PREDICTION_DB_URL"] = database_url
    env.setdefault("PREDICTION_SAVE_DB", "true")
    if company_id:
        env["PREDICTION_COMPANY_ID"] = company_id

    subprocess.run(
        [sys.executable, "app_build_dataset.py"],
        cwd=str(BASE_DIR),
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        [sys.executable, "app_train_forecast.py"],
        cwd=str(BASE_DIR),
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )


def period_to_days(period: int) -> int:
    if period in (3, 6, 12):
        return period * 30
    return period


origins = get_allowed_origins_list(settings.allowed_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/forecast/refresh")
def refresh_forecast(
    payload: RefreshRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> dict:
    require_api_key(x_api_key)
    try:
        run_pipeline(payload.company_id)
    except subprocess.CalledProcessError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline failed: {exc.stderr or exc.stdout or str(exc)}",
        ) from exc
    return {"status": "ok"}


@app.get("/forecast")
def get_forecast(
    period: int = Query(3, description="Months (3/6/12) or days (e.g., 365)"),
    company_id: Optional[str] = Query(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> dict:
    require_api_key(x_api_key)
    if not company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="company_id required")

    db_url = get_database_url(settings) or os.getenv("PREDICTION_DB_URL")
    if not db_url:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="db_url missing")

    model_name = "forecast_rf"
    days = period_to_days(period)

    with psycopg2.connect(db_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, trained_at
                FROM ml_models
                WHERE company_id = %s AND name = %s AND status = 'ACTIVE'
                ORDER BY trained_at DESC NULLS LAST, created_at DESC
                LIMIT 1
                """,
                (company_id, model_name),
            )
            model_row = cursor.fetchone()
            if not model_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No active model found for company",
                )
            model_id, trained_at = model_row

            cursor.execute(
                """
                SELECT prediction_date, predicted_revenue
                FROM ml_predictions
                WHERE model_id = %s AND horizon_days = 1
                ORDER BY prediction_date DESC
                LIMIT %s
                """,
                (str(model_id), days),
            )
            daily_rows = cursor.fetchall()

            if not daily_rows:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No daily predictions found for model",
                )

            daily_rows.reverse()
            daily_predictions = [
                {"date": row[0].isoformat(), "value": float(row[1])} for row in daily_rows
            ]

            cursor.execute(
                """
                SELECT predicted_revenue
                FROM ml_predictions
                WHERE model_id = %s AND horizon_days = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (str(model_id), days),
            )
            total_row = cursor.fetchone()
            if total_row:
                total = float(total_row[0])
            else:
                total = float(sum(item["value"] for item in daily_predictions))

    return {
        "model_id": str(model_id),
        "trained_at": trained_at.isoformat() if trained_at else None,
        "period_days": days,
        "total": total,
        "daily_predictions": daily_predictions,
    }
