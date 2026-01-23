from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd
import psycopg2
import requests


COLUMNS = [
    "report_date",
    "outbound_dials",
    "pickups",
    "conversations_30s_plus",
    "sales_call_booked_from_outbound",
    "sales_call_on_calendar",
    "no_show",
    "reschedule_request",
    "cancel",
    "deposits",
    "sales_one_call_close",
    "followup_sales",
    "upsell_conversation_taken",
    "upsells",
    "contract_value",
    "new_cash_collected",
]


@dataclass
class ApiConfig:
    url: str
    token: str | None = None


@dataclass
class DbConfig:
    url: str


def _normalize_frame(df: pd.DataFrame) -> pd.DataFrame:
    missing = [column for column in COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing)}")

    df = df[COLUMNS].copy()
    df["report_date"] = pd.to_datetime(df["report_date"], errors="coerce")
    if df["report_date"].isna().any():
        raise ValueError("Found invalid report_date values in dataset.")
    return df


def fetch_from_api(config: ApiConfig) -> pd.DataFrame:
    headers = {"Accept": "application/json"}
    if config.token:
        headers["Authorization"] = f"Bearer {config.token}"
    response = requests.get(config.url, headers=headers, timeout=30)
    response.raise_for_status()
    payload = response.json()

    if isinstance(payload, dict) and "data" in payload:
        payload = payload["data"]

    if not isinstance(payload, Iterable):
        raise ValueError("API response must be a list of records or a data array.")

    df = pd.DataFrame(payload)
    return _normalize_frame(df)


def fetch_from_db(config: DbConfig) -> pd.DataFrame:
    query = """
        SELECT
            dr.report_date,
            di.outbound_dials,
            di.pickups,
            di.conversations_30s_plus,
            di.sales_call_booked_from_outbound,
            di.sales_call_on_calendar,
            di.no_show,
            di.reschedule_request,
            di.cancel,
            di.deposits,
            di.sales_one_call_close,
            di.followup_sales,
            di.upsell_conversation_taken,
            di.upsells,
            di.contract_value,
            di.new_cash_collected
        FROM daily_reports dr
        JOIN daily_report_inputs di
            ON di.daily_report_id = dr.id
        ORDER BY dr.report_date;
    """
    with psycopg2.connect(config.url) as connection:
        df = pd.read_sql(query, connection)
    return _normalize_frame(df)


def write_csv(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
