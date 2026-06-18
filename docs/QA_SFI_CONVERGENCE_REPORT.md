# QA SFI Convergence Report

Generated: 2026-06-14T18:53:06.889Z

| Route | URL | Classification | Notes | Detections |
| --- | --- | --- | --- | --- |
| /api/root/state | http://localhost:3000/api/root/state | BLOCKED | ok:false | auth_required |
| /api/sfi/operational-state | http://localhost:3000/api/sfi/operational-state | BLOCKED | timeout | network_timeout |
| /api/graph/state?profile=sfi | http://localhost:3000/api/graph/state?profile=sfi | BLOCKED | timeout | network_timeout |
| /api/worldspect/state | http://localhost:3000/api/worldspect/state | BLOCKED | timeout | network_timeout |
| /api/scorefriction/state | http://localhost:3000/api/scorefriction/state | BLOCKED | timeout | network_timeout |