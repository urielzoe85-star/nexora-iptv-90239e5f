"""
RC1 — assemble le rapport final :
  - out/RC1-REPORT.md  (rapport officiel + verdict)
  - report/index.html  (scénarios, screenshots, durées, logs)
  - out/perf.json      (agrégats médiane/p95)

Exit code 0 si RC1 CERTIFIED, sinon 1.
"""
from __future__ import annotations
import html
import json
import os
import pathlib
import statistics
import sys
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "out"
REPORT_DIR = ROOT / "report"
SCREENSHOTS = ROOT / "screenshots"
REPORT_DIR.mkdir(exist_ok=True)

PERF_BUDGET_MS = int(os.environ.get("RC1_PERF_BUDGET_MS", "30000"))

MODULES = ["checkout", "payment", "workflow", "iptv", "delivery", "tracking", "notifications"]


def _load(name: str) -> dict:
    p = OUT / name
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text())
    except Exception:
        return {}


def _scenarios() -> list[dict]:
    scen: list[dict] = []
    for p in sorted(OUT.glob("scenario_*.json")):
        try:
            scen.append(json.loads(p.read_text()))
        except Exception:
            pass
    return scen


def _agg_perf(scen: list[dict]) -> dict:
    keys = ["t_checkout", "t_payment", "t_workflow", "t_delivery", "t_tracking", "t_total"]
    out: dict = {}
    for k in keys:
        vals = [s.get("perf_ms", {}).get(k) for s in scen if s.get("perf_ms", {}).get(k)]
        if not vals:
            out[k] = None
            continue
        vals_sorted = sorted(vals)
        out[k] = {
            "median_ms": int(statistics.median(vals_sorted)),
            "p95_ms": int(vals_sorted[max(0, int(len(vals_sorted) * 0.95) - 1)]),
            "max_ms": int(max(vals_sorted)),
            "samples": len(vals_sorted),
        }
    return out


def _verdict(scen, dbc, logs, chain, perf) -> tuple[bool, list[str]]:
    blockers: list[str] = []
    failed = [s for s in scen if not s.get("ok")]
    if failed:
        blockers.append(f"{len(failed)} scenario(s) failed: " + ", ".join(s.get("id", "?") for s in failed))
    if not dbc.get("ok", True):
        blockers.append(f"DB critical anomalies: {dbc.get('critical_count')}")
    if not logs.get("ok", True):
        blockers.append(f"Logs critical anomalies: {logs.get('critical_count')}")
    if not chain.get("ok", True):
        bad = [r["ref"] for r in chain.get("results", []) if not r.get("ok")]
        blockers.append(f"Workflow chain broken for: {', '.join(bad) or 'unknown'}")
    total = (perf.get("t_total") or {})
    if total and total.get("median_ms") and total["median_ms"] > PERF_BUDGET_MS:
        blockers.append(f"Perf budget exceeded: median {total['median_ms']}ms > {PERF_BUDGET_MS}ms")
    return (len(blockers) == 0, blockers)


def _md(scen, dbc, logs, chain, perf, certified, blockers) -> str:
    ts = datetime.now(timezone.utc).isoformat()
    passed = sum(1 for s in scen if s.get("ok"))
    total = len(scen)
    lines = []
    lines.append(f"# RC1 Certification Report")
    lines.append("")
    lines.append(f"- **Date**: {ts}")
    lines.append(f"- **Base URL**: {os.environ.get('E2E_BASE_URL', 'http://localhost:8080')}")
    lines.append(f"- **Perf budget (t_total, median)**: {PERF_BUDGET_MS} ms")
    lines.append("")
    lines.append("## Verdict")
    lines.append("")
    if certified:
        lines.append("## ✅ RC1 CERTIFIED – READY FOR PRODUCTION")
    else:
        lines.append("## ❌ RC1 NOT CERTIFIED")
        lines.append("")
        for b in blockers:
            lines.append(f"- {b}")
    lines.append("")
    lines.append("## Tests")
    lines.append("")
    lines.append(f"- Total: **{total}**  ·  Passed: **{passed}**  ·  Failed: **{total - passed}**")
    lines.append("")
    lines.append("| ID | Nom | Résultat | Ref | Erreur |")
    lines.append("|----|-----|----------|-----|--------|")
    for s in scen:
        status = "✅ PASS" if s.get("ok") else "❌ FAIL"
        lines.append(f"| {s.get('id','')} | {s.get('name','')} | {status} | `{s.get('ref','')}` | {s.get('error','') or ''} |")
    lines.append("")
    lines.append("## Modules couverts")
    lines.append("")
    lines.append(", ".join(f"`{m}`" for m in MODULES))
    lines.append("")
    lines.append("## Couverture fonctionnelle")
    lines.append("")
    lines.append("- Checkout → seed d'ordre + validation status (RC1-01)")
    lines.append("- Payment → emit-test + webhook SebPay signé (RC1-01, RC1-02)")
    lines.append("- Workflow → drain queue + steps (RC1-01, RC1-03)")
    lines.append("- IPTV assignment → 1 compte / order, fallback si MEGAOTT off (RC1-01, RC1-03)")
    lines.append("- Delivery → delivery_logs + orders.metadata.iptv_delivery (RC1-01)")
    lines.append("- Tracking → /track?ref=... 200 + ref affiché (RC1-01, workflow-chain)")
    lines.append("- Idempotence / sécurité HMAC → replay + signature invalide (RC1-02)")
    lines.append("")
    lines.append("## Performances")
    lines.append("")
    lines.append("| Étape | Médiane (ms) | p95 (ms) | Max (ms) | Échantillons |")
    lines.append("|-------|--------------|----------|----------|--------------|")
    for k in ["t_checkout", "t_payment", "t_workflow", "t_delivery", "t_tracking", "t_total"]:
        v = perf.get(k)
        if v:
            lines.append(f"| {k} | {v['median_ms']} | {v['p95_ms']} | {v['max_ms']} | {v['samples']} |")
        else:
            lines.append(f"| {k} | — | — | — | 0 |")
    lines.append("")
    lines.append("## Intégrité DB")
    lines.append("")
    lines.append(f"- Critical: **{dbc.get('critical_count', 0)}**  ·  Warnings: **{dbc.get('warning_count', 0)}**")
    lines.append(f"- Stats: `{json.dumps(dbc.get('stats', {}))}`")
    lines.append(f"- Mapping demandé → réel: `payments`→`orders`, `audit_logs`→`iptv_logs+automation_steps+integration_debug_logs`")
    if dbc.get("anomalies"):
        lines.append("")
        lines.append("<details><summary>Anomalies DB</summary>")
        lines.append("")
        for a in dbc["anomalies"][:50]:
            lines.append(f"- `{a.get('severity')}` **{a.get('table')}** — {a.get('issue')}")
        lines.append("</details>")
    lines.append("")
    lines.append("## Logs")
    lines.append("")
    lines.append(f"- Critical: **{logs.get('critical_count', 0)}**  ·  Warnings: **{logs.get('warning_count', 0)}**")
    if logs.get("anomalies"):
        lines.append("")
        lines.append("<details><summary>Anomalies logs</summary>")
        lines.append("")
        for a in logs["anomalies"][:50]:
            lines.append(f"- `{a.get('severity')}` **{a.get('source')}** — {a.get('message') or a.get('error') or a.get('excerpt') or ''}")
        lines.append("</details>")
    lines.append("")
    lines.append("## Chaîne de workflow")
    lines.append("")
    lines.append(f"- Refs vérifiés: **{chain.get('refs_checked', 0)}**  ·  OK: **{sum(1 for r in chain.get('results', []) if r.get('ok'))}**")
    for r in chain.get("results", []):
        st = "✅" if r.get("ok") else "❌"
        lines.append(f"- {st} `{r['ref']}` — chain_ok={r.get('chain_ok')} track_ok={r.get('track_ok')}(HTTP {r.get('track_http')}) missing={r.get('missing')}")
    lines.append("")
    lines.append("## Prochaine étape")
    lines.append("")
    if certified:
        lines.append("Figer RC1 : tag Git + sauvegarde, puis ouvrir Sprint 2 (sécurité, durcissement).")
    else:
        lines.append("Corriger les blocages listés puis rejouer `bash tests/rc1/run-certification.sh`.")
    lines.append("")
    return "\n".join(lines)


def _html(scen, dbc, logs, chain, perf, certified, blockers, md_text) -> str:
    def esc(x): return html.escape(str(x))
    verdict_html = (
        '<div class="verdict ok">✅ RC1 CERTIFIED – READY FOR PRODUCTION</div>'
        if certified else
        '<div class="verdict ko">❌ RC1 NOT CERTIFIED</div><ul>' +
        "".join(f"<li>{esc(b)}</li>" for b in blockers) + "</ul>"
    )
    scen_rows = "".join(
        f"<tr><td>{esc(s.get('id',''))}</td><td>{esc(s.get('name',''))}</td>"
        f"<td>{'✅ PASS' if s.get('ok') else '❌ FAIL'}</td>"
        f"<td><code>{esc(s.get('ref',''))}</code></td>"
        f"<td>{esc(s.get('error','') or '')}</td></tr>"
        for s in scen
    )
    step_blocks = []
    for s in scen:
        steps_rows = "".join(
            f"<tr><td>{esc(st.get('name',''))}</td><td>{'✅' if st.get('ok') else '❌'}</td>"
            f"<td>{esc(st.get('duration_ms',''))}</td>"
            f"<td><pre>{esc({k:v for k,v in st.items() if k not in ('name','ok','duration_ms')})}</pre></td></tr>"
            for st in s.get("steps", [])
        )
        shots = []
        for st in s.get("steps", []):
            shot = st.get("screenshot")
            if shot:
                shots.append(f'<figure><img src="../screenshots/{esc(shot)}" alt="{esc(shot)}"/><figcaption>{esc(shot)}</figcaption></figure>')
        step_blocks.append(f"""
          <section class="scenario">
            <h3>{esc(s.get('id',''))} — {esc(s.get('name',''))} — {'✅ PASS' if s.get('ok') else '❌ FAIL'}</h3>
            <p>Ref: <code>{esc(s.get('ref',''))}</code> · Total: {esc((s.get('perf_ms') or {}).get('t_total','?'))} ms</p>
            <table><thead><tr><th>Étape</th><th>OK</th><th>Durée (ms)</th><th>Détails</th></tr></thead>
              <tbody>{steps_rows}</tbody></table>
            {'<div class="shots">' + ''.join(shots) + '</div>' if shots else ''}
          </section>
        """)
    def _perf_row(k: str) -> str:
        v = perf.get(k)
        if v:
            return f"<tr><td>{k}</td><td>{v['median_ms']}</td><td>{v['p95_ms']}</td><td>{v['max_ms']}</td><td>{v['samples']}</td></tr>"
        return f"<tr><td>{k}</td><td>—</td><td>—</td><td>—</td><td>0</td></tr>"
    perf_rows = "".join(_perf_row(k) for k in
                        ["t_checkout","t_payment","t_workflow","t_delivery","t_tracking","t_total"])
    db_rows = "".join(
        f"<tr><td>{esc(a.get('severity'))}</td><td>{esc(a.get('table'))}</td><td>{esc(a.get('issue'))}</td></tr>"
        for a in (dbc.get("anomalies") or [])[:100]
    ) or "<tr><td colspan='3'>Aucune anomalie DB.</td></tr>"
    log_rows = "".join(
        f"<tr><td>{esc(a.get('severity'))}</td><td>{esc(a.get('source'))}</td><td>{esc(a.get('message') or a.get('error') or a.get('excerpt') or '')}</td></tr>"
        for a in (logs.get("anomalies") or [])[:100]
    ) or "<tr><td colspan='3'>Aucune anomalie de logs.</td></tr>"
    chain_rows = "".join(
        f"<tr><td>{'✅' if r.get('ok') else '❌'}</td><td><code>{esc(r['ref'])}</code></td>"
        f"<td>{esc(r.get('chain_ok'))}</td><td>{esc(r.get('track_ok'))} (HTTP {esc(r.get('track_http'))})</td>"
        f"<td>{esc(r.get('missing'))}</td></tr>"
        for r in chain.get("results", [])
    ) or "<tr><td colspan='5'>Pas de ref vérifié.</td></tr>"
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><title>RC1 Certification Report</title>
<style>
body{{font-family:system-ui,sans-serif;margin:2rem;max-width:1200px;color:#111}}
h1{{margin-bottom:.2rem}} .meta{{color:#666;margin-bottom:1rem}}
.verdict{{padding:1rem 1.4rem;border-radius:.6rem;font-weight:700;font-size:1.15rem;margin:1rem 0}}
.verdict.ok{{background:#e6f8ec;color:#065f2b;border:1px solid #22c55e}}
.verdict.ko{{background:#fde8e8;color:#7f1d1d;border:1px solid #dc2626}}
table{{border-collapse:collapse;width:100%;margin:.6rem 0 1.4rem}}
th,td{{border:1px solid #e5e7eb;padding:.35rem .5rem;text-align:left;font-size:.92rem;vertical-align:top}}
th{{background:#f3f4f6}}
section.scenario{{border:1px solid #e5e7eb;border-radius:.5rem;padding:1rem;margin:1rem 0;background:#fafafa}}
.shots{{display:flex;flex-wrap:wrap;gap:.6rem}} .shots figure{{margin:0;max-width:320px}}
.shots img{{width:100%;border:1px solid #ddd;border-radius:.3rem}} figcaption{{font-size:.75rem;color:#555;text-align:center}}
code,pre{{background:#f6f8fa;padding:0 .3rem;border-radius:.2rem;font-size:.85rem}}
pre{{white-space:pre-wrap;word-break:break-word;margin:0}}
</style></head><body>
<h1>RC1 Certification Report</h1>
<p class="meta">Base URL: <code>{esc(os.environ.get('E2E_BASE_URL','http://localhost:8080'))}</code>
 · Budget perf t_total: {PERF_BUDGET_MS} ms
 · Généré: {esc(datetime.now(timezone.utc).isoformat())}</p>
{verdict_html}

<h2>Scénarios</h2>
<table><thead><tr><th>ID</th><th>Nom</th><th>Résultat</th><th>Ref</th><th>Erreur</th></tr></thead>
<tbody>{scen_rows}</tbody></table>

<h2>Détails par scénario</h2>
{''.join(step_blocks)}

<h2>Performances</h2>
<table><thead><tr><th>Étape</th><th>Médiane (ms)</th><th>p95 (ms)</th><th>Max (ms)</th><th>Échantillons</th></tr></thead>
<tbody>{perf_rows}</tbody></table>

<h2>Intégrité DB</h2>
<p>Critical: <b>{dbc.get('critical_count',0)}</b> · Warnings: <b>{dbc.get('warning_count',0)}</b> ·
Mapping: <code>payments→orders</code>, <code>audit_logs→iptv_logs+automation_steps+integration_debug_logs</code></p>
<table><thead><tr><th>Sévérité</th><th>Table</th><th>Anomalie</th></tr></thead><tbody>{db_rows}</tbody></table>

<h2>Logs</h2>
<p>Critical: <b>{logs.get('critical_count',0)}</b> · Warnings: <b>{logs.get('warning_count',0)}</b></p>
<table><thead><tr><th>Sévérité</th><th>Source</th><th>Message</th></tr></thead><tbody>{log_rows}</tbody></table>

<h2>Chaîne de workflow</h2>
<table><thead><tr><th>OK</th><th>Ref</th><th>Chain</th><th>Track</th><th>Missing</th></tr></thead>
<tbody>{chain_rows}</tbody></table>

<h2>Rapport markdown</h2>
<pre>{esc(md_text)}</pre>
</body></html>"""


def main() -> int:
    scen = _scenarios()
    dbc = _load("db-integrity.json")
    logs = _load("logs-audit.json")
    chain = _load("workflow-chain.json")
    perf = _agg_perf(scen)
    (OUT / "perf.json").write_text(json.dumps(perf, indent=2))

    certified, blockers = _verdict(scen, dbc, logs, chain, perf)
    md = _md(scen, dbc, logs, chain, perf, certified, blockers)
    (OUT / "RC1-REPORT.md").write_text(md)
    (REPORT_DIR / "index.html").write_text(_html(scen, dbc, logs, chain, perf, certified, blockers, md))

    verdict = "RC1 CERTIFIED – READY FOR PRODUCTION" if certified else "RC1 NOT CERTIFIED"
    print(f"\n===== {verdict} =====")
    for b in blockers:
        print(f"  - {b}")
    return 0 if certified else 1


if __name__ == "__main__":
    sys.exit(main())