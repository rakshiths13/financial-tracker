import pdfplumber
import camelot
from datetime import datetime
import re

def parse_date(date_str):
    """Normalize date to DD/MM/YYYY"""
    try:
        # Try some common formats
        formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%b-%Y", "%d %b %Y", "%m/%d/%Y"]
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                return dt.date()
            except ValueError:
                continue
        # Fallback regex if explicit formats fail
        match = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', date_str)
        if match:
             return datetime.strptime(match.group(0), "%d/%m/%Y").date()
    except Exception:
        pass
    return None

def parse_amount(amount_str):
    if not amount_str:
        return 0.0
    amount_str = amount_str.replace(",", "").strip()
    try:
        return float(amount_str)
    except ValueError:
        return 0.0

def categorize_transaction(description):
    desc = description.lower()
    if any(word in desc for word in ["amazon", "flipkart", "swiggy", "zomato", "grocery", "supermarket"]):
        return "Shopping & Food"
    if any(word in desc for word in ["uber", "ola", "irctc", "petrol", "fuel"]):
        return "Transportation"
    if any(word in desc for word in ["salary", "neft", "imps", "upi/cred"]):
         return "Income/Transfers"
    if any(word in desc for word in ["netflix", "spotify", "prime", "movie", "cinema"]):
        return "Entertainment"
    if any(word in desc for word in ["hospital", "pharmacy", "medical", "clinic"]):
        return "Health"
    return "Others"

def parse_hdfc_format(filepath):
    # Mock HDFC structural parsing
    transactions = []
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                for row in table[1:]: # Skip header
                    if len(row) >= 6:
                        date_str = row[0]
                        desc = row[1]
                        debit = parse_amount(row[3])
                        credit = parse_amount(row[4])

                        dt = parse_date(date_str)
                        if dt and (debit > 0 or credit > 0):
                            t_type = "CREDIT" if credit > 0 else "DEBIT"
                            amt = credit if credit > 0 else debit
                            transactions.append({
                                "date": dt,
                                "description": desc.replace("\n", " ") if desc else "Unknown",
                                "amount": amt,
                                "type": t_type,
                                "category": categorize_transaction(desc) if desc else "Others"
                            })
    return transactions

def parse_sbi_format(filepath):
    # Mock SBI structural parsing fallback
    transactions = []
    try:
        tables = camelot.read_pdf(filepath, pages='all', flavor='stream')
        for table in tables:
            df = table.df
            for index, row in df.iterrows():
                if index == 0: continue
                if len(row) >= 5:
                    date_str = str(row[0])
                    desc = str(row[1])
                    debit = parse_amount(str(row[2]))
                    credit = parse_amount(str(row[3]))

                    dt = parse_date(date_str)
                    if dt and (debit > 0 or credit > 0):
                        t_type = "CREDIT" if credit > 0 else "DEBIT"
                        amt = credit if credit > 0 else debit
                        transactions.append({
                            "date": dt,
                            "description": desc.replace("\n", " "),
                            "amount": amt,
                            "type": t_type,
                            "category": categorize_transaction(desc)
                        })
    except Exception as e:
        print(f"Camelot parsing failed: {e}")
    return transactions

def parse_generic_format(filepath):
    # Fallback generic parsing
    transactions = []
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                lines = text.split('\n')
                for line in lines:
                    # Look for lines starting with a date
                    if re.match(r'^\d{2}[-/]\d{2}[-/]\d{4}', line):
                        parts = line.split()
                        date_str = parts[0]

                        # Try to find amounts at the end
                        amounts = re.findall(r'[\d,]+\.\d{2}', line)

                        if amounts:
                             dt = parse_date(date_str)
                             if dt:
                                 amt = parse_amount(amounts[-1])
                                 desc = " ".join(parts[1:-len(amounts)])
                                 transactions.append({
                                     "date": dt,
                                     "description": desc,
                                     "amount": amt,
                                     "type": "DEBIT", # Assume debit for simplicity if we can't tell
                                     "category": categorize_transaction(desc)
                                 })
    return transactions


def parse_pdf_statement(filepath: str):
    """Attempt to parse PDF using different format strategies."""

    # Try HDFC Format
    transactions = parse_hdfc_format(filepath)
    if len(transactions) > 0:
        return transactions

    # Try SBI Format (using camelot)
    transactions = parse_sbi_format(filepath)
    if len(transactions) > 0:
        return transactions

    # Fallback Generic Format
    transactions = parse_generic_format(filepath)
    return transactions
