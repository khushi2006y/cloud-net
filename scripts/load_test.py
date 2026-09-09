#!/usr/bin/env python3
"""
CloudNet Big Data Load Generator & Benchmark Script
Measures actual ingestion throughput, queue processing rate, and end-to-end latency.
"""
import sys
import os
import time
import asyncio
import argparse

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from app.database.session import AsyncSessionLocal
from app.main import init_database_and_seed
from app.ingestion.social_adapter import SocialMediaAdapter
from app.workers.stream_processor import global_stream_processor


async def run_load_test(event_count: int = 5000, batch_size: int = 100):
    print("=" * 70)
    print(f"🌩️ CLOUDNET HIGH-THROUGHPUT BIG DATA LOAD BENCHMARK")
    print(f"Target Batch: {event_count:,} events (chunks of {batch_size})")
    print("=" * 70)

    adapter = SocialMediaAdapter()
    start_time = time.time()
    total_processed = 0
    duplicate_count = 0
    verified_count = 0
    flagged_count = 0
    provisional_count = 0

    batches_count = (event_count + batch_size - 1) // batch_size

    for b_idx in range(batches_count):
        current_chunk = min(batch_size, event_count - total_processed)
        raw_events = await adapter.fetch_or_normalize(count=current_chunk)

        async with AsyncSessionLocal() as session:
            for item in raw_events:
                evt = await global_stream_processor.process_normalized_event(item, session)
                total_processed += 1
                st = evt.verification_status
                if st == "DUPLICATE":
                    duplicate_count += 1
                elif st in ["VERIFIED", "CORROBORATED"]:
                    verified_count += 1
                elif st in ["FLAGGED", "CONTRADICTED"]:
                    flagged_count += 1
                else:
                    provisional_count += 1

            await session.commit()

        elapsed = time.time() - start_time
        curr_rate = total_processed / max(0.001, elapsed)
        sys.stdout.write(f"\rProgress: [{total_processed:,}/{event_count:,}] ({total_processed/event_count*100:.1f}%) | Throughput: {curr_rate:.1f} events/sec")
        sys.stdout.flush()

    total_time = time.time() - start_time
    avg_rate = total_processed / max(0.001, total_time)
    avg_latency = (total_time / total_processed) * 1000.0

    print("\n\n" + "=" * 70)
    print("MEASURED PERFORMANCE RESULTS (REAL BENCHMARK):")
    print("=" * 70)
    print(f"Total Ingested Events:     {total_processed:,}")
    print(f"Total Wall-Clock Time:     {total_time:.2f} seconds")
    print(f"Measured Ingestion Rate:   {avg_rate:.1f} events/sec")
    print(f"Average Pipeline Latency:  {avg_latency:.2f} ms per event")
    print("-" * 70)
    print(f"Deduplicated Clusters:     {duplicate_count:,} ({duplicate_count/total_processed*100:.1f}%)")
    print(f"Auto-Verified Events:      {verified_count:,} ({verified_count/total_processed*100:.1f}%)")
    print(f"Flagged Hoaxes / Spam:     {flagged_count:,} ({flagged_count/total_processed*100:.1f}%)")
    print(f"Provisional Queue:         {provisional_count:,} ({provisional_count/total_processed*100:.1f}%)")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CloudNet Big Data Load Tester")
    parser.add_argument("--count", type=int, default=500, help="Number of events to generate (default: 500)")
    args = parser.parse_args()

    asyncio.run(run_load_test(event_count=args.count))
