import requests
import sys

# Test credentials
url_login = "http://127.0.0.1:8000/api/login/"
url_chat = "http://127.0.0.1:8000/api/chat/send/"

payload_login = {
    "username": "Sujith",
    "password": "Password123@"
}

print("1. Logging in to get token...")
try:
    r_login = requests.post(url_login, json=payload_login)
    print("Login Response Code:", r_login.status_code)
    if r_login.status_code != 200:
        print("Login Failed:", r_login.text)
        sys.exit(1)
        
    data = r_login.json()
    print("Login Response JSON:", data)
    token = data.get("access")
    print("Fetched Token:", token)
except Exception as e:
    print("Login request error:", str(e))
    sys.exit(1)

print("\n2. Sending chat message...")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
payload_chat = {
    "content": "hi"
}

try:
    r_chat = requests.post(url_chat, json=payload_chat, headers=headers)
    print("Chat Response Code:", r_chat.status_code)
    print("Chat Response Body:", r_chat.text)
except Exception as e:
    print("Chat request error:", str(e))
