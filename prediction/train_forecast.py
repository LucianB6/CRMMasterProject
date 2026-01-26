import argparse
import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from data_sources import ApiConfig, DbConfig, fetch_from_api, fetch_from_db, write_csv
from config import get_database_url, settings


def load_config(path: str) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in config file: {path}") from exc


def default_version() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")


@dataclass
class ForecastConfig:
    csv_path: Path
    target: str
    output_dir: Path
    rolling_window: int
    horizons: tuple
    refresh: bool
    db_url: Optional[str]
    api_url: Optional[str]
    api_token: Optional[str]
    company_id: Optional[str]
    model_name: str
    model_version: str
    model_status: str
    save_db: bool
    deprecate_previous: bool
    artifact_uri: Optional[str]


def parse_args() -> ForecastConfig:
    parser = argparse.ArgumentParser(description="Train and forecast sales totals.")
    parser.add_argument("--csv", dest="csv_path", default=None, help="Path to daily_report.csv")
    parser.add_argument(
        "--target",
        default="new_cash_collected",
        help="Target column to forecast (default: new_cash_collected)",
    )
    parser.add_argument("--output", default="outputs", help="Output directory for forecasts")
    parser.add_argument("--config", default="config.json", help="Path to JSON config file")
    parser.add_argument(
        "--rolling-window",
        type=int,
        default=30,
        help="Rolling window (days) for imputing future inputs",
    )
    parser.add_argument(
        "--horizons",
        default="3,6,12",
        help="Comma-separated list of month horizons (ex: 3,6,12)",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Refresh CSV from DB/API before training (uses --db-url or --api-url).",
    )
    parser.add_argument("--db-url", default=os.getenv("PREDICTION_DB_URL"))
    parser.add_argument("--api-url", default=os.getenv("PREDICTION_API_URL"))
    parser.add_argument("--api-token", default=os.getenv("PREDICTION_API_TOKEN"))
    parser.add_argument("--company-id", default=os.getenv("PREDICTION_COMPANY_ID"))
    parser.add_argument("--model-name", default=None)
    parser.add_argument("--model-version", default=None)
    parser.add_argument("--model-status", default=None)
    parser.add_argument("--artifact-uri", default=None)
    parser.add_argument("--save-db", action="store_true", help="Persist model and predictions to DB")
    parser.add_argument(
        "--deprecate-previous",
        action="store_true",
        help="Mark previous ACTIVE models as DEPRECATED for the same company/name",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    if args.csv_path is None:
        args.csv_path = config.get("csv_path", "data/daily_report.csv")
    if args.target == "new_cash_collected" and config.get("target"):
        args.target = config["target"]
    if args.output == "outputs" and config.get("output_dir"):
        args.output = config["output_dir"]
    if args.rolling_window == 30 and config.get("rolling_window"):
        args.rolling_window = int(config["rolling_window"])
    if args.horizons == "3,6,12" and config.get("horizons"):
        args.horizons = config["horizons"]
    args.db_url = args.db_url or os.getenv("PREDICTION_DB_URL") or get_database_url(settings) or config.get("db_url")
    args.api_url = args.api_url or config.get("api_url")
    args.api_token = args.api_token or config.get("api_token")
    args.company_id = args.company_id or config.get("company_id")
    args.model_name = args.model_name or os.getenv("PREDICTION_MODEL_NAME") or config.get(
        "model_name", "forecast_rf"
    )
    args.model_version = (
        args.model_version
        or os.getenv("PREDICTION_MODEL_VERSION")
        or config.get("model_version", default_version())
    )
    args.model_status = (
        args.model_status
        or os.getenv("PREDICTION_MODEL_STATUS")
        or config.get("model_status", "ACTIVE")
    )
    args.artifact_uri = args.artifact_uri or os.getenv("PREDICTION_ARTIFACT_URI") or config.get(
        "artifact_uri"
    )
    save_db_env = os.getenv("PREDICTION_SAVE_DB")
    if save_db_env is not None:
        args.save_db = save_db_env.strip().lower() in {"1", "true", "yes"}
    else:
        args.save_db = args.save_db or bool(config.get("save_db", False))

    deprecate_env = os.getenv("PREDICTION_DEPRECATE_PREVIOUS")
    if deprecate_env is not None:
        args.deprecate_previous = deprecate_env.strip().lower() in {"1", "true", "yes"}
    else:
        args.deprecate_previous = args.deprecate_previous or bool(
            config.get("deprecate_previous", True)
        )

    horizons = tuple(int(value) for value in args.horizons.split(",") if value.strip())

    return ForecastConfig(
        csv_path=Path(args.csv_path),
        target=args.target,
        output_dir=Path(args.output),
        rolling_window=args.rolling_window,
        horizons=horizons,
        refresh=args.refresh,
        db_url=args.db_url,
        api_url=args.api_url,
        api_token=args.api_token,
        company_id=args.company_id,
        model_name=args.model_name,
        model_version=args.model_version,
        model_status=args.model_status,
        save_db=args.save_db,
        deprecate_previous=args.deprecate_previous,
        artifact_uri=args.artifact_uri,
    )


def add_date_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["day_of_week"] = df["report_date"].dt.dayofweek
    df["day_of_month"] = df["report_date"].dt.day
    df["month"] = df["report_date"].dt.month
    df["week_of_year"] = df["report_date"].dt.isocalendar().week.astype(int)
    return df


def add_rolling_features(
    df: pd.DataFrame,
    feature_columns: list,
    target: str,
    lags: tuple = (1, 7, 30),
    windows: tuple = (7, 30, 60),
) -> pd.DataFrame:
    df = df.copy()
    numeric_columns = [
        column
        for column in feature_columns
        if pd.api.types.is_numeric_dtype(df[column])
    ]
    if target in df.columns and target not in numeric_columns:
        numeric_columns.append(target)
    for column in numeric_columns:
        for lag in lags:
            df[f"{column}_lag_{lag}"] = df[column].shift(lag)
        for window in windows:
            df[f"{column}_roll_{window}"] = (
                df[column].shift(1).rolling(window, min_periods=1).mean()
            )
    return df


def prepare_data(df: pd.DataFrame, target: str) -> tuple:
    df = df.sort_values("report_date").reset_index(drop=True)
    df_base = add_date_features(df)

    base_feature_columns = [
        column
        for column in df_base.columns
        if column not in {"report_date", target}
    ]
    df_features = add_rolling_features(df_base, base_feature_columns, target)
    feature_columns = [
        column
        for column in df_features.columns
        if column not in {"report_date", target}
    ]

    X = df_features[feature_columns].fillna(0)
    y = df_features[target]

    split_index = max(int(len(df_features) * 0.75), 1)
    X_train, X_test = X.iloc[:split_index], X.iloc[split_index:]
    y_train, y_test = y.iloc[:split_index], y.iloc[split_index:]

    return X_train, X_test, y_train, y_test, feature_columns, df_base


def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> RandomForestRegressor:
    model = RandomForestRegressor(
        n_estimators=400,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def evaluate_model(y_true: pd.Series, y_pred: np.ndarray) -> dict:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = mean_squared_error(y_true, y_pred, squared=False)
    mape = np.mean(np.abs((y_true - y_pred) / np.clip(y_true, 1e-6, None))) * 100
    return {
        "mae": round(float(mae), 4),
        "rmse": round(float(rmse), 4),
        "mape": round(float(mape), 2),
    }


def build_future_frame(
    df: pd.DataFrame,
    feature_columns: list,
    target: str,
    rolling_window: int,
    horizon_days: int,
) -> pd.DataFrame:
    last_date = df["report_date"].max()
    future_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=horizon_days)

    numeric_columns = [
        column
        for column in df.columns
        if column not in {"report_date", target}
        and pd.api.types.is_numeric_dtype(df[column])
    ]

    rolling_means = df[numeric_columns].tail(rolling_window).mean()

    future_df = pd.DataFrame({"report_date": future_dates})
    for column in numeric_columns:
        future_df[column] = rolling_means[column]

    combined = pd.concat([df.copy(), future_df], ignore_index=True, sort=False)
    combined = add_date_features(combined)
    base_feature_columns = [
        column
        for column in combined.columns
        if column not in {"report_date", target}
    ]
    combined = add_rolling_features(combined, base_feature_columns, target)
    combined_features = combined[feature_columns].fillna(0)
    return combined_features.tail(horizon_days)


def save_results_to_db(config: ForecastConfig, metrics: dict, forecast: dict) -> None:
    if not config.db_url:
        raise ValueError("db_url is required to save results to DB.")
    if not config.company_id:
        raise ValueError("company_id is required to save results to DB.")

    now = datetime.now(timezone.utc)
    model_id = str(uuid.uuid4())
    metrics_text = json.dumps(metrics)
    artifact_uri = config.artifact_uri or str(config.output_dir.resolve())

    with psycopg2.connect(config.db_url) as connection:
        with connection.cursor() as cursor:
            if config.deprecate_previous:
                cursor.execute(
                    """
                    UPDATE ml_models
                    SET status = 'DEPRECATED', updated_at = %s
                    WHERE company_id = %s AND name = %s AND status = 'ACTIVE'
                    """,
                    (now, config.company_id, config.model_name),
                )

            cursor.execute(
                """
                INSERT INTO ml_models (
                    id,
                    created_at,
                    updated_at,
                    artifact_uri,
                    metrics_json,
                    name,
                    status,
                    trained_at,
                    version,
                    company_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    model_id,
                    now,
                    now,
                    artifact_uri,
                    metrics_text,
                    config.model_name,
                    config.model_status,
                    now,
                    config.model_version,
                    config.company_id,
                ),
            )

            prediction_rows = []
            prediction_date = None
            if forecast.get("daily_predictions"):
                prediction_date = forecast["daily_predictions"][0]["date"]

            for horizon in config.horizons:
                days = horizon * 30
                total = forecast["totals"].get(f"{horizon}_months")
                if total is None:
                    continue
                prediction_rows.append(
                    (
                        str(uuid.uuid4()),
                        now,
                        now,
                        days,
                        None,
                        total,
                        prediction_date,
                        None,
                        config.company_id,
                        model_id,
                    )
                )

            for item in forecast.get("daily_predictions", []):
                prediction_rows.append(
                    (
                        str(uuid.uuid4()),
                        now,
                        now,
                        1,
                        None,
                        item["value"],
                        item["date"],
                        None,
                        config.company_id,
                        model_id,
                    )
                )

            if prediction_rows:
                execute_batch(
                    cursor,
                    """
                    INSERT INTO ml_predictions (
                        id,
                        created_at,
                        updated_at,
                        horizon_days,
                        lower_bound,
                        predicted_revenue,
                        prediction_date,
                        upper_bound,
                        company_id,
                        model_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    prediction_rows,
                    page_size=500,
                )


def main() -> None:
    config = parse_args()
    config.output_dir.mkdir(parents=True, exist_ok=True)

    if config.refresh:
        if config.db_url:
            df_source = fetch_from_db(DbConfig(url=config.db_url))
        elif config.api_url:
            df_source = fetch_from_api(ApiConfig(url=config.api_url, token=config.api_token))
        else:
            raise ValueError(
                "Refresh requested but no --db-url or --api-url provided."
            )
        write_csv(df_source, config.csv_path)

    df = pd.read_csv(config.csv_path, parse_dates=["report_date"])

    if config.target not in df.columns:
        raise ValueError(f"Target column '{config.target}' not found in dataset.")

    X_train, X_test, y_train, y_test, feature_columns, df_full = prepare_data(
        df, config.target
    )

    model = train_model(X_train, y_train)

    if len(X_test) > 0:
        predictions = model.predict(X_test)
        metrics = evaluate_model(y_test, predictions)
    else:
        metrics = {"mae": None, "rmse": None, "mape": None}

    max_horizon_days = max(config.horizons) * 30
    future_features = build_future_frame(
        df_full,
        feature_columns,
        config.target,
        config.rolling_window,
        max_horizon_days,
    )
    future_predictions = model.predict(future_features)

    forecast = {
        "target": config.target,
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "totals": {},
        "daily_predictions": [],
    }

    for horizon in config.horizons:
        days = horizon * 30
        forecast["totals"][f"{horizon}_months"] = round(
            float(np.sum(future_predictions[:days])),
            2,
        )

    start_date = df_full["report_date"].max() + pd.Timedelta(days=1)
    for offset, value in enumerate(future_predictions):
        forecast["daily_predictions"].append(
            {
                "date": (start_date + pd.Timedelta(days=offset)).date().isoformat(),
                "value": round(float(value), 2),
            }
        )

    (config.output_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    (config.output_dir / "forecast.json").write_text(
        json.dumps(forecast, indent=2), encoding="utf-8"
    )

    if config.save_db:
        save_results_to_db(config, metrics, forecast)

    print("Metrics:")
    print(json.dumps(metrics, indent=2))
    print("\nForecast totals:")
    print(json.dumps(forecast["totals"], indent=2))


if __name__ == "__main__":
    main()
