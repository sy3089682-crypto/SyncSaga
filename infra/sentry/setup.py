"""
Sentry Monitoring Setup

Usage:
    SENTRY_DSN=https://key@oXXX.ingest.sentry.io/project

Set SENTRY_DSN environment variable to enable.
"""

import os


def setup_sentry():
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.redis import RedisIntegration

        sentry_sdk.init(
            dsn=dsn,
            integrations=[
                FastApiIntegration(),
                RedisIntegration(),
            ],
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            environment=os.environ.get("ENVIRONMENT", "production"),
            release="syncsaga-v2@2.0.0",
        )
        print("Sentry initialized")
    except ImportError:
        print("sentry_sdk not installed, skipping")
