#!/usr/bin/env python3
"""
Seeds the CloudNet database with realistic Indian weather events, official synoptic telemetry,
and administrative user accounts.
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from app.main import init_database_and_seed
from app.database.session import AsyncSessionLocal
from app.ingestion.social_adapter import SocialMediaAdapter
from app.ingestion.gov_adapter import GovernmentDataAdapter
from app.workers.stream_processor import global_stream_processor


async def main():
    print("[CloudNet Seed] Initializing database tables and admin...")
    await init_database_and_seed()

    async with AsyncSessionLocal() as session:
        # Ingest IMD Official bulletin
        gov_adapter = GovernmentDataAdapter()
        gov_events = await gov_adapter.fetch_or_normalize()
        for g in gov_events:
            await global_stream_processor.process_normalized_event(g, session)

        # Ingest batch of social stream reports across Indian states
        social_adapter = SocialMediaAdapter()
        social_events = await social_adapter.fetch_or_normalize(count=20)
        for s in social_events:
            await global_stream_processor.process_normalized_event(s, session)

        await session.commit()
    print("[CloudNet Seed] Seed data populated successfully.")


if __name__ == "__main__":
    asyncio.run(main())
