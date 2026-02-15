"""
Epoch implementation – single file. Trigger endpoint + Sandbox that runs inlined runner via stdin.
"""

import json
import os
from pathlib import Path

import modal
from fastapi import Request, Response

app = modal.App("epoch-implementation")

# Inlined runner: reads env, runs Claude Agent, git push, callback. Run in Sandbox via: python -c "exec(compile(open(0).read(), '<stdin>', 'exec'))" < stdin
_RUN_IMPL_SOURCE = r'''
import os
import subprocess
import json
import urllib.request
from pathlib import Path

def _log(msg):
    print("[implementation]", msg, flush=True)

def _env(key, default=""):
    return (os.environ.get(key) or default).strip()

def main():
    job_id = _env("JOB_ID")
    idea = _env("IDEA")
    callback_base_url = _env("CALLBACK_BASE_URL")
    repo_url = _env("REPO_URL") or None
    github_token = _env("GITHUB_TOKEN") or None
    branch = _env("BRANCH", "main")
    risk = int(_env("RISK", "50"))
    temperature = int(_env("TEMPERATURE", "50"))
    worker_profile = _env("WORKER_PROFILE")
    _log("run_impl started job_id=%s branch=%s" % (job_id, branch))
    work_dir = Path("/out")
    work_dir.mkdir(parents=True, exist_ok=True)
    os.chdir(work_dir)
    base = callback_base_url.rstrip("/") if callback_base_url else ""
    if not base or not (base.startswith("http://") or base.startswith("https://")):
        _log("invalid or missing CALLBACK_BASE_URL; callbacks skipped")
    def post_step(step, step_index, done):
        if not base:
            return
        try:
            req = urllib.request.Request(base + "/internal/step", data=json.dumps({"jobId": job_id, "step": step, "stepIndex": step_index, "done": done, "message": step}).encode(), headers={"Content-Type": "application/json"}, method="POST")
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            _log("step callback error: %s" % e)
    import anyio
    from claude_agent_sdk import ClaudeAgentOptions, query, AssistantMessage, TextBlock, ResultMessage
    system_prompt = "You are an expert developer. Implement this as a Next.js app in the current directory. First output a short numbered plan (3-6 steps), then execute each step. Use only Read, Write, Edit, Bash, Glob. Create app with: npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias \"@/*\" --use-npm. Idea: %s. Worker profile: %s. Risk: %s, Temperature: %s. Keep minimal but functional." % (idea, worker_profile, risk, temperature)
    prompt = "Implement this idea as a Next.js app in the current directory: %s\n\nFirst output your numbered plan, then execute each step." % idea
    step_index = [0]
    async def run_agent():
        async for message in query(prompt=prompt, options=ClaudeAgentOptions(system_prompt=system_prompt, allowed_tools=["Read", "Write", "Edit", "Bash", "Glob"], permission_mode="acceptEdits")):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock) and block.text.strip():
                        post_step(block.text.strip()[:200], step_index[0], False)
                        step_index[0] += 1
            elif isinstance(message, ResultMessage):
                post_step("Agent run complete", step_index[0], True)
    anyio.run(run_agent)
    _log("agent run finished")
    pitch = "Built with Epoch: %s..." % idea[:120]
    if repo_url and github_token:
        try:
            push_url = repo_url.replace("https://", "https://x-access-token:%s@" % github_token)
            subprocess.run(["git", "config", "user.email", "epoch@epoch.local"], cwd=work_dir, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.name", "Epoch"], cwd=work_dir, check=True, capture_output=True)
            subprocess.run(["git", "init"], cwd=work_dir, check=True, capture_output=True)
            subprocess.run(["git", "add", "-A"], cwd=work_dir, check=True, capture_output=True)
            subprocess.run(["git", "commit", "-m", "Epoch implementation", "--allow-empty"], cwd=work_dir, check=True, capture_output=True)
            subprocess.run(["git", "branch", "-M", branch], cwd=work_dir, check=True, capture_output=True)
            subprocess.run(["git", "remote", "add", "origin", push_url], cwd=work_dir, check=True, capture_output=True)
            subprocess.run(["git", "push", "-u", "origin", branch], cwd=work_dir, check=True, capture_output=True, timeout=120)
            _log("git push OK")
        except subprocess.CalledProcessError as e:
            _log("git failed: %s" % e)
            repo_url = ""
    if base:
        try:
            req = urllib.request.Request(base + "/internal/done", data=json.dumps({"jobId": job_id, "repoUrl": repo_url or "", "pitch": pitch, "success": bool(repo_url or not github_token), "error": None, "branch": branch}).encode(), headers={"Content-Type": "application/json"}, method="POST")
            urllib.request.urlopen(req, timeout=15)
        except Exception as e:
            _log("done callback error: %s" % e)
    _log("run_impl finished")
main()
'''


def _log(msg: str) -> None:
    print(f"[implementation] {msg}", flush=True)


_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "curl")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
    )
    .pip_install("claude-agent-sdk", "httpx", "anyio", "fastapi[standard]")
)


@app.function(
    image=_image,
    timeout=1900,
    secrets=[modal.Secret.from_name("anthropic")],
)
def run_in_sandbox(
    job_id: str,
    idea: str,
    risk: int,
    temperature: int,
    worker_profile: str,
    callback_base_url: str,
    branch: str,
    repo_url: str | None,
    github_token: str | None,
) -> None:
    """Create a Sandbox, inject job params as env, run inlined runner via stdin."""
    job_secret = modal.Secret.from_dict({
        "JOB_ID": job_id,
        "IDEA": idea,
        "RISK": str(risk),
        "TEMPERATURE": str(temperature),
        "WORKER_PROFILE": worker_profile or "",
        "CALLBACK_BASE_URL": callback_base_url or "",
        "BRANCH": branch,
        "REPO_URL": repo_url or "",
        "GITHUB_TOKEN": github_token or "",
    })
    _log("creating Sandbox for job_id=%s branch=%s" % (job_id, branch))
    sb = modal.Sandbox.create(
        app=app,
        image=_image,
        secrets=[modal.Secret.from_name("anthropic"), job_secret],
        timeout=1800,
    )
    try:
        _log("executing inlined runner in Sandbox")
        p = sb.exec("python", "-c", "exec(compile(open(0).read(), '<stdin>', 'exec'))", timeout=1700)
        p.stdin.write(_RUN_IMPL_SOURCE.encode())
        p.stdin.write_eof()
        p.stdin.drain()
        for line in p.stdout:
            print(line, end="", flush=True)
        exit_code = p.wait()
        _log("runner exited with code %s" % exit_code)
    finally:
        sb.terminate()
        _log("Sandbox terminated")


@app.function(image=_image)
@modal.fastapi_endpoint(method="POST")
async def trigger(request: Request):
    raw = await request.body()
    _log("trigger received body length=%s" % len(raw))
    try:
        body = json.loads(raw)
    except json.JSONDecodeError as e:
        _log("trigger invalid JSON: %s" % e)
        return Response(content=json.dumps({"ok": False, "error": "Invalid JSON"}), status_code=400, media_type="application/json")
    run_in_sandbox.spawn(
        job_id=body.get("job_id") or "",
        idea=body.get("idea") or "",
        risk=int(body.get("risk", 50)),
        temperature=int(body.get("temperature", 50)),
        worker_profile=body.get("worker_profile") or "",
        callback_base_url=body.get("callback_base_url") or "",
        branch=body.get("branch") or "main",
        repo_url=body.get("repo_url"),
        github_token=body.get("github_token"),
    )
    return {"ok": True, "message": "implementation spawned"}
