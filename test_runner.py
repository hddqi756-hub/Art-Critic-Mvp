import base64
import json
import os
import time
from pathlib import Path
from typing import Any

import requests


BASE_URL = os.getenv("BASE_URL", "http://localhost:4000")
REPORT_PATH = Path("logs/test_report.json")
JsonDict = dict[str, Any]


def png_data_url(kind):
    if kind == "mask":
        svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="black"/><circle cx="32" cy="32" r="18" fill="white"/></svg>'
    else:
        svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#f8fafc"/><path d="M14 48 C24 16 42 16 50 48" fill="none" stroke="#0f172a" stroke-width="5"/><circle cx="32" cy="28" r="9" fill="#f472b6"/></svg>'
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def success(test_name, **extra):
    return {
        "test_name": test_name,
        "status": "pass",
        "error": "",
        "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **extra,
    }


def fail(test_name, error, **extra):
    return {
        "test_name": test_name,
        "status": "fail",
        "error": str(error),
        "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **extra,
    }


def post_json(path, payload, timeout=90):
    return requests.post(f"{BASE_URL}{path}", json=payload, timeout=timeout)


def get_json(path, timeout=20):
    return requests.get(f"{BASE_URL}{path}", timeout=timeout)


def test_health():
    try:
        response = get_json("/api/health", timeout=5)
        if response.status_code != 200:
            return fail("health", f"HTTP {response.status_code}: {response.text}")
        return success("health")
    except Exception as exc:
        return fail("health", exc, repair="Start the backend with: cd server && npm run dev")


def test_analyze():
    try:
        response = post_json(
            "/analyze",
            {"image_url": png_data_url("source"), "artworkType": "finished", "goal": "composition critique"},
        )
        data = safe_json(response)
        if response.status_code >= 400:
            return fail("analyze", extract_error(data), repair=repair_hint(data))
        task_id = as_dict(data.get("data")).get("task_id")
        if not task_id:
            return fail("analyze", "missing task_id", response=data)
        polled = poll_task(task_id)
        if polled.get("status") == "fail":
            return polled
        task = as_dict(polled.get("task"))
        issues = as_dict_list(task.get("problems")) or as_dict_list(as_dict(task.get("report")).get("issues"))
        if not issues:
            return fail("analyze", "empty issues", task_status=task.get("status"), repair="AI returned no critique issues; inspect logs/app.log and retry.")
        has_bbox = any(item.get("bbox") for item in issues)
        if not has_bbox:
            return fail("analyze", "issues missing bbox", repair="Tighten the analysis prompt schema and retry.")
        return success("analyze", task_id=task_id, issues=len(issues))
    except Exception as exc:
        return fail("analyze", exc)


def test_job_create():
    try:
        response = post_json("/job/create", {"image": png_data_url("source"), "goal": "persist job"})
        data = safe_json(response)
        if response.status_code >= 400:
            return fail("job_create", extract_error(data), repair=repair_hint(data))
        job_id = as_dict(data.get("data")).get("job_id")
        if not job_id:
            return fail("job_create", "missing job_id", response=data)
        readback = get_json(f"/job/{job_id}")
        if readback.status_code != 200:
            return fail("job_readback", f"HTTP {readback.status_code}: {readback.text}")
        return success("job_create", job_id=job_id)
    except Exception as exc:
        return fail("job_create", exc)


def test_inpaint():
    payload = {
        "image": png_data_url("source"),
        "mask": png_data_url("mask"),
        "prompt": "repair the selected shoulder structure while preserving the surrounding drawing",
    }
    last_error = None
    for attempt in range(1, 4):
        try:
            response = post_json("/inpaint", payload, timeout=120)
            data = safe_json(response)
            if response.status_code >= 400:
                return fail("inpaint", extract_error(data), attempts=attempt, repair=repair_hint(data))
            response_data = as_dict(data.get("data"))
            edited = response_data.get("edited_image")
            if edited:
                return success(
                    "inpaint",
                    attempts=attempt,
                    edited_image=edited,
                    api_called=bool(response_data.get("api_called")),
                    token_usage=response_data.get("token_usage"),
                )
            last_error = "no edited_image returned"
            time.sleep(attempt)
        except Exception as exc:
            last_error = exc
            time.sleep(attempt)
    return fail("inpaint", last_error, repair="Empty image response after 3 retries; inspect image model and base_url.")


def poll_task(task_id, timeout=120):
    deadline = time.time() + timeout
    while time.time() < deadline:
        response = get_json(f"/api/task/{task_id}")
        data = safe_json(response)
        if response.status_code >= 400:
            return fail("analyze_poll", extract_error(data), task_id=task_id, repair=repair_hint(data))
        task = as_dict(as_dict(data.get("data")).get("task"))
        if task.get("status") in {"waiting_selection", "partial_done", "done"}:
            return {"status": "pass", "task": task}
        if task.get("status") == "failed":
            task_error = as_dict(task.get("error"))
            return fail("analyze_poll", task_error.get("message", "task failed"), task_id=task_id, repair=repair_hint(task))
        time.sleep(2)
    return fail("analyze_poll", "timeout waiting for task", task_id=task_id)


def safe_json(response):
    try:
        return response.json()
    except Exception:
        return {"raw": response.text}


def extract_error(data):
    if not isinstance(data, dict):
        return data
    return as_dict(data.get("error")).get("message") or data.get("raw") or data


def as_dict(value: Any) -> JsonDict:
    return value if isinstance(value, dict) else {}


def as_dict_list(value: Any) -> list[JsonDict]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def repair_hint(data):
    text = json.dumps(data, ensure_ascii=False).lower()
    if "api key" in text or "401" in text or "403" in text:
        return "API not called successfully: check OPENAI_API_KEY, provider, base_url, and saved AI config."
    if "model" in text or "404" in text:
        return "Model unavailable: verify analysisModel/editModel for the configured provider."
    if "empty" in text:
        return "Empty response: retry 3 times, then inspect logs/app.log for the image API payload."
    return "Inspect logs/app.log and logs/test_report.json."


def run_all():
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    results = [test_health(), test_job_create(), test_analyze(), test_inpaint()]
    REPORT_PATH.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    run_all()
