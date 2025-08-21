#!/usr/bin/env python3
"""
Test health check endpoints for all services.

Usage:
    # Test all services
    python3 scripts/test-health-checks.py
    
    # Test specific service
    python3 scripts/test-health-checks.py --service device-service
"""

import argparse
import asyncio
import json
import os
import sys
from typing import Dict, List, Optional

import aiohttp
import yaml

# Default service ports
SERVICE_PORTS = {
    "auth-service": 8001,
    "device-service": 8002,
    "command-service": 8003,
    "analytics-service": 8004,
    "notification-service": 8005,
    "data-ingest-service": 8006,
    "ws-hub": 8007,
    "sample-consumer": 8000,
}

# Default host (can be overridden with --host)
DEFAULT_HOST = "localhost"


async def test_health_endpoint(session: aiohttp.ClientSession, service: str, port: int) -> Dict:
    """Test the health check endpoint for a service."""
    url = f"http://{DEFAULT_HOST}:{port}/healthz"
    try:
        async with session.get(url, timeout=5.0) as response:
            data = await response.json()
            return {
                "service": service,
                "status": "success" if response.status == 200 else "error",
                "http_status": response.status,
                "data": data,
            }
    except Exception as e:
        return {
            "service": service,
            "status": "error",
            "error": str(e),
        }


async def test_all_services(services: List[str]) -> List[Dict]:
    """Test health check endpoints for all specified services."""
    async with aiohttp.ClientSession() as session:
        tasks = [
            test_health_endpoint(session, service, port)
            for service, port in SERVICE_PORTS.items()
            if service in services or "all" in services
        ]
        return await asyncio.gather(*tasks)


def print_results(results: List[Dict]):
    """Print test results in a formatted table."""
    print("\n" + "=" * 80)
    print(f"{'SERVICE':<20} | {'STATUS':<10} | HTTP | DETAILS")
    print("-" * 80)
    
    for result in results:
        service = result["service"]
        status = result["status"].upper()
        http_status = result.get("http_status", "N/A")
        
        # Get details
        details = ""
        if "error" in result:
            details = f"Error: {result['error']}"
        else:
            data = result.get("data", {})
            checks = data.get("checks", {})
            
            # Format check results
            check_details = []
            for check_name, check_result in checks.items():
                check_status = check_result.get("status", "unknown").upper()
                message = check_result.get("message", "No details")
                check_details.append(f"{check_name}: {check_status} ({message})")
            
            details = "; ".join(check_details) or "No check details"
        
        # Color coding
        if status == "SUCCESS":
            status = f"\033[92m{status}\033[0m"  # Green
        else:
            status = f"\033[91m{status}\033[0m"  # Red
        
        print(f"{service:<20} | {status:<10} | {http_status:<4} | {details}")
    
    print("=" * 80 + "\n")


def load_docker_compose_services() -> List[str]:
    """Load service names from docker-compose.yml."""
    try:
        compose_path = os.path.join(os.path.dirname(__file__), "..", "docker-compose.yml")
        with open(compose_path, "r") as f:
            compose = yaml.safe_load(f)
            return list(compose.get("services", {}).keys())
    except Exception as e:
        print(f"Warning: Could not load docker-compose.yml: {e}", file=sys.stderr)
        return []


def main():
    parser = argparse.ArgumentParser(description="Test health check endpoints for services.")
    parser.add_argument(
        "--service",
        action="append",
        default=[],
        help="Service(s) to test (default: all)",
    )
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"Host to test against (default: {DEFAULT_HOST})",
    )
    args = parser.parse_args()
    
    # Set global host
    global DEFAULT_HOST
    DEFAULT_HOST = args.host
    
    # Determine which services to test
    services_to_test = args.service or ["all"]
    if "all" in services_to_test:
        services_to_test = list(SERVICE_PORTS.keys())
    
    print(f"Testing health checks for: {', '.join(services_to_test)}\n")
    
    # Run tests
    results = asyncio.run(test_all_services(services_to_test))
    
    # Print results
    print_results(results)
    
    # Exit with error if any service failed
    if any(result["status"] != "success" for result in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
