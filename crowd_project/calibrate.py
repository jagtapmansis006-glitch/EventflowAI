import numpy as np
import cv2
import json

with open("venue_map.json", "r") as f:
    venue = json.load(f)

for gate in venue["gates"]:
    src_points = np.array(gate["reference_points"]["pixel_coords"], dtype=np.float32)
    dst_points = np.array(gate["reference_points"]["real_world_coords_meters"], dtype=np.float32)

    H, _ = cv2.findHomography(src_points, dst_points)
    filename = f"homography_{gate['gate_id']}.npy"
    np.save(filename, H)
    print(f"Saved {filename} for {gate['gate_id']}")