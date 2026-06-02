# Fixtures

Synthetic test artifacts used for local development and testing.
**Never place real PHI here.**

## synthetic_donor_packet.pdf

A synthetic, non-PHI PDF representing a combined donor document packet.
Used to test the Reducto extraction pipeline (Phase 2 — real keys required).

To generate a minimal test PDF (requires Python + fpdf2):

```bash
pip install fpdf2
python generate_test_pdf.py
```

Or simply upload any plain PDF through the UI once the backend is running.
The stub extractor works without any file content.
