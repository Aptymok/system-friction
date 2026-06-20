# QA Runtime Report

Generated: 2026-06-20T04:59:46.423Z

| Route | URL | Classification | Notes | Detections |
| --- | --- | --- | --- | --- |
| /api/root/state | http://127.0.0.1:3000/api/root/state | BLOCKED | ok:false |  |
| /api/sfi/operational-state | http://127.0.0.1:3000/api/sfi/operational-state | OK | ok:true |  |
| /api/amv/state | http://127.0.0.1:3000/api/amv/state | OK | ok:true |  |
| /api/worldspect/state | http://127.0.0.1:3000/api/worldspect/state | OK | ok:true | latest_observation_null |
| /api/worldspect/vector | http://127.0.0.1:3000/api/worldspect/vector | OK | ok:true | latest_observation_null, latest_vectors_null |
| /api/sfi/events | http://127.0.0.1:3000/api/sfi/events | OK | ok:true | fallback_local_active, evidence_count_zero, sandbox, manual_test |
| /api/scorefriction/state | http://127.0.0.1:3000/api/scorefriction/state | OK | ok:true | manual_test |