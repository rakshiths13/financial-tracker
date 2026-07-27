import requests
import json
import time

API_BASE = "http://127.0.0.1:8000/api/v1"
EMAIL = f"e2e_{int(time.time())}@example.com"
PASSWORD = "password123"

def run_tests():
    print("1. Testing Signup...")
    res = requests.post(f"{API_BASE}/signup", json={"email": EMAIL, "password": PASSWORD})
    assert res.status_code == 201, f"Signup failed: {res.text}"
    print("Signup OK")

    print("2. Testing Login...")
    res = requests.post(f"{API_BASE}/login", data={"username": EMAIL, "password": PASSWORD})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login OK")

    print("3. Testing Me...")
    res = requests.get(f"{API_BASE}/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == EMAIL
    print("Me OK")

    print("4. Testing Wishlist CRUD...")
    # Add
    res = requests.post(f"{API_BASE}/wishlist", json={"item_name": "New Laptop", "estimated_cost": 150000}, headers=headers)
    assert res.status_code == 201
    plan_id = res.json()["id"]

    # Read
    res = requests.get(f"{API_BASE}/wishlist", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Delete
    res = requests.delete(f"{API_BASE}/wishlist/{plan_id}", headers=headers)
    assert res.status_code == 204

    # Read again
    res = requests.get(f"{API_BASE}/wishlist", headers=headers)
    assert len(res.json()) == 0
    print("Wishlist CRUD OK")

    print("5. Testing Analytics...")
    # Since we have no data, should be empty/default
    res = requests.get(f"{API_BASE}/analytics/spending-by-category", headers=headers)
    assert res.status_code == 200

    res = requests.get(f"{API_BASE}/analytics/savings-calculator?target_amount=300000&months_to_save=3", headers=headers)
    assert res.status_code == 200
    print("Analytics OK")

    print("6. Testing Exports...")
    res = requests.get(f"{API_BASE}/export/csv", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["Content-Type"]

    res = requests.get(f"{API_BASE}/export/xlsx", headers=headers)
    assert res.status_code == 200
    print("Exports OK")

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
