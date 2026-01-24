from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping, Optional

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
    token: Optional[str] = None


@dataclass
class DbConfig:
    url: str


def _apply_aliases(record: Mapping[str, Any]) -> Dict[str, Any]:
    aliases = {
        "reportDate": "report_date",
        "date": "report_date",
        "outboundDials": "outbound_dials",
        "pickups": "pickups",
        "conversations30sPlus": "conversations_30s_plus",
        "salesCallBookedFromOutbound": "sales_call_booked_from_outbound",
        "salesCallOnCalendar": "sales_call_on_calendar",
        "noShow": "no_show",
        "rescheduleRequest": "reschedule_request",
        "cancel": "cancel",
        "deposits": "deposits",
        "salesOneCallClose": "sales_one_call_close",
        "followupSales": "followup_sales",
        "upsellConversationTaken": "upsell_conversation_taken",
        "upsells": "upsells",
        "contractValue": "contract_value",
        "newCashCollected": "new_cash_collected",
    }
    normalized: Dict[str, Any] = {}
    for key, value in record.items():
        normalized_key = aliases.get(key, key)
        normalized[normalized_key] = value
    return normalized


def _flatten_payload_item(item: Mapping[str, Any]) -> Dict[str, Any]:
    flattened: Dict[str, Any] = {}
    for key, value in item.items():
        if isinstance(value, Mapping):
            flattened.update(value)
        else:
            flattened[key] = value
    return _apply_aliases(flattened)


def _aggregate_by_date(df: pd.DataFrame) -> pd.DataFrame:
    numeric_columns = [column for column in COLUMNS if column != "report_date"]
    for column in numeric_columns:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")
    aggregated = df.groupby("report_date", as_index=False)[numeric_columns].sum()
    return aggregated


def _normalize_frame(df: pd.DataFrame, allow_missing: bool = False) -> pd.DataFrame:
    missing = [column for column in COLUMNS if column not in df.columns]
    if missing:
        if allow_missing:
            for column in missing:
                if column != "report_date":
                    df[column] = 0
        else:
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

    records = []
    for item in payload:
        if isinstance(item, Mapping):
            records.append(_flatten_payload_item(item))
        else:
            raise ValueError("API response items must be objects.")
    df = pd.DataFrame(records)
    if "report_date" not in df.columns:
        raise ValueError("API response must include report_date (or reportDate/date).")
    df["report_date"] = pd.to_datetime(df["report_date"], errors="coerce")
    df = _aggregate_by_date(df)
    return _normalize_frame(df, allow_missing=True)


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
    df = _normalize_frame(df)
    return _aggregate_by_date(df)


def write_csv(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
