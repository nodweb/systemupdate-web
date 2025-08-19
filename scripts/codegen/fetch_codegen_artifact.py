#!/usr/bin/env python3
"""
Fetch latest 'proto-generated-types' artifact from GitHub Actions and extract into systemupdate-web/generated.

Requirements:
- Python 3.11+
- Environment variables:
  - GH_TOKEN (a GitHub PAT or GITHUB_TOKEN) with repo read permissions
  - GH_REPO (e.g. 'nodweb/systemupdate-web')

Usage (from systemupdate-web/):
  python scripts/codegen/fetch_codegen_artifact.py

It will:
- Find latest successful run of workflow 'proto-codegen.yml'
- Download artifact 'proto-generated-types' as a zip
- Extract to ./generated
"""

import io
import os
import sys
import zipfile
from pathlib import Path

import requests

WEB_ROOT = Path(__file__).resolve().parents[2] / "systemupdate-web"
WORKFLOW_FILE = "proto-codegen.yml"
ARTIFACT_NAME = "proto-generated-types"


def die(msg: str, code: int = 1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def github_api(url: str, token: str, params=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    r = requests.get(url, headers=headers, params=params, timeout=60)
    if r.status_code >= 300:
        die(f"GitHub API error {r.status_code}: {r.text}")
    return r.json()


def main():
    token = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GH_REPO")
    if not token:
        die("Missing GH_TOKEN/GITHUB_TOKEN env var")
    if not repo:
        die("Missing GH_REPO env var (e.g. 'nodweb/systemupdate-web')")

    # 1) find workflow id by file name
    wf_list = github_api(
        f"https://api.github.com/repos/{repo}/actions/workflows", token
    )
    wf = next(
        (
            w
            for w in wf_list.get("workflows", [])
            if w.get("path", "").endswith(WORKFLOW_FILE)
        ),
        None,
    )
    if not wf:
        die(f"Workflow '{WORKFLOW_FILE}' not found")
    wid = wf["id"]

    # 2) get runs, pick latest successful
    runs = github_api(
        f"https://api.github.com/repos/{repo}/actions/workflows/{wid}/runs",
        token,
        params={"status": "success", "per_page": 10},
    )
    items = runs.get("workflow_runs", [])
    if not items:
        die("No successful runs found for workflow")
    run_id = items[0]["id"]

    # 3) list artifacts for the run
    arts = github_api(
        f"https://api.github.com/repos/{repo}/actions/runs/{run_id}/artifacts",
        token,
        params={"per_page": 100},
    )
    art = next(
        (a for a in arts.get("artifacts", []) if a.get("name") == ARTIFACT_NAME), None
    )
    if not art:
        die(f"Artifact '{ARTIFACT_NAME}' not found in the latest successful run")

    # 4) download zip
    dl_url = art["archive_download_url"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    r = requests.get(dl_url, headers=headers, timeout=120)
    if r.status_code >= 300:
        die(f"Download error {r.status_code}: {r.text}")

    z = zipfile.ZipFile(io.BytesIO(r.content))
    out_dir = WEB_ROOT / "generated"
    out_dir.mkdir(parents=True, exist_ok=True)
    z.extractall(out_dir)
    print(f"Extracted artifact to {out_dir}")


if __name__ == "__main__":
    main()
