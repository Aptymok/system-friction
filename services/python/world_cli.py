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
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())