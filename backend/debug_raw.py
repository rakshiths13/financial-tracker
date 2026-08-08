"""Extract raw text from the HDFC PDFs."""
import pdfplumber
import os

upload_dir = "storage/uploads"
for root, dirs, files in os.walk(upload_dir):
    for f in files:
        if "HDFC" in f and f.endswith(".pdf"):
            path = os.path.join(root, f)
            print(f"\n{'='*80}")
            print(f"FILE: {f}")
            print(f"{'='*80}")
            try:
                with pdfplumber.open(path) as pdf:
                    for i, page in enumerate(pdf.pages[:2]):
                        text = page.extract_text()
                        print(f"\n--- Page {i+1} text ---")
                        if text:
                            for line in text.split('\n')[:40]:
                                print(f"  {line}")
                        
                        table = page.extract_table()
                        if table:
                            print(f"\n--- Page {i+1} table (first 12 rows) ---")
                            for row_idx, row in enumerate(table[:12]):
                                print(f"  Row {row_idx}: {row}")
                        else:
                            print(f"\n--- Page {i+1}: NO TABLE found ---")
            except Exception as e:
                print(f"Error: {e}")
