"""Inspect what the parser actually extracts from each PDF."""
import sys
sys.path.insert(0, '.')
from app.parsers import parse_pdf_statement, detect_bank, parse_hdfc_format, parse_generic_format
import os

upload_dir = "storage/uploads"
for root, dirs, files in os.walk(upload_dir):
    for f in files:
        if f.endswith(".pdf"):
            path = os.path.join(root, f)
            bank = detect_bank(path)
            print(f"\n{'='*80}")
            print(f"FILE: {f}")
            print(f"DETECTED BANK: {bank}")
            
            txns = parse_pdf_statement(path)
            print(f"TOTAL PARSED: {len(txns)}")
            
            # Category distribution
            cats = {}
            type_counts = {"CREDIT": 0, "DEBIT": 0}
            type_totals = {"CREDIT": 0.0, "DEBIT": 0.0}
            for t in txns:
                cat = t["category"]
                cats[cat] = cats.get(cat, 0) + 1
                type_counts[t["type"]] += 1
                type_totals[t["type"]] += t["amount"]
            
            print(f"CREDITS: {type_counts['CREDIT']} txns, total={type_totals['CREDIT']:.2f}")
            print(f"DEBITS: {type_counts['DEBIT']} txns, total={type_totals['DEBIT']:.2f}")
            print(f"Categories: {cats}")
            
            # Show first 10 transactions
            print(f"\nFirst 10 transactions:")
            for t in txns[:10]:
                desc = t['description'][:60]
                print(f"  {t['date']} [{t['type']}] {t['category']:20s} {t['amount']:>12.2f} {desc}")
            
            # Show any transactions > 50K
            big = [t for t in txns if t["amount"] > 50000]
            if big:
                print(f"\nLarge transactions (>50K):")
                for t in big:
                    desc = t['description'][:60]
                    print(f"  {t['date']} [{t['type']}] {t['amount']:>12.2f} {desc}")
