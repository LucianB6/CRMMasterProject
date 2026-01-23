import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from data_sources import ApiConfig, DbConfig, fetch_from_api, fetch_from_db, write_csv


@dataclass
class ForecastConfig:
    csv_path: Path
    target: str
    output_dir: Path
    rolling_window: int
    horizons: tuple
    refresh: bool
    db_url: str | None
    api_url: str | None
    api_token: str | None


def parse_args() -> ForecastConfig:
    parser = argparse.ArgumentParser(description="Train and forecast sales totals.")
    parser.add_argument("--csv", dest="csv_path", required=True, help="Path to daily_report.csv")
    parser.add_argument(
        "--target",
        default="new_cash_collected",
        help="Target column to forecast (default: new_cash_collected)",
    )
    parser.add_argument("--output", default="outputs", help="Output directory for forecasts")
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
    args = parser.parse_args()

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
    )


def add_date_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["day_of_week"] = df["report_date"].dt.dayofweek
    df["day_of_month"] = df["report_date"].dt.day
    df["month"] = df["report_date"].dt.month
    df["week_of_year"] = df["report_date"].dt.isocalendar().week.astype(int)
    return df


def prepare_data(df: pd.DataFrame, target: str) -> tuple:
    df = df.sort_values("report_date").reset_index(drop=True)
    df = add_date_features(df)

    feature_columns = [
        column
        for column in df.columns
        if column not in {"report_date", target}
    ]

    X = df[feature_columns]
    y = df[target]

    split_index = max(int(len(df) * 0.8), 1)
    X_train, X_test = X.iloc[:split_index], X.iloc[split_index:]
    y_train, y_test = y.iloc[:split_index], y.iloc[split_index:]

    return X_train, X_test, y_train, y_test, feature_columns, df


def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> RandomForestRegressor:
    model = RandomForestRegressor(
        n_estimators=300,
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

    future_df = add_date_features(future_df)
    return future_df[feature_columns]


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

    print("Metrics:")
    print(json.dumps(metrics, indent=2))
    print("\nForecast totals:")
    print(json.dumps(forecast["totals"], indent=2))


if __name__ == "__main__":
    main()
