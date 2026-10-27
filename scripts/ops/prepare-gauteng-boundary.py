"""Extract the unmodified Gauteng feature from the pinned, licensed OCHA/MDB archive.

Usage: python prepare-gauteng-boundary.py path/to/zaf_admin_boundaries.geojson.zip
Requires shapely==2.1.2 (validation only, never repairs/simplifies the source).
"""
import hashlib
import json
from pathlib import Path
import sys
import zipfile
from shapely.geometry import shape
from shapely.validation import explain_validity

ARCHIVE_SHA256 = "bc5670db834f1a517fd11da10fcb25214b5f0a827853fe43ef648caa40bd54d4"
root = Path(__file__).resolve().parents[2]
archive = Path(sys.argv[1])
assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_SHA256, "Unexpected source archive"
with zipfile.ZipFile(archive) as z:
    raw = z.read("zaf_admin1.geojson")
source = json.loads(raw)
assert source["crs"]["properties"]["name"] == "urn:ogc:def:crs:OGC:1.3:CRS84"
features = [f for f in source["features"] if f["properties"].get("adm1_pcode") == "ZA7"]
assert len(features) == 1 and features[0]["properties"]["adm1_name"] == "Gauteng"
feature = features[0]
geometry = feature["geometry"]
polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
rings = [ring for polygon in polygons for ring in polygon]
assert all(len(r) >= 4 and r[0] == r[-1] for r in rings)
assert all(len(p) == 2 and 26 < p[0] < 30 and -28 < p[1] < -24 for r in rings for p in r)
polygon = shape(geometry)
assert polygon.is_valid and not polygon.is_empty, explain_validity(polygon)
out = root / "data/service-zones/gauteng"
out.mkdir(parents=True, exist_ok=True)
# RFC 7946 implies CRS84; remove only the legacy top-level CRS member.
# Preserve every coordinate and source feature property. No rounding or repair.
payload = (json.dumps({"type": "FeatureCollection", "features": [feature]}, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
(out / "gauteng.geojson").write_bytes(payload)
manifest = {
    "schemaVersion": 1,
    "datasetTitle": "South Africa - Subnational Administrative Boundaries (COD-AB), version 01",
    "source": "South African Municipal Demarcation Board; distributed by UN OCHA ROSEA / FISS / HDX",
    "datasetUrl": "https://data.humdata.org/dataset/cod-ab-zaf",
    "metadataUrl": "https://data.humdata.org/api/3/action/package_show?id=cod-ab-zaf",
    "resourceUrl": "https://data.humdata.org/dataset/061d4492-56e8-458c-a3fb-e7950991adf0/resource/37175ff4-41a3-4753-a2c3-ced24142a96c/download/zaf_admin_boundaries.geojson.zip",
    "license": "CC BY 3.0 IGO",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/igo/",
    "sourceCreated": "2018-12-27",
    "sourceValidOn": "2020-11-09",
    "hdxReviewedOn": "2025-01-28",
    "resourceLastModified": "2026-01-26",
    "retrievedOn": "2026-10-19",
    "archiveSha256": ARCHIVE_SHA256,
    "admin1Sha256": hashlib.sha256(raw).hexdigest(),
    "geojsonSha256": hashlib.sha256(payload).hexdigest(),
    "featureCode": "ZA7",
    "crs": "OGC:CRS84 (WGS84 longitude, latitude)",
    "geometryType": geometry["type"],
    "polygonCount": len(polygons),
    "ringCount": len(rings),
    "vertexCount": sum(map(len, rings)),
    "bounds": list(polygon.bounds),
    "topology": {"validator": "Shapely 2.1.2 / GEOS", "valid": True, "reason": explain_validity(polygon)},
    "transformations": "Selected ZA7 feature; removed legacy collection CRS member; compact JSON serialization only. All coordinates and feature properties unchanged.",
    "geographyApproval": "Founder requested Gauteng Province in this implementation session, 2026-10-19.",
    "reviewStatus": "Source provenance and automated topology validated; independent GIS/current-boundary and production release review outstanding.",
    "activation": "inactive; approved_by and approved_at must remain NULL until an identified authorised reviewer activates separately",
    "workerAvailability": "Not represented. Roster, service skills, date, capacity and assignment require separate verification.",
}
(out / "provenance.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: manifest[k] for k in ["geojsonSha256", "vertexCount", "bounds", "topology"]}, indent=2))
