#!/usr/bin/env python3
import asyncio
import json
import sys
from world_spectrum import get_world_spectrum

async def main():
    try:
        result = await get_world_spectrum()
        print(json.dumps(result))
    except Exception as e:
        payload = {"ok": False, "error": str(e), "stage": "world_spectrum_cli"}
        print(json.dumps(payload))
        print(f"WORLD_SPECTRUM_CLI_FAILED: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
