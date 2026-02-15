# Epoch implementation worker

Runs on [Modal](https://modal.com): FastAPI trigger + Sandbox that executes the inlined runner (Claude Agent + git push). Templates live here so the sandbox can bootstrap from `templates/nextjs-base` instead of running create-next-app.

- **Deploy:** from repo root, `modal deploy worker/implementation.py`
- **Env:** `MODAL_IMPLEMENTATION_URL` is the deployed trigger URL (used by the server to spawn jobs).
