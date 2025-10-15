#!/usr/bin/env python3
"""
Test script for participants import workflow.

This script tests the participants data import functionality.
"""

import asyncio
import httpx
import json
import time


async def test_participants_import():
    """Test the participants import workflow."""

    base_url = "http://localhost:8000"

    print("🧪 Testing Participants Import Workflow")
    print("=" * 50)

    try:
        # Step 1: Check API Gateway health
        print("1. Checking API Gateway health...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/health")
            if response.status_code == 200:
                print("✅ API Gateway is healthy")
            else:
                print(f"❌ API Gateway health check failed: {response.status_code}")
                return

        # Step 2: Check services health
        print("\n2. Checking all services health...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/health/services")
            if response.status_code == 200:
                services = response.json()["services"]
                all_healthy = True
                for service, status in services.items():
                    if status["status"] == "healthy":
                        print(f"✅ {service}: {status['status']}")
                    else:
                        print(f"❌ {service}: {status['status']} - {status.get('error', '')}")
                        all_healthy = False

                if not all_healthy:
                    print("⚠️  Some services are not healthy, but continuing with test...")
            else:
                print(f"❌ Services health check failed: {response.status_code}")
                return

        # Step 3: Check available workflows
        print("\n3. Checking available workflows...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/workflows")
            if response.status_code == 200:
                workflows = response.json()
                workflow_names = [w["name"] for w in workflows]
                print(f"✅ Available workflows: {', '.join(workflow_names)}")

                if "Participants Data Import" not in workflow_names:
                    print("❌ Participants import workflow not found")
                    return
            else:
                print(f"❌ Failed to get workflows: {response.status_code}")
                return

        # Step 4: Start participants import workflow
        print("\n4. Starting participants import workflow...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{base_url}/api/workflows/start-participants-import")
            if response.status_code == 200:
                result = response.json()
                workflow_id = result["workflow_id"]
                print(f"✅ Participants import workflow started: {workflow_id}")

                # Wait a bit for workflow to start
                time.sleep(2)

                # Step 5: Check workflow status
                print("\n5. Checking workflow execution status...")
                response = await client.get(f"{base_url}/api/import/participants/status")
                if response.status_code == 200:
                    status = response.json()
                    print(f"✅ Workflow status: {status.get('status', 'unknown')}")
                    if status.get("status") in ["running", "completed"]:
                        print("✅ Participants import workflow is running/completed")
                    else:
                        print(f"⚠️  Workflow status: {status.get('status')}")
                else:
                    print(f"❌ Failed to get workflow status: {response.status_code}")

            else:
                print(f"❌ Failed to start participants import: {response.status_code}")
                print(f"   Error: {response.text}")

        print("\n🎉 Participants import workflow test completed!")

    except Exception as e:
        print(f"❌ Test failed with error: {e}")


if __name__ == "__main__":
    asyncio.run(test_participants_import())
