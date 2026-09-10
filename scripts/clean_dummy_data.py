import sqlite3
import os

def clean_database(db_path: str):
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}, skipping.")
        return

    print(f"Cleaning dummy data from {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check current count
        cursor.execute("SELECT count(*) FROM weather_events")
        total_before = cursor.fetchone()[0]

        # Delete all simulated/fake/duplicate events from social stream sim, big data batch, etc.
        cursor.execute("""
            DELETE FROM evidence 
            WHERE event_id IN (
                SELECT id FROM weather_events 
                WHERE source_id = 'src-social-stream-sim'
                   OR source_name LIKE 'User_%'
                   OR source_name LIKE 'SpamBot_%'
                   OR source_name LIKE 'TrollAccount_%'
                   OR id LIKE 'evt-bigdata-%'
                   OR title LIKE 'Social report:%'
                   OR title LIKE 'Special Promo:%'
                   OR verification_status = 'DUPLICATE'
            )
        """)

        cursor.execute("""
            DELETE FROM verification_logs 
            WHERE event_id IN (
                SELECT id FROM weather_events 
                WHERE source_id = 'src-social-stream-sim'
                   OR source_name LIKE 'User_%'
                   OR source_name LIKE 'SpamBot_%'
                   OR source_name LIKE 'TrollAccount_%'
                   OR id LIKE 'evt-bigdata-%'
                   OR title LIKE 'Social report:%'
                   OR title LIKE 'Special Promo:%'
                   OR verification_status = 'DUPLICATE'
            )
        """)

        cursor.execute("""
            DELETE FROM alerts 
            WHERE event_id IN (
                SELECT id FROM weather_events 
                WHERE source_id = 'src-social-stream-sim'
                   OR source_name LIKE 'User_%'
                   OR source_name LIKE 'SpamBot_%'
                   OR source_name LIKE 'TrollAccount_%'
                   OR id LIKE 'evt-bigdata-%'
                   OR title LIKE 'Social report:%'
                   OR title LIKE 'Special Promo:%'
                   OR verification_status = 'DUPLICATE'
            )
        """)

        cursor.execute("""
            DELETE FROM weather_events 
            WHERE source_id = 'src-social-stream-sim'
               OR source_name LIKE 'User_%'
               OR source_name LIKE 'SpamBot_%'
               OR source_name LIKE 'TrollAccount_%'
               OR id LIKE 'evt-bigdata-%'
               OR title LIKE 'Social report:%'
               OR title LIKE 'Special Promo:%'
               OR verification_status = 'DUPLICATE'
        """)

        conn.commit()

        cursor.execute("SELECT count(*) FROM weather_events")
        total_after = cursor.fetchone()[0]
        print(f"Done cleaning {db_path}: {total_before} -> {total_after} events remaining (purged {total_before - total_after} dummy rows).")

    except Exception as e:
        print(f"Error while cleaning {db_path}: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    clean_database("cloudnet.db")
    clean_database("backend/cloudnet.db")
