#!/usr/bin/env python3
import sys
import json
from montecarlo import run_montecarlo_for_vector

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Se requiere un argumento JSON con el vector MIHM"}))
        sys.exit(1)
    try:
        mihm_vec = json.loads(sys.argv[1])
        result = run_montecarlo_for_vector(mihm_vec)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)