"""Server-only adaptation of the existing checkup rules and PDF renderer."""
from __future__ import annotations

from html import escape
from io import BytesIO
import json
from pathlib import Path
import threading

QUESTIONS_PATH = Path(__file__).with_name("questions.json")
DEFINITIONS = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))["definitions"]
QUESTION_IDS = {item["id"] for item in DEFINITIONS}
_FONT_LOCK = threading.Lock()


class AnswerError(ValueError):
    pass


def validate_answers(answers, notes):
    if not isinstance(answers, dict) or set(answers) != QUESTION_IDS:
        raise AnswerError("Choose one valid answer for each of the ten questions.")
    if not isinstance(notes, dict) or not set(notes).issubset(QUESTION_IDS):
        raise AnswerError("Notes must belong to the ten questions.")
    normalized_notes = {}
    for item in DEFINITIONS:
        value = answers[item["id"]]
        if not isinstance(value, str) or value not in item["values"] + ["unknown", "na"]:
            raise AnswerError("Choose one valid answer for each of the ten questions.")
        note = notes.get(item["id"], "")
        if not isinstance(note, str):
            raise AnswerError("Notes must be text.")
        try:
            size = len(note.encode("utf-16-le")) // 2
        except UnicodeError:
            raise AnswerError("Notes contain unsupported text.") from None
        if size > 600 or any(ord(c) < 32 and c not in "\r\n\t" for c in note):
            raise AnswerError("Each note must be at most 600 characters without control characters.")
        normalized_notes[item["id"]] = note
    return dict(answers), normalized_notes


def build_report(answers, notes):
    answers, notes = validate_answers(answers, notes)
    report = {"version": "2.0-email", "strengths": [], "unknowns": [], "priorities": [],
              "discussionQuestions": [], "answerSummary": []}
    for item in DEFINITIONS:
        value = answers[item["id"]]
        label = ("I am not sure / I need to check." if value == "unknown" else
                 "This does not apply to our current business." if value == "na" else
                 item["labels"][item["values"].index(value)])
        report["answerSummary"].append({"id": item["id"], "title": item["title"],
                                        "answer": label, "note": notes[item["id"]]})
        if value == "unknown":
            report["unknowns"].append(item["title"] + " — not yet established from your answer. " + item["unknown"])
        elif value == item["values"][0]:
            report["strengths"].append(item["strength"])
        elif value != "na" and len(report["priorities"]) < 3:
            report["priorities"].append({"title": item["priority"]["title"], "current": "You selected: " + label,
                                         "ideal": item["priority"]["ideal"], "action": item["priority"]["action"]})
            report["discussionQuestions"].append(item["discussion"])
    if not report["discussionQuestions"]:
        report["discussionQuestions"].append(
            "Which unknown can you clarify from an existing customer, order or review record first?" if report["unknowns"] else
            "Which recent customer or order record would help confirm these practices?" if report["strengths"] else
            "Which of these topics might become relevant at your next business stage?")
    return report


def coverage(answers):
    unknowns = sum(value == "unknown" for value in answers.values())
    return {"answered": len(answers), "unknowns": unknowns,
            "message": "Your ten answers are ready for review. The complete report includes your stated practices, information to check, and up to three priorities in question order."}


def render_pdf(report):
    # This import is lazy so an unavailable PDF dependency disables checkout
    # gracefully rather than breaking the public questionnaire/configuration.
    import reportlab
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    with _FONT_LOCK:
        if "CheckupVera" not in pdfmetrics.getRegisteredFontNames():
            fonts = Path(reportlab.__file__).parent / "fonts"
            pdfmetrics.registerFont(TTFont("CheckupVera", str(fonts / "Vera.ttf")))
            pdfmetrics.registerFont(TTFont("CheckupVeraBold", str(fonts / "VeraBd.ttf")))
    styles = getSampleStyleSheet()
    normal = ParagraphStyle("CheckupBody", fontName="CheckupVera", fontSize=9.4, leading=14,
                            spaceAfter=7, alignment=TA_LEFT, textColor=colors.HexColor("#182234"))
    heading = ParagraphStyle("CheckupHeading", parent=normal, fontName="CheckupVeraBold", fontSize=13,
                             leading=18, spaceBefore=12, spaceAfter=8)
    title = ParagraphStyle("CheckupTitle", parent=heading, fontSize=21, leading=26)
    story = []
    def paragraph(text, style=normal):
        story.append(Paragraph(escape(str(text)).replace("\n", "<br/>"), style))
    paragraph("Your marketing checkup", title)
    paragraph("ConsoliData · Personalized from your selected answers")
    paragraph("This report uses fixed rules and self-reported choices. Notes are included as written and do not change findings. It does not audit accounts, verify records, estimate profit, or establish what caused a campaign result.")
    for name, values in [("Practices you describe", report["strengths"]), ("Unknowns to clarify", report["unknowns"])]:
        paragraph(name, heading)
        if values:
            for value in values:
                paragraph("• " + value)
        else:
            paragraph("No items in this category were established from the selected answers.")
    paragraph("Focused priorities: up to three, in question order", heading)
    paragraph("These are the first applicable improvement topics in questionnaire order, not a measured ranking of the causes of your marketing results.")
    for index, item in enumerate(report["priorities"], 1):
        paragraph(f"{index}. {item['title']}", heading)
        for label, key in [("Current description", "current"), ("Useful next state", "ideal"), ("One next action", "action")]:
            paragraph(label + ": " + item[key])
    if not report["priorities"]:
        paragraph("No improvement topic was established from the selected answers. Check the unknowns and a real customer or order record before deciding your next step.")
    paragraph("Questions for your next review", heading)
    for value in report["discussionQuestions"]:
        paragraph("• " + value)
    paragraph("Your complete answer record", heading)
    for index, item in enumerate(report["answerSummary"], 1):
        paragraph(f"{index}. {item['title']}", heading)
        paragraph(item["answer"])
        if item["note"]:
            paragraph("Your note: " + item["note"])
    story.append(Spacer(1, 0.12 * inch))
    paragraph("ConsoliData · Keep this email and its attached report. For help with this report, reply to the delivery email.")
    output = BytesIO()
    document = SimpleDocTemplate(output, pagesize=(612, 792), rightMargin=48, leftMargin=48,
                                  topMargin=44, bottomMargin=44, title="ConsoliData Marketing Checkup", author="ConsoliData")
    document.build(story)
    return output.getvalue()


def pdf_available():
    try:
        import importlib.util
        return importlib.util.find_spec("reportlab") is not None
    except (ImportError, ValueError):
        return False
