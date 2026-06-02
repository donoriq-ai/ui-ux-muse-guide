"""
AnthropicEvaluator — real Claude evaluation against encoded YAML rules.
Claude matches extracted fields against pre-encoded criteria.
It never free-reads standards or invents citations — those come from the YAML.
Temperature <= 0.2, structured JSON output validated to RuleFinding[].
"""
import json
import logging
from datetime import UTC, datetime
from pathlib import Path

import yaml

from app.adapters.evaluation.base import RuleEvaluator
from app.core.config import settings

logger = logging.getLogger(__name__)

_RULES_ROOT = Path(__file__).parent.parent.parent.parent / "rules"
# Load rules from legacy bt_ms dir plus tissue-specific bt/ and ms/ directories.
_RULES_DIRS = [
    _RULES_ROOT / "bt_ms",
    _RULES_ROOT / "bt",
    _RULES_ROOT / "ms",
]

_SYSTEM_PROMPT = """\
You are a tissue-bank donor eligibility rule evaluator operating under HIPAA and 21 CFR Part 11.
You receive extracted donor fields and a set of pre-encoded eligibility rules.
Your job: evaluate each rule against the provided field values and produce one structured finding per rule.

━━ CRITICAL CONSTRAINTS (non-negotiable) ━━

1. THREE-STATE OUTPUT ONLY
   Each finding's "state" must be EXACTLY one of:
   • "ACCEPT"        — all rule criteria are met by the extracted values
   • "REJECT"        — one or more hard criteria are violated by confirmed extracted values
   • "INDETERMINATE" — a required field is null/missing, confidence is too low, or the data
                       is insufficient to confirm acceptance or rejection

2. MISSING DATA → INDETERMINATE (never silent REJECT)
   If a required input field value is null, absent, or has on_missing="INDETERMINATE" →
   state MUST be "INDETERMINATE". Do not assume a missing value means rejection.

3. CITATIONS: ONLY FROM THE RULE — NEVER FABRICATED
   The "ruleCitation" object must contain ONLY the aatb[] and cfr[] values from the rule's
   citations field. Do not invent section numbers, add new citations, or modify any citation.

4. REASONING: YOUR OWN WORDS ONLY
   Write the "reasoning" string in your own words explaining why the state was assigned.
   NEVER reproduce, quote, or paraphrase copyrighted AATB Standards text.
   Reference only section numbers (e.g. "AATB §H12.600") not the text.

5. RULE-BY-RULE EVALUATION
   Evaluate each rule independently. Do not let one rule's finding influence another's logic.
   Apply only the logic described in that rule's "logic" field. Do not modify thresholds.

6. DECISION SUPPORT ONLY
   Never state or imply that this system makes the final eligibility determination.
   The Medical Director makes the final determination off-system.

7. NO NEW RULES OR CRITERIA
   Do not invent rules, add criteria not in the rule logic, or evaluate topics not covered
   by a rule in the provided set.

━━ SEVERITY GUIDANCE ━━
• HARD: If criteria violated → state = "REJECT" (not INDETERMINATE)
• GATE: If documentation missing/insufficient → state = "INDETERMINATE"
• COND: Conditional; evaluate the specific condition in the logic field

━━ OUTPUT FORMAT ━━
Output ONLY a valid JSON array — no markdown fences, no prose before or after.
"""


def _load_rules(tissue_type: str) -> list[dict]:
    """Load all rules that apply to the given tissue type from all rule directories."""
    seen_ids: set[str] = set()
    rules: list[dict] = []
    for rules_dir in _RULES_DIRS:
        if not rules_dir.exists():
            continue
        for path in sorted(rules_dir.glob("*.yaml")):
            data = yaml.safe_load(path.read_text())
            rule_id = data.get("id", "")
            if tissue_type in data.get("applies", []) and rule_id not in seen_ids:
                seen_ids.add(rule_id)
                rules.append(data)
    return rules


def _build_rule_block(rules: list[dict]) -> str:
    """Serialize rules for the static cached block."""
    return json.dumps(rules, indent=2)


def _build_user_prompt(rules: list[dict], fields: list[dict]) -> str:
    fields_section = json.dumps(
        [{"key": f["key"], "value": f["value"], "confidence": f["confidence"]} for f in fields],
        indent=2,
    )
    rules_section = _build_rule_block(rules)

    return f"""\
══ ENCODED RULES (evaluate ONLY these — do not invent new criteria or modify thresholds) ══
{rules_section}

══ EXTRACTED DONOR FIELDS (from document extraction pipeline) ══
{fields_section}

══ EVALUATION TASK ══
For each rule above, produce exactly one finding. Evaluate each rule independently.

For each rule:
1. Look up the field(s) listed in the rule's "inputs" array by their "key".
2. Check the field value against the rule's "logic".
3. If any required field value is null → state = "INDETERMINATE" (per on_missing).
4. If a HARD rule's reject criteria are met by confirmed non-null values → state = "REJECT".
5. If a GATE rule's required documentation is missing → state = "INDETERMINATE".
6. If all criteria pass → state = "ACCEPT".

Return a single JSON array with one object per rule. No other text.
Required shape:
[
  {{
    "criterionId": "<rule id exactly as given>",
    "title": "<rule title exactly as given>",
    "state": "ACCEPT" | "REJECT" | "INDETERMINATE",
    "severity": "<rule severity>",
    "inputs": [
      {{
        "label": "<input label from rule inputs>",
        "value": "<extracted field value or null>",
        "sourceCitation": null
      }}
    ],
    "ruleCitation": {{
      "aatb": ["<copy citations.aatb values from rule exactly>"],
      "cfr": ["<copy citations.cfr values from rule exactly>"]
    }},
    "reasoning": "<your explanation in your own words — no copyrighted text, section numbers only>"
  }}
]
"""


class AnthropicEvaluator(RuleEvaluator):
    def __init__(self) -> None:
        import anthropic
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def evaluate(self, tissue_type: str, extracted_fields: list[dict], ruleset_version: str) -> dict:
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, self._sync_evaluate, tissue_type, extracted_fields, ruleset_version
        )

    def _sync_evaluate(self, tissue_type: str, extracted_fields: list[dict], ruleset_version: str) -> dict:
        rules = _load_rules(tissue_type)
        if not rules:
            raise ValueError(f"No rules found for tissue type {tissue_type}")

        fields_map = {f["key"]: f for f in extracted_fields}
        prompt = _build_user_prompt(rules, extracted_fields)

        logger.info(
            "anthropic_eval: evaluating tissue_type=%s rules=%d fields=%d model=%s ruleset=%s",
            tissue_type, len(rules), len(extracted_fields), settings.anthropic_model, ruleset_version,
        )

        response = self._client.messages.create(
            model=settings.anthropic_model,
            max_tokens=8192,
            temperature=settings.anthropic_temperature,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            lines = raw.split("\n")
            # Drop opening fence line (```json or ```) and closing ```
            inner_lines = [ln for ln in lines[1:] if not ln.strip().startswith("```")]
            raw = "\n".join(inner_lines).strip()

        # Extract just the JSON array — Claude occasionally emits trailing prose after the array.
        # raw_decode() stops exactly at the end of the first complete JSON value,
        # ignoring any trailing text (even if that text contains ']' characters).
        start = raw.find("[")
        if start == -1:
            logger.error("anthropic_eval: no JSON array found in output — raw output: %.500s", raw)
            raise ValueError("Claude response contains no JSON array")

        try:
            findings, _ = json.JSONDecoder().raw_decode(raw, start)
        except json.JSONDecodeError as e:
            logger.error("anthropic_eval: JSON parse failed: %s — raw output: %.500s", e, raw)
            raise ValueError(f"Claude returned invalid JSON: {e}") from e

        if not isinstance(findings, list):
            logger.error("anthropic_eval: expected list of findings, got %s", type(findings).__name__)
            raise ValueError("Claude response must be a JSON array of findings")

        # Validate each finding has required fields before persisting (21 CFR Part 11 integrity).
        _VALID_STATES = {"ACCEPT", "REJECT", "INDETERMINATE"}
        rule_ids = {r["id"] for r in rules}
        for i, finding in enumerate(findings):
            if not isinstance(finding, dict):
                raise ValueError(f"Finding[{i}] is not an object")
            if finding.get("state") not in _VALID_STATES:
                raise ValueError(f"Finding[{i}] has invalid state: {finding.get('state')!r}")
            cid = finding.get("criterionId", "")
            if cid not in rule_ids:
                logger.warning("anthropic_eval: finding criterionId=%r not in loaded rules — keeping", cid)

        # Attach source citations from extracted fields (citations come from Reducto, not Claude).
        # Match by rule input key (authoritative), not by Claude's echoed label string, which
        # may not survive the round-trip intact (e.g. "HIV-1/2 Result" -> "hiv-1/2_result" != "hiv_result").
        rules_by_id = {r["id"]: r for r in rules}
        for finding in findings:
            rule = rules_by_id.get(finding.get("criterionId", ""), {})
            rule_inputs_by_label = {ri["label"]: ri["key"] for ri in rule.get("inputs", [])}
            for inp in finding.get("inputs", []):
                field_key = rule_inputs_by_label.get(inp.get("label", ""))
                if field_key:
                    field = fields_map.get(field_key)
                    if field and field.get("citation"):
                        inp["sourceCitation"] = field["citation"]

        # Compute overall recommendation — never trust Claude's summary; derive it ourselves
        overall = "ACCEPT"
        completeness_items = []
        for finding in findings:
            state = finding["state"]
            severity = finding["severity"]
            if state == "REJECT" and severity == "HARD":
                overall = "REJECT"
            elif state == "INDETERMINATE" and overall != "REJECT":
                overall = "INDETERMINATE"

            # A requirement is only "missing" when the finding is INDETERMINATE — meaning
            # required data was absent or insufficient to resolve it. ACCEPT and REJECT both
            # mean the rule was fully evaluated (null inputs can still produce ACCEPT when
            # the rule logic is conditional on those values).
            completeness_items.append({
                "requirement": finding["title"],
                "status": "missing" if state == "INDETERMINATE" else "present",
            })

        completeness_state = (
            "COMPLETE"
            if all(i["status"] == "present" for i in completeness_items)
            else "INCOMPLETE"
        )

        return {
            "completeness": {"state": completeness_state, "items": completeness_items},
            "recommendation": overall,
            "findings": findings,
            "rulesetVersion": ruleset_version,
            "evaluatedAt": datetime.now(UTC).isoformat(),
        }
