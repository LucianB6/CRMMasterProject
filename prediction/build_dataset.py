import argparse
import os
from pathlib import Path

from data_sources import ApiConfig, DbConfig, fetch_from_api, fetch_from_db, write_csv


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build daily_report.csv from DB or API.")
    parser.add_argument("--csv", default="data/daily_report.csv", help="Path to output CSV")
    parser.add_argument("--db-url", default=os.getenv("PREDICTION_DB_URL"))
    parser.add_argument("--api-url", default=os.getenv("PREDICTION_API_URL"))
    parser.add_argument("--api-token", default=os.getenv("PREDICTION_API_TOKEN"))
    return parser.parse_args()


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
