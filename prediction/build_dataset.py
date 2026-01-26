import argparse
import json
import os
from pathlib import Path

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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build daily_report.csv from DB or API.")
    parser.add_argument("--csv", default="data/daily_report.csv", help="Path to output CSV")
    parser.add_argument("--config", default="config.json", help="Path to JSON config file")
    parser.add_argument("--db-url", default=None)
    parser.add_argument("--api-url", default=None)
    parser.add_argument("--api-token", default=None)
    args = parser.parse_args()

    config = load_config(args.config) if settings.env == "local" else {}
    env_db_url = os.getenv("PREDICTION_DB_URL") or get_database_url(settings)
    env_api_url = os.getenv("PREDICTION_API_URL")
    env_api_token = os.getenv("PREDICTION_API_TOKEN")

    if args.csv == "data/daily_report.csv" and config.get("csv_path"):
        args.csv = config["csv_path"]
    args.db_url = args.db_url or env_db_url or config.get("db_url")
    args.api_url = args.api_url or env_api_url or config.get("api_url")
    args.api_token = args.api_token or env_api_token or config.get("api_token")
    return args


def main() -> None:
    args = parse_args()
    csv_path = Path(args.csv)

    if args.db_url:
        df = fetch_from_db(DbConfig(url=args.db_url))
    elif args.api_url:
        df = fetch_from_api(ApiConfig(url=args.api_url, token=args.api_token))
    else:
        raise ValueError("Provide --db-url or --api-url (or set PREDICTION_DB_URL/PREDICTION_API_URL).")

    write_csv(df, csv_path)
    print(f"Saved {len(df)} rows to {csv_path}")


if __name__ == "__main__":
    main()
