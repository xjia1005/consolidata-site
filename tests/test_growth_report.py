"""Original-source/unknown/alternative/private-document evidence checks."""
from io import BytesIO
import json
import unittest
from pypdf import PdfReader
from backend.report import AnswerError, BANK, BANK_HASH, DEFINITIONS, build_report, coverage, render_pdf, validate_answers


def answers():
    return {q["id"]: ("Unknown / deferred" if q["answer_type"] == "text" else ["unknown"]) for q in DEFINITIONS}


class GrowthReportTests(unittest.TestCase):
    def test_all30_and_four_lenses_preserve_unknowns_and_original_source(self):
        a = answers()
        r = build_report(a, {})
        self.assertEqual(len(r["answerSummary"]), 30)
        self.assertEqual(coverage(a)["unknowns"], 30)
        self.assertEqual({row["id"] for row in r["answerSummary"]}, {q["id"] for q in DEFINITIONS})
        self.assertEqual(len(r["valueReview"]), 4)
        self.assertEqual(r["priority_status"], "insufficient_evidence")
        self.assertEqual(r["question_bank_hash"], BANK_HASH)
        self.assertEqual([area["id"] for area in r["candidateAreas"]], ["evidence"])

    def test_mixed_stages_no_cause_rank_and_nonmarketing_handoffs(self):
        a = answers()
        a.update(C01="FICTIONAL choose a first-use check", C04=["first_value", "retention"], C06=["self_report"])
        r = build_report(a, {"C01": "FICTIONAL additional context"})
        self.assertEqual([area["id"] for area in r["candidateAreas"]], ["first_value", "retention", "evidence"])
        self.assertIn("Product owner", r["candidateAreas"][0]["possible_handoffs"])
        self.assertTrue(all(len(area["explanations"]) >= 2 for area in r["candidateAreas"]))
        self.assertIn("not a measured ranking", r["nextCheck"]["selection_basis"])
        self.assertEqual(r["context"][0]["note"], "FICTIONAL additional context")

    def test_original_answers_and_injection_are_text_in_private_pdf(self):
        a = answers()
        a["C01"] = 'FICTIONAL customer task: <script>do not run</script> & "source"'
        a["C02"] = "FICTIONAL 测试公司工作流程"
        r = build_report(a, {})
        data = render_pdf(r)
        self.assertTrue(data.startswith(b"%PDF"))
        pdf = PdfReader(BytesIO(data))
        text = "\n".join(page.extract_text() for page in pdf.pages)
        self.assertIn("FICTIONAL customer task", text)
        self.assertIn("<script>do not run</script>", text)
        self.assertIn("测试公司工作流程", text)
        self.assertIn("One proposed next check", text)
        self.assertIn("Complete 30-question", text)
        self.assertEqual(r["context"][0]["verification"], "unverified")

    def test_input_boundaries_and_unknown_options(self):
        a = answers()
        for bad in ({**a, "C01": "x" * 1501}, {**a, "C04": ["reach", "reach"]},
                    {**a, "C01": "bad\x7f"}, {**a, "C06": ["fake"]}, {**a, "C01": "\ud800"}):
            with self.assertRaises(AnswerError):
                validate_answers(bad, {})
        a["C01"] = "\U0001f600" * 1500
        self.assertEqual(validate_answers(a, {})[0]["C01"], a["C01"])

    def test_next_check_worksheet_uses_sources_without_inventing_agreement(self):
        a = answers()
        a.update(C01="FICTIONAL decide whether to test first use", C02="FICTIONAL users completing their first task",
                 E03="FICTIONAL reconsider if an observed first task succeeds", E04="FICTIONAL observe one consented first task")
        r = build_report(a, {})
        worksheet = r["nextCheck"]["worksheet"]
        sources = {row["question_id"]: row for row in worksheet["submitted_context"]}
        self.assertEqual(set(sources), {"C01", "C02", "C05", "E01", "E03", "E04"})
        self.assertEqual(sources["E04"]["answer"], a["E04"])
        self.assertEqual(sources["E04"]["role"], "respondent_proposal")
        self.assertTrue(all(row["verification"] == "unverified" for row in sources.values()))
        self.assertTrue(all(row["value"] is None and row["status"] == "to_agree" for row in worksheet["planning_fields"]))
        self.assertEqual({row["id"] for row in worksheet["result_rules"]}, {"supports", "weakens", "inconclusive"})
        self.assertTrue(sources["C05"]["unknown"])
        unknown = build_report(answers(), {})["nextCheck"]["worksheet"]
        self.assertTrue(next(row for row in unknown["submitted_context"] if row["question_id"] == "E04")["unknown"])
        pdf = PdfReader(BytesIO(render_pdf(r)))
        text = "\n".join(page.extract_text() for page in pdf.pages)
        self.assertLess(text.index("Your next-check worksheet"), text.index("Complete 30-question"))
        self.assertIn("FICTIONAL observe one consented first task", text)
        self.assertIn("To agree before acting", text)


if __name__ == "__main__":
    unittest.main()
