import pdfplumber
import camelot
from datetime import datetime
import re

# ─── Maximum realistic single transaction amount (₹50L) ──────────────────────
MAX_TRANSACTION_AMOUNT = 5_000_000.0

# ─── Transfer-type constants ──────────────────────────────────────────────────
TRANSFER_NONE = "none"
TRANSFER_INTERNAL = "internal_transfer"
TRANSFER_INCOMING = "incoming_transfer"
TRANSFER_OUTGOING = "outgoing_transfer"
TRANSFER_POSSIBLE = "possible_transfer"


CATEGORY_RULES = {
    "Online Shopping": [
        "amazon", "flipkart", "myntra", "snapdeal", "meesho", "nykaa",
        "ajio", "tatacliq", "shopsy", "jiomart",
    ],
    "Groceries": [
        "bigbasket", "grofers", "blinkit", "zepto", "grocery", "supermarket",
        "reliance fresh", "dmart", "more retail", "nature's basket",
    ],
    "Food & Dining": [
        "swiggy", "zomato", "dunzo", "hotel", "restaurant", "cafe",
        "pizza", "burger", "kfc", "dominos", "mcdonalds", "starbucks",
        "food", "dining", "eatery",
    ],
    "Recharge": [
        "recharge", "airtel", "jio", "vi ", "vodafone", "bsnl",
        "topup", "prepaid",
    ],
    "Bills & Utilities": [
        "electricity", "bescom", "msedcl", "bwssb", "water bill",
        "gas bill", "broadband", "internet", "act fibernet", "hathway",
        "utility", "insurance", "premium", "lic ", "bill payment",
    ],
    "Travel & Transport": [
        "uber", "ola", "rapido", "metro", "irctc", "makemytrip", "goibibo",
        "indigo", "spicejet", "air india", "yatra", "petrol", "fuel",
        "parking", "toll", "cab", "bus", "train",
    ],
    "ATM / Cash": [
        "atm", "cash withdrawal", "atm wdl", "cash wdl",
    ],
    # NOTE: We deliberately do NOT include generic payment rails here
    # (neft, imps, upi, rtgs) — those are transport layers, not categories.
    # Income is only inferred when a credit arrives with explicit salary markers.
}


def categorize_transaction(description: str) -> str:
    desc = description.lower()
    for category, keywords in CATEGORY_RULES.items():
        if any(kw in desc for kw in keywords):
            return category
    return "Others"


def detect_transfer_type(description: str, tx_type: str = "DEBIT") -> str:
    """
    Classify a transaction's transfer nature.

    Returns one of:
      "none"              – regular income/expense
      "internal_transfer" – confident own-account transfer (exclude from KPIs)
      "possible_transfer" – uncertain, flag but don't exclude from spending
      "incoming_transfer" – inbound from external, counts as income
      "outgoing_transfer" – outbound to external, counts as expense

    Philosophy:
    - Payment rails (NEFT/IMPS/UPI/RTGS) alone are NOT proof of transfer.
      Most UPI payments are ordinary merchant purchases.
    - We only classify as INTERNAL when explicit self-referential markers
      exist in the description (own account numbers, "self", "fd", "rd", etc.).
    - "possible_transfer" is used for patterns that look suspicious
      but cannot be confirmed.
    """
    desc = description.lower().strip()

    # ── High-confidence internal transfer markers ─────────────────────────────
    # Explicit self-transfer keywords
    SELF_KEYWORDS = [
        "self transfer", "own account", "sweep in", "sweep out",
        "fund transfer to self", "transfer to self",
    ]
    for kw in SELF_KEYWORDS:
        if kw in desc:
            return TRANSFER_INTERNAL

    # Fixed/recurring deposit creation (money moves but stays with same bank)
    FD_RD_KEYWORDS = ["fd opening", "rd opening", "fixed deposit", "recurring deposit"]
    for kw in FD_RD_KEYWORDS:
        if kw in desc:
            return TRANSFER_INTERNAL

    # Credit card bill payment to own card (common self-transfer)
    CC_KEYWORDS = ["credit card bill", "cc bill", "cc payment", "creditcard bill"]
    for kw in CC_KEYWORDS:
        if kw in desc:
            return TRANSFER_INTERNAL

    # ── Explicit salary/income indicators (only for CREDIT transactions) ──────
    INCOME_KEYWORDS = ["salary", "sal credit", "payroll", "stipend", "income credit"]
    if tx_type == "CREDIT":
        for kw in INCOME_KEYWORDS:
            if kw in desc:
                return TRANSFER_NONE  # Real income, not a transfer

    # ── Patterns that suggest possible transfer but aren't certain ────────────
    # Large round-number NEFT/RTGS transfers can be own-account but we can't know
    # Classify as possible_transfer only when a payment rail is combined with
    # an account-number-like pattern in the description
    RAIL_KEYWORDS = ["neft", "rtgs"]
    ACCOUNT_PATTERN = re.search(r"\b\d{9,16}\b", desc)
    for rail in RAIL_KEYWORDS:
        if rail in desc and ACCOUNT_PATTERN:
            return TRANSFER_POSSIBLE

    # ── Default: not a transfer ───────────────────────────────────────────────
    return TRANSFER_NONE


def is_transfer_excluded_from_kpis(transfer_type: str) -> bool:
    """
    Returns True if this transfer_type should be excluded from primary KPIs
    (income and expense aggregations).
    """
    return transfer_type in (TRANSFER_INTERNAL, TRANSFER_POSSIBLE)


def parse_date(date_str: str):
    """Normalize date string to a date object."""
    try:
        formats = [
            "%d/%m/%Y", "%Y-%m-%d", "%d-%b-%Y", "%d %b %Y",
            "%m/%d/%Y", "%d-%m-%Y", "%d/%m/%y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        match = re.search(r"(\d{2})[-/](\d{2})[-/](\d{2,4})", date_str)
        if match:
            candidate = match.group(0).replace("-", "/")
            for fmt in ["%d/%m/%Y", "%d/%m/%y"]:
                try:
                    return datetime.strptime(candidate, fmt).date()
                except ValueError:
                    continue
    except Exception:
        pass
    return None


def is_valid_amount(amount: float) -> bool:
    """
    Sanity check: reject amounts that are likely reference/account numbers
    rather than transaction amounts.
    - Must be > 0
    - Must be <= MAX_TRANSACTION_AMOUNT (₹50L)
    """
    if amount <= 0:
        return False
    if amount > MAX_TRANSACTION_AMOUNT:
        return False
    return True


def parse_amount(amount_str: str) -> float:
    """Parse and clean an amount string, returning 0.0 if invalid."""
    if not amount_str:
        return 0.0
    # Remove common currency symbols and whitespace
    cleaned = (
        amount_str
        .replace(",", "")
        .replace("₹", "")
        .replace("Rs.", "")
        .replace("Rs", "")
        .replace(" ", "")
        .replace("CR", "")
        .replace("Dr", "")
        .replace("Cr", "")
        .strip()
    )
    # Reject pure integers longer than 10 digits (likely account/ref numbers)
    if re.fullmatch(r"\d{11,}", cleaned):
        return 0.0
    try:
        val = abs(float(cleaned))
        return val if is_valid_amount(val) else 0.0
    except ValueError:
        return 0.0


def detect_bank(filepath: str) -> str:
    """Heuristic bank detection from filename and PDF content."""
    name = filepath.lower()
    bank_keywords = {
        "HDFC": ["hdfc"],
        "SBI": ["sbi", "state bank"],
        "ICICI": ["icici"],
        "Axis": ["axis"],
        "Kotak": ["kotak"],
        "PNB": ["pnb", "punjab national"],
        "Canara": ["canara"],
        "Union": ["union bank"],
        "BOB": ["bank of baroda", "bob"],
        "IndusInd": ["indusind"],
        "Yes": ["yes bank"],
    }
    for bank, keywords in bank_keywords.items():
        if any(kw in name for kw in keywords):
            return bank

    # Try to read first two pages text for bank name
    try:
        with pdfplumber.open(filepath) as pdf:
            text = ""
            for page in pdf.pages[:2]:
                text += (page.extract_text() or "").lower()
            for bank, keywords in bank_keywords.items():
                if any(kw in text for kw in keywords):
                    return bank
    except Exception:
        pass
    return "Unknown"


def _build_transaction(date, desc: str, amount: float, t_type: str, bank_name: str) -> dict:
    """Build a transaction dict with transfer classification applied."""
    transfer_type = detect_transfer_type(desc, t_type)
    return {
        "date": date,
        "description": desc.replace("\n", " ") or "Unknown",
        "amount": round(amount, 2),
        "type": t_type,
        "category": categorize_transaction(desc),
        "bank_name": bank_name,
        "source": "STATEMENT",
        "transfer_type": transfer_type,
        "is_transfer": is_transfer_excluded_from_kpis(transfer_type),
    }


def parse_hdfc_format(filepath: str, bank_name: str = "HDFC"):
    transactions = []
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                table = page.extract_table()
                if not table:
                    continue
                for row in table[1:]:
                    if not row or len(row) < 6:
                        continue
                    date_str = str(row[0] or "").strip()
                    desc = str(row[1] or "").strip()
                    debit = parse_amount(str(row[3] or ""))
                    credit = parse_amount(str(row[4] or ""))
                    dt = parse_date(date_str)
                    if dt and (debit > 0 or credit > 0):
                        t_type = "CREDIT" if credit > 0 else "DEBIT"
                        amt = credit if credit > 0 else debit
                        if is_valid_amount(amt):
                            transactions.append(_build_transaction(dt, desc, amt, t_type, bank_name))
    except Exception as e:
        print(f"HDFC parse error: {e}")
    return transactions


def parse_sbi_format(filepath: str, bank_name: str = "SBI"):
    transactions = []
    try:
        tables = camelot.read_pdf(filepath, pages="all", flavor="stream")
        for table in tables:
            df = table.df
            for index, row in df.iterrows():
                if index == 0:
                    continue
                if len(row) < 5:
                    continue
                date_str = str(row[0]).strip()
                desc = str(row[1]).strip()
                debit = parse_amount(str(row[2]))
                credit = parse_amount(str(row[3]))
                dt = parse_date(date_str)
                if dt and (debit > 0 or credit > 0):
                    t_type = "CREDIT" if credit > 0 else "DEBIT"
                    amt = credit if credit > 0 else debit
                    if is_valid_amount(amt):
                        transactions.append(_build_transaction(dt, desc, amt, t_type, bank_name))
    except Exception as e:
        print(f"SBI/Camelot parse error: {e}")
    return transactions


def parse_generic_format(filepath: str, bank_name: str = "Unknown"):
    """
    Fallback generic line-by-line text parser.
    Captures the FIRST decimal amount after the description (not the running balance at end).
    """
    transactions = []
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                for line in text.split("\n"):
                    line = line.strip()
                    if re.match(r"^\d{2}[-/]\d{2}[-/]\d{2,4}", line):
                        parts = line.split()
                        date_str = parts[0]
                        # Find all decimal amounts (e.g. 1,234.56)
                        amounts = re.findall(r"[\d,]+\.\d{2}", line)
                        if amounts:
                            dt = parse_date(date_str)
                            if dt:
                                chosen_amount = 0.0
                                for amt_str in amounts:
                                    candidate = parse_amount(amt_str)
                                    if candidate > 0:
                                        chosen_amount = candidate
                                        break
                                if chosen_amount > 0:
                                    desc = " ".join(parts[1: max(1, len(parts) - len(amounts))])
                                    transactions.append(
                                        _build_transaction(dt, desc or "Transaction", chosen_amount, "DEBIT", bank_name)
                                    )
    except Exception as e:
        print(f"Generic parse error: {e}")
    return transactions


def parse_pdf_statement(filepath: str):
    """Try multiple parsers in sequence; return first successful result."""
    bank_name = detect_bank(filepath)
    for parser_fn, kwargs in [
        (parse_hdfc_format, {"bank_name": bank_name}),
        (parse_sbi_format, {"bank_name": bank_name}),
        (parse_generic_format, {"bank_name": bank_name}),
    ]:
        try:
            result = parser_fn(filepath, **kwargs)
            if result:
                return result
        except Exception as e:
            print(f"Parser {parser_fn.__name__} failed: {e}")
    return []
