from datetime import datetime, timezone
import requests


def build_telemetry(event_id, camera_id, zone_id, people_count, inflow, outflow, occupancy_percent):
    inflow = max(0, int(inflow))
    outflow = max(0, int(outflow))
    net_flow = inflow - outflow

    return {
        "eventId": event_id,
        "cameraId": camera_id,
        "zoneId": zone_id,
        "peopleCount": int(people_count),
        "inflow": inflow,
        "outflow": outflow,
        "netFlow": net_flow,
        "occupancyPercent": round(min(100, max(0, occupancy_percent)), 2),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def send_telemetry(payload, backend_url, api_key):
    try:
        response = requests.post(
            backend_url,
            json=payload,
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            timeout=3
        )
        if response.status_code == 201:
            data = response.json()
            print(f"[SENT OK] telemetryId={data.get('telemetryId')} netFlow={data.get('netFlow')}")
        else:
            print(f"[SEND FAILED] status={response.status_code} body={response.text}")
    except requests.exceptions.RequestException as e:
        print(f"[SEND ERROR] Could not reach backend: {e}")