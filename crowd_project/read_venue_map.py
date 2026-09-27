from google import genai
import json
import time

client = genai.Client(api_key="AQ.Ab8RN6K1njuN2yffp5IRiEolbQTW6mmQXTsO8HPCdAj5MYcPeA")

with open("venue_map_uploaded.png", "rb") as f:
    image_data = f.read()

prompt = """
You are reading an event venue map image. Extract ONLY the following 4 categories of information as strict JSON. No explanation text, no markdown formatting, just raw JSON.

1. GATES: every gate shown, its type (entry, exit, or entry-exit), which camera covers it, and its labeled distance to the main stage/central area if shown.
2. CAMERAS: every camera shown, its location/placement label, and what area it covers (read this directly from any Cameras and Coverage legend if present).
3. ZONES/AREAS: every named zone or area on the map with its size in sq. m (read from any Key Areas and Sizes legend if present).
4. DISTANCES: every distance value labeled on the map, capturing which two points it connects (read from arrows/labels and any Distance Summary legend if present).

Also extract venue_name, total_capacity, and venue_area_sqm if shown.

Return JSON in exactly this structure:

{
  "venue_name": "string",
  "total_capacity": number,
  "venue_area_sqm": number,
  "gates": [
    {"gate_id": "string", "gate_type": "entry / exit / entry-exit", "camera_id": "string", "distance_to_main_stage_meters": number}
  ],
  "cameras": [
    {"camera_id": "string", "location": "string", "coverage_area": "string"}
  ],
  "zones": [
    {"zone_name": "string", "area_sqm": number}
  ],
  "distances": [
    {"from": "string", "to": "string", "distance_meters": number}
  ]
}

If a value isn't clearly visible, make a reasonable estimate based on what's shown rather than leaving it blank.
"""

max_retries = 5
response = None

for attempt in range(max_retries):
    try:
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=[
                prompt,
                {"inline_data": {"mime_type": "image/png", "data": image_data}}
            ]
        )
        break
    except Exception as e:
        print("Attempt " + str(attempt + 1) + " failed: " + str(e))
        time.sleep(5)

if response is None:
    raise Exception("Failed after multiple retries. Gemini API may be down. Try again in a few minutes.")

clean_text = response.text.strip().replace("```json", "").replace("```", "")
venue_data = json.loads(clean_text)

with open("venue_map.json", "w") as f:
    json.dump(venue_data, f, indent=2)

print("Extracted venue_map.json:")
print(json.dumps(venue_data, indent=2))
