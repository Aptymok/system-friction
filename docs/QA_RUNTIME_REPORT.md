# QA Runtime Report

Generated: 2026-06-14T18:32:45.310Z

| Route | URL | Classification | Notes | Detections |
| --- | --- | --- | --- | --- |
| /api/root/state | http://localhost:3000/api/root/state | BLOCKED | ok:false |  |
| /api/sfi/operational-state | http://localhost:3000/api/sfi/operational-state | OK | ok:true | fallback_local_active |
| /api/amv/state | http://localhost:3000/api/amv/state | OK | ok:true |  |
| /api/worldspect/state | http://localhost:3000/api/worldspect/state | OK | ok:true | latest_observation_null |
| /api/worldspect/vector | http://localhost:3000/api/worldspect/vector | OK | ok:true | latest_observation_null, latest_vectors_null |
| /api/sfi/events | http://localhost:3000/api/sfi/events | OK | ok:true | fallback_local_active |
| /api/scorefriction/state | http://localhost:3000/api/scorefriction/state | OK | ok:true | manual_test |