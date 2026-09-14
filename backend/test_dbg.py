import httpx

c = httpx.Client(base_url="http://127.0.0.1:8000/api/v1", timeout=60.0)
r = c.post("/auth/register", json={"email": "test_ass_2@test.com", "password": "Password123!", "name": "Test", "education_tier": "Class 10"})
tok = r.json().get("access_token")
if not tok:
    l = c.post("/auth/login", json={"email": "test_ass_2@test.com", "password": "Password123!"})
    tok = l.json()["access_token"]

h = {"Authorization": "Bearer " + tok}
s = c.post("/assessments/start", headers=h, json={"mode": "field_of_study", "difficulty_mode": "adaptive", "num_questions": 2})
print("start status:", s.status_code)
ass = s.json()
ass_id = ass["assessment_id"]
q1 = ass["current_question"]
print("q1 type:", q1["question_type"])
ans = c.post(f"/assessments/{ass_id}/answer", headers=h, json={"item_id": q1["id"], "selected_index": 0, "text_response": "Science is a systematic study", "response_time_ms": 3000})
print("ans status:", ans.status_code)
print("ans text:", ans.text[:300])
