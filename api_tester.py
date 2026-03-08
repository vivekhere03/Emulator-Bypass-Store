import urllib.request
import json
import time
import hmac
import hashlib

# Replace with your actual Reseller API Key
API_KEY = "V3APIKEY"
BASE_URL = "https://bypass.cgxhub.in"

def make_request(method, path, body=None):
    ts = str(int(time.time()))
    body_str = json.dumps(body) if body else ""
    
    # Signature payload format: timestamp:METHOD:path:body
    sig_payload = f"{ts}:{method.upper()}:{path}:{body_str}"
    sig = hmac.new(API_KEY.encode(), sig_payload.encode(), hashlib.sha256).hexdigest()
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "X-Api-Timestamp": ts,
        "X-Api-Signature": sig,
        "User-Agent": "Mozilla/5.0", # REQUIRED to bypass Cloudflare WAF
    }
    
    if body:
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body_str.encode() if body else None,
        headers=headers,
        method=method.upper()
    )
    
    print(f"\n--- [{method.upper()}] {path} ---")
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode()
            try:
                print(json.dumps(json.loads(data), indent=2))
            except:
                print(data)
    except Exception as e:
        error_msg = e.read().decode() if hasattr(e, 'read') else str(e)
        try:
            print("ERROR", json.dumps(json.loads(error_msg), indent=2))
        except:
            print("ERROR", error_msg)

if __name__ == "__main__":
    print("=== CGX Bypass API v3 Tester ===")
    
    # 1. Get API Key Info & Credits
    make_request("GET", "/api/v3/key/info")
    
    # 2. Add single user (Costs 1 credit)
    test_username = f"py_tester_{int(time.time())}"
    make_request("POST", "/api/v3/users/add", {
        "username": test_username,
        "hwid": "my_hwid_123", # Optional
        "duration_days": 10
    })
    
    # 3. Extend user (Costs 1 credit)
    make_request("POST", "/api/v3/users/extend", {
        "username": test_username,
        "duration_days": 5
    })
    
    # 4. Reset HWID (Free)
    # We can pass an empty string ("") to "new_hwid" so the server auto-binds on the user's next login
    make_request("POST", "/api/v3/users/reset-hwid", {
        "username": test_username,
        "new_hwid": "" # Leave blank to allow auto-bind
    })
    
    # 5. List users
    make_request("GET", "/api/v3/users/list")
    
    # 6. Bulk Add users (Costs 1 credit per user created)
    prefix = f"py_bulk_{int(time.time())}"
    make_request("POST", "/api/v3/users/bulk-add", {
        "prefix": prefix,
        "count": 2,
        "duration_days": 7
    })
    
    # 7. Remove user (Free)
    make_request("POST", "/api/v3/users/remove", {
        "username": test_username
    })
