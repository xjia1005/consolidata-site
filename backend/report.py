"""Private initial growth review: answers, alternatives and one next check."""
from __future__ import annotations

from html import escape
from io import BytesIO
import hashlib
import json
from pathlib import Path
import threading

QUESTIONS_PATH = Path(__file__).with_name("questions.json")
BANK = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
BANK_HASH = hashlib.sha256(json.dumps(BANK, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
DEFINITIONS = BANK["questions"]
QUESTION_IDS = {q["id"] for q in DEFINITIONS}
MAX_ANSWER_CHARACTERS = 1500
_FONT_LOCK = threading.Lock()


class AnswerError(ValueError):
    pass


def _safe_text(value, maximum, name, utf16=False):
    if not isinstance(value, str):
        raise AnswerError(name + " must be text.")
    try:
        size = len(value.encode("utf-16-le")) // 2 if utf16 else len(value)
        value.encode("utf-8")
    except UnicodeError:
        raise AnswerError(name + " contains unsupported text.") from None
    if size > maximum or any((ord(c) < 32 and c not in "\r\n\t") or ord(c) == 127 for c in value):
        raise AnswerError(f"{name} must be at most {maximum} characters without control characters.")
    return value


def validate_answers(answers, notes):
    if not isinstance(answers, dict) or set(answers) != QUESTION_IDS:
        raise AnswerError("Answer or explicitly defer each of the 30 questions.")
    if not isinstance(notes, dict) or not set(notes).issubset(QUESTION_IDS):
        raise AnswerError("Notes must belong to the 30 questions.")
    normalized, normalized_notes = {}, {}
    for q in DEFINITIONS:
        value = answers[q["id"]]
        if q["answer_type"] == "text":
            normalized[q["id"]] = _safe_text(value, MAX_ANSWER_CHARACTERS, "Answer").strip()
        else:
            allowed = {o["value"] for o in q["options"]}
            if (not isinstance(value, list) or len(value) > len(allowed)
                    or any(not isinstance(v, str) or v not in allowed for v in value)
                    or len(set(value)) != len(value)):
                raise AnswerError("Select distinct listed options for " + q["id"] + ".")
            normalized[q["id"]] = list(value)
        normalized_notes[q["id"]] = _safe_text(notes.get(q["id"], ""), 600, "Note", utf16=True)
    return normalized, normalized_notes


def _unknown(value):
    return not value or isinstance(value, str) and value.strip().lower() in {
        "unknown", "unknown / deferred", "not sure", "i don't know", "i do not know", "n/a", "na"}


def selected_branches(answers):
    branches = []
    for q in DEFINITIONS:
        if q["id"] not in {"C04", "C06"}:
            continue
        for option in q["options"]:
            if option["value"] in answers[q["id"]]:
                branches.extend(option.get("route_to", []))
    if not answers["C04"] or not answers["C06"] or set(answers["C06"]) == {"self_report"}:
        branches.append("evidence")
    return list(dict.fromkeys(branches))


def _label(q, value):
    if isinstance(value, list):
        labels = {o["value"]: o["label_en"] for o in q["options"]}
        return "; ".join(labels[v] for v in value) or "Unknown / deferred"
    return value or "Unknown / deferred"


def _next_check_worksheet(answers, rows):
    by_id = {row["id"]: row for row in rows}
    source_labels = {
        "C01": "Decision and desired outcome",
        "C02": "Customer and task",
        "C05": "Reported shortfall and comparison",
        "E01": "Proposed measurement and comparison",
        "E03": "What would make you reconsider",
        "E04": "Your proposed next check",
    }
    return {
        "submitted_context": [
            {"question_id": qid, "label": label, "answer": by_id[qid]["answer"],
             "note": by_id[qid]["note"], "verification": "unverified",
             "unknown": _unknown(answers[qid]),
             "role": "respondent_proposal" if qid == "E04" else "self_report"}
            for qid, label in source_labels.items()
        ],
        "planning_fields": [
            {"id": key, "label": label, "value": None, "status": "to_agree"}
            for key, label in (
                ("owner", "Decision owner and person carrying out the check"),
                ("alternatives", "Specific competing explanations and the observation that separates them"),
                ("source", "Permitted source or consented participants"),
                ("group_window", "Customer group, observation period and consistent comparison"),
                ("cost", "Time and cost cap"),
                ("stop", "Stopping condition and protection against unacceptable harm"),
            )
        ],
        "result_rules": [
            {"id": "supports", "label": "Supports an explanation",
             "prompt": "Specify the observation that would make one explanation more credible than its alternatives, and the bounded action it would justify."},
            {"id": "weakens", "label": "Weakens an explanation",
             "prompt": "Specify a contrary observation that would make you reconsider the explanation. Check that the test could detect the relevant difference before ruling anything out."},
            {"id": "inconclusive", "label": "Leaves the decision unresolved",
             "prompt": "Specify when missing, mixed or insufficient evidence means you should revise the check or gather more information instead of declaring a winner."},
        ],
    }


def build_report(answers, notes):
    answers, notes = validate_answers(answers, notes)
    branches = selected_branches(answers)
    rows = [{"id": q["id"], "title": q["prompt_en"], "answer": _label(q, answers[q["id"]]),
             "note": notes[q["id"]], "source_type": "self_report", "verification": "unverified"}
            for q in DEFINITIONS]
    areas = [{"id": b, "label": BANK["branches"][b]["label_en"],
              "explanations": BANK["branches"][b]["competing_explanations"],
              "evidence_actions": BANK["branches"][b]["evidence_actions"],
              "possible_handoffs": BANK["branches"][b]["possible_handoffs"]}
             for b in branches]
    # A selected stage proposes an investigation; it is not a proven cause.
    chosen = "evidence" if "evidence" in branches else branches[0]
    return {
        "version": "3.1-growth", "question_bank_hash": BANK_HASH,
        "method": "code_assembled_initial_assessment", "priority_status": "insufficient_evidence",
        "context": [{"question_id": row["id"], "prompt": row["title"], **{k: row[k] for k in ("answer", "note", "source_type", "verification")}}
                    for row in rows if row["id"] in BANK["core_question_ids"]],
        "candidateAreas": areas,
        "valueReview": [{"id": key, "label": lens["label_en"], "question": lens["review_question_en"],
                         "answer_ids": [q["id"] for q in DEFINITIONS if key in q["value_dimensions"]]}
                        for key, lens in BANK["value_dimensions"].items()],
        "nextCheck": {"title": "Agree one bounded evidence check",
                      "detail": BANK["branches"][chosen]["evidence_actions"][0],
                      "conditions": "Agree the decision owner, customer group, observation period, permitted source, time and cost cap, and stopping condition before acting. Decide what result would support, weaken or leave each explanation unresolved. An unsuccessful or ambiguous check does not automatically rule out a cause.",
                      "selection_basis": "This check follows the evidence gap or reported stage you selected. Its order is not a measured ranking of your company's constraints.",
                      "worksheet": _next_check_worksheet(answers, rows)},
        "limitations": [
            "Your answers and notes describe your current understanding. No underlying records, customer accounts or financial results have been independently checked.",
            "The report uses explicit question-bank rules. Free-text answers are preserved as context; they are not interpreted by an external model or used to establish causes.",
            "Several explanations may interact. Product-market fit, one decisive constraint, growth improvement, a higher selling price and profit are not established by this questionnaire.",
            "Marketing, product, sales, onboarding, delivery or specialist work may be appropriate. Further records, interviews or tests require separate scope and permission.",
            "Four value questions guide the customer's experience. Actual delivery capability, exposure, measurement quality and full business costs still need checking.",
            "An initial assessment can identify a useful next investigation while leaving the root cause unresolved. No campaign, interview or other intervention has been launched by this report."],
        "answerSummary": rows,
    }


def coverage(answers):
    unknowns = sum(_unknown(v) or isinstance(v, list) and "unknown" in v for v in answers.values())
    return {"answered": len(answers), "unknowns": unknowns,
            "message": "Your 30 answers are saved. The initial report preserves your context, compares plausible explanations, reviews four customer-value questions and proposes one next evidence check. It does not establish a unique growth constraint."}


def render_pdf(report):
    import reportlab
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    with _FONT_LOCK:
        if "CheckupVera" not in pdfmetrics.getRegisteredFontNames():
            fonts = Path(reportlab.__file__).parent / "fonts"
            pdfmetrics.registerFont(TTFont("CheckupVera", str(fonts / "Vera.ttf")))
            pdfmetrics.registerFont(TTFont("CheckupVeraBold", str(fonts / "VeraBd.ttf")))
        if "STSong-Light" not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    body = ParagraphStyle("GrowthBody", fontName="CheckupVera", fontSize=11, leading=16.5,
                          spaceAfter=8, textColor=colors.HexColor("#202b30"), splitLongWords=True)
    heading = ParagraphStyle("GrowthHeading", parent=body, fontName="CheckupVeraBold", fontSize=14,
                             leading=19, spaceBefore=12, spaceAfter=8, keepWithNext=True)
    title = ParagraphStyle("GrowthTitle", parent=heading, fontSize=22, leading=28)
    cjk = ParagraphStyle("GrowthCJK", parent=body, fontName="STSong-Light", wordWrap="CJK")
    story = []

    def paragraph(value, style=body):
        value = "".join(c if ord(c) <= 0xFFFF else f"[U+{ord(c):X}]" for c in str(value))
        selected = cjk if any("\u3400" <= c <= "\u9fff" for c in value) and style is body else style
        story.append(Paragraph(escape(value).replace("\n", "<br/>"), selected))

    paragraph("Your growth decision assessment", title)
    paragraph("ConsoliData · Initial review from your submitted answers")
    paragraph("Use this report to describe the decision, examine alternatives and agree the next check. The information is self-reported; the most important cause has not yet been established.")
    paragraph("Your next-check worksheet", heading)
    paragraph("The statements below are your submitted account, without independent verification. Your proposed check is a starting proposal; it has not been validated or approved by an analyst. Use the blank planning fields to agree a safe, discriminating check before spending money or contacting anyone.")
    worksheet = report["nextCheck"]["worksheet"]
    for row in worksheet["submitted_context"]:
        paragraph(row["question_id"] + " — " + row["label"], heading)
        paragraph("Proposal still needed" if row["unknown"] and row["question_id"] == "E04" else row["answer"])
        if row["note"]:
            paragraph("Your additional context: " + row["note"])
    paragraph("To agree before acting", heading)
    for field in worksheet["planning_fields"]:
        paragraph(field["label"] + ": [to agree]")
    paragraph("Define how you will read the result", heading)
    for rule in worksheet["result_rules"]:
        paragraph(rule["label"] + ": " + rule["prompt"])
    paragraph("Plausible explanations to examine", heading)
    paragraph("These areas follow your selected symptoms and evidence gaps. Their sequence does not rank causes. Compare the alternatives with records or observation before committing resources.")
    for area in report["candidateAreas"]:
        paragraph(area["label"], heading)
        for item in area["explanations"]:
            paragraph("• " + item)
        paragraph("Evidence checks: " + " ".join(area["evidence_actions"]))
        paragraph("Possible responsible teams: " + "; ".join(area["possible_handoffs"]))
    paragraph("One proposed next check", heading)
    paragraph("Question-bank starting point, based on the selected stage. Compare it with your own proposal above; its position does not establish priority.")
    for key in ("detail", "conditions", "selection_basis"):
        paragraph(report["nextCheck"][key])
    paragraph("Review the customer's experience in four directions", heading)
    for lens in report["valueReview"]:
        paragraph(lens["label"], heading)
        paragraph(lens["question"])
        paragraph("Relevant saved questions: " + ", ".join(lens["answer_ids"]))
    paragraph("Evidence and interpretation limits", heading)
    for item in report["limitations"]:
        paragraph("• " + item)
    paragraph("Complete 30-question answer record", heading)
    for row in report["answerSummary"]:
        paragraph(row["id"] + " — " + row["title"], heading)
        paragraph(row["answer"])
        if row["note"]:
            paragraph("Your additional context: " + row["note"])
    story.append(Spacer(1, 12))
    paragraph("Source: submitted answers and notes, without independent verification. Pictographic characters may appear as Unicode codepoint labels; original answers remain in the private assessment record.")
    paragraph("Method: initial question-bank review · " + report["version"] + " · source hash " + report["question_bank_hash"])
    paragraph("Keep this email and its report attachment. Reply to the delivery email for help with this report. Further research or marketing work requires a separate agreement.")
    output = BytesIO()
    document = SimpleDocTemplate(output, pagesize=(612, 792), rightMargin=48, leftMargin=48,
                                 topMargin=44, bottomMargin=44, title="ConsoliData Growth Decision Assessment", author="ConsoliData")
    document.build(story)
    return output.getvalue()


def pdf_available():
    try:
        import importlib.util
        return importlib.util.find_spec("reportlab") is not None
    except (ImportError, ValueError):
        return False
