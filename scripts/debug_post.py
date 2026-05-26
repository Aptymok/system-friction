import urllib.request

with open('world_payload.json','rb') as f:
    b = f.read()

req = urllib.request.Request(
    'http://localhost:3001/api/worldspect/ingest-payload',
    data=b,
    headers={
        'Authorization': 'Bearer sf_ingest_prod_99f2b8a7c1e04',
        'Content-Type': 'application/json'
    }
)

try:
    with urllib.request.urlopen(req) as r:
        print('STATUS', r.status)
        print(r.read().decode())
except Exception as e:
    import traceback
    print('ERROR')
    traceback.print_exc()
