#!/usr/bin/env python3
"""
auto-fix Phase 4 runner — delegates approved tickets to smaller models via `claude -p`.

Zero-dependency (stdlib only). Run from the repo root:

    python3 .claude/skills/auto-fix/scripts/run_phase4.py            # next 5 tickets
    python3 .claude/skills/auto-fix/scripts/run_phase4.py --max 1    # single ticket
    python3 .claude/skills/auto-fix/scripts/run_phase4.py --dry-run  # show plan, run nothing

Design contract (mirrors SKILL.md):
- Implements APPROVED tickets from tickets/ in FIX_PLAN order, one `claude -p`
  session per ticket, on an isolated git branch autofix/T-###.
- Tier -> model map: SENIOR -> sonnet, INTERMEDIATE -> haiku (override via env
  AUTOFIX_SENIOR_MODEL / AUTOFIX_INTERMEDIATE_MODEL, e.g. a GLM/GPT proxy alias).
- FAIL-CLOSED file scoping: Edit/Write permissions are granted ONLY for the paths
  parsed from the ticket's "IN:" scope block. If the block can't be parsed, the
  ticket is marked BLOCKED-PARSE and skipped — never falls back to broad write access.
- Hard stops: after --max tickets (default 5), on any BLOCKED result, after any
  P0 ticket, or when --budget-usd for the run is exhausted. Review (Phase 5)
  always happens back in the main staff-engineer session — this script never
  accepts its own work.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path.cwd()
TICKETS_DIR = REPO / "tickets"
PROGRESS = REPO / "PROGRESS.md"
SKILL_DIR = Path(__file__).resolve().parent.parent
IMPLEMENTER_PROTOCOL = SKILL_DIR / "references" / "implementer-protocol.md"

TIER_MODELS = {
    "SENIOR": os.environ.get("AUTOFIX_SENIOR_MODEL", "sonnet"),
    "INTERMEDIATE": os.environ.get("AUTOFIX_INTERMEDIATE_MODEL", "haiku"),
}
SAFE_BASH = [
    "Bash(git diff *)", "Bash(git status *)", "Bash(git log *)", "Bash(git add *)",
    "Bash(git commit *)", "Bash(npm run *)", "Bash(npm test *)", "Bash(npx *)",
    "Bash(node *)", "Bash(python3 *)", "Bash(pytest *)", "Bash(ls *)", "Bash(cat *)",
]


def die(msg: str, code: int = 1):
    print(f"[auto-fix] FATAL: {msg}", file=sys.stderr)
    sys.exit(code)


def sh(cmd, **kw):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, **kw)
    except FileNotFoundError:
        return subprocess.CompletedProcess(cmd, 127, "", f"{cmd[0]}: not found")


def parse_ticket(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    tid = re.search(r"#\s*(T-\d+)", text)
    tier = re.search(r"\*\*Assigned tier:\*\*\s*(SENIOR|INTERMEDIATE)", text)
    sev = re.search(r"Severity:\s*(P[0-3])", text)
    # Parse IN: scope — lines between "IN:" and "OUT:" inside the SCOPE section.
    in_block = re.search(r"IN:\s*(.*?)(?:\nOUT:|\n##)", text, re.S)
    paths = []
    if in_block:
        for line in in_block.group(1).splitlines():
            line = line.strip().lstrip("-").strip().strip("`")
            if line and not line.startswith("<") and ("/" in line or "." in line):
                paths.append(line)
    return {
        "id": tid.group(1) if tid else None,
        "tier": tier.group(1) if tier else None,
        "severity": sev.group(1) if sev else "P3",
        "paths": paths,
        "file": path,
        "text": text,
    }


def ticket_status(tid: str) -> str:
    if not PROGRESS.exists():
        return "APPROVED"
    for line in PROGRESS.read_text(encoding="utf-8").splitlines():
        if re.search(rf"\b{tid}\b", line):
            for s in ("ACCEPTED", "IMPLEMENTED", "BLOCKED", "REWORK", "SKIPPED"):
                if s in line:
                    return s
    return "APPROVED"


def log_progress(tid, status, tier, extra=""):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    line = f"| {tid} | {status} | {tier} | {ts} | {extra} |\n"
    if not PROGRESS.exists():
        PROGRESS.write_text(
            "# PROGRESS — auto-fix ledger\n\n| Ticket | Status | Tier | When | Notes |\n|---|---|---|---|---|\n",
            encoding="utf-8",
        )
    with PROGRESS.open("a", encoding="utf-8") as f:
        f.write(line)


def run_ticket(t: dict, budget: float, max_turns: int, dry: bool) -> dict:
    tid, tier = t["id"], t["tier"]
    model = TIER_MODELS.get(tier)
    if not model:
        log_progress(tid, "BLOCKED-PARSE", tier or "?", "missing/invalid tier")
        return {"status": "BLOCKED", "cost": 0.0}
    if not t["paths"]:
        log_progress(tid, "BLOCKED-PARSE", tier, "could not parse SCOPE IN paths — fail-closed")
        return {"status": "BLOCKED", "cost": 0.0}

    allowed = ["Read"] + SAFE_BASH
    for p in t["paths"]:
        allowed += [f"Edit({p})", f"Write({p})"]

    branch = f"autofix/{tid.lower()}"
    prompt = (
        f"You are the {tier} developer on the auto-fix pipeline.\n\n"
        f"=== BINDING PROTOCOL ===\n{IMPLEMENTER_PROTOCOL.read_text(encoding='utf-8')}\n\n"
        f"=== YOUR TICKET ===\n{t['text']}\n\n"
        "Implement this ticket now. Commit your work to the current branch with message "
        f"'{tid}: <summary>'. End your final message with the IMPLEMENTATION REPORT."
    )
    cmd = [
        "claude", "-p", prompt,
        "--model", model,
        "--permission-mode", "dontAsk",  # fail-loud: anything off the allowlist is denied, not prompted; acceptEdits would auto-approve ALL edits and defeat the per-path Edit() fence
        "--allowedTools", ",".join(allowed),
        "--max-turns", str(max_turns),
        "--max-budget-usd", str(budget),
        "--output-format", "json",
    ]

    print(f"[auto-fix] {tid} -> tier={tier} model={model} scope={t['paths']}")
    if dry:
        print("  DRY RUN — command:\n  " + " ".join(cmd[:2]) + " '<prompt>' " + " ".join(cmd[3:]))
        return {"status": "DRY", "cost": 0.0}

    # Branch from the CURRENT base branch (main session's branch), and return to it
    # afterwards — otherwise ticket N+1 silently stacks on ticket N's unreviewed work.
    base = sh(["git", "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip() or "main"
    r = sh(["git", "checkout", "-B", branch, base])
    if r.returncode != 0:
        log_progress(tid, "BLOCKED", tier, f"git branch failed: {r.stderr.strip()[:120]}")
        return {"status": "BLOCKED", "cost": 0.0}

    r = sh(cmd)
    sh(["git", "checkout", base])  # back to base regardless of outcome; diff lives on the ticket branch
    report_path = TICKETS_DIR / f"{tid}-report.json"
    report_path.write_text(r.stdout or "{}", encoding="utf-8")
    cost = 0.0
    try:
        out = json.loads(r.stdout)
        cost = float(out.get("total_cost_usd", 0.0))
        result_text = out.get("result", "")
    except (json.JSONDecodeError, TypeError):
        result_text = r.stdout or r.stderr

    blocked = "Status: BLOCKED" in result_text or r.returncode != 0
    status = "BLOCKED" if blocked else "IMPLEMENTED"
    log_progress(tid, status, tier, f"branch={branch} cost=${cost:.2f} report={report_path.name}")
    print(f"[auto-fix] {tid}: {status} (${cost:.2f}) — report: {report_path}")
    return {"status": status, "cost": cost}


def main():
    ap = argparse.ArgumentParser(description="auto-fix Phase 4 — delegate tickets to smaller models")
    ap.add_argument("--max", type=int, default=5, help="max tickets this run (default 5)")
    ap.add_argument("--budget-usd", type=float, default=5.0, help="total spend cap for the run")
    ap.add_argument("--per-ticket-budget", type=float, default=1.0, help="spend cap per ticket")
    ap.add_argument("--max-turns", type=int, default=30, help="agent turn cap per ticket")
    ap.add_argument("--ticket", type=str, help="run only this ticket ID (e.g. T-003)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not TICKETS_DIR.exists():
        die("no tickets/ directory — run Phases 1–3 first (see SKILL.md)")
    if sh(["git", "rev-parse", "--is-inside-work-tree"]).returncode != 0:
        die("not a git repo — the branch-per-ticket safety model requires git")
    if sh(["claude", "--version"]).returncode != 0:
        die("`claude` CLI not found on PATH")
    if sh(["git", "status", "--porcelain"]).stdout.strip():
        die("working tree dirty — commit or stash before dispatching tickets")

    tickets = sorted(
        (parse_ticket(p) for p in TICKETS_DIR.glob("T-*.md")),
        key=lambda t: t["id"] or "",
    )
    if args.ticket:
        tickets = [t for t in tickets if t["id"] == args.ticket]

    spent, done = 0.0, 0
    for t in tickets:
        if done >= args.max:
            print(f"[auto-fix] stop: --max {args.max} reached. Return to main session for Phase 5 review.")
            break
        if spent >= args.budget_usd:
            print(f"[auto-fix] stop: run budget ${args.budget_usd} exhausted.")
            break
        if ticket_status(t["id"]) not in ("APPROVED", "REWORK"):
            continue
        res = run_ticket(t, min(args.per_ticket_budget, args.budget_usd - spent), args.max_turns, args.dry_run)
        spent += res["cost"]
        done += 1
        if res["status"] == "BLOCKED":
            print(f"[auto-fix] stop: {t['id']} BLOCKED — staff review required before continuing.")
            break
        if t["severity"] == "P0":
            print(f"[auto-fix] stop: P0 ticket {t['id']} completed — mandatory review gate.")
            break

    print(f"\n[auto-fix] run complete: {done} ticket(s), ${spent:.2f}. Next: Phase 5 review in the main session.")


if __name__ == "__main__":
    main()
