#!/usr/bin/env python3
"""Build beers.json from the "Snallygaster 2026 Beer List - Public" CSV export.

Usage:  python3 -I tools/build_beers.py path/to/beers.csv [out.json]

Stdlib only. Row 1 of the CSV is a title row, row 2 is the header
(Brewery, Beer Name, Beer Style, ABV, Festival Location); data starts at row 3.
Each beer gets id "r<sheet row number>" so ids stay stable as long as the sheet
rows don't move.
"""
import csv
import json
import os
import re
import sys
from collections import Counter

SOURCE = "Snallygaster 2026 Beer List - Public"

# ABV estimates for rows the festival list leaves as "-" (wines, spirits, cocktails).
# Keyed by (brewery, beer) after whitespace trimming.
ESTIMATES = {
    ("Mosto", "Tequila Blanco"): 40,
    ("Mosto", "Tequila Reposado"): 40,
    ("Mosto", "Edicion Salvaje"): 50,  # still strength
    ("Mosto", "Margarita"): 15,
    ("Mosto", "Ranch Water"): 8,
    ("NA Beverages", "Lapo's Citrus Spritz"): 0.5,
    ("NA Beverages", "Non-Alcoholic Rosé"): 0.5,
    ("Planet Wine", "Cabernet Sauvignon"): 14,
    ("Planet Wine", "Chardonnay"): 13.5,
    ("Planet Wine", "Montepulciano"): 13.5,
    ("Planet Wine", "Non-Alcoholic Rosé"): 0.5,
    ("Planet Wine", "Pinot Grigio"): 12.5,
    ("Planet Wine", "Pinot Noir"): 13.5,
    ("Planet Wine", "Prosecco"): 11,
    ("Planet Wine", "Riesling"): 10,
    ("Planet Wine", "Rosé"): 12.5,
    ("Planet Wine", "Sauvignon Blanc"): 13,
    ("Show of Hands", "Lapo's Citrus Spritz"): 0.5,
    ("Show of Hands", "Gettin Figgy With It Spritz"): 10,
    ("Show of Hands", "Pumpkin Spice Margarita"): 15,
    ("Show of Hands", "Underberg Jello Shots"): 15,
    ("Show of Hands", 'Willett Single Barrel "Red Card Bourbon (Ice Luge)'): 55,
    ("Show of Hands", "Pursuit Single Barrel Bourbon (Ice Luge)"): 55,
}

# Rows with a genuinely unknown drink: abv null, the UI asks the drinker.
UNKNOWN = {
    ("The Seed", "TBD"),
    ("Xul", "TBD BA Stout (Magnum)"),
}

PCT_RE = re.compile(r"^(\d+(?:\.\d+)?)\s*%$")
PROOF_RE = re.compile(r"^(\d+(?:\.\d+)?)\s*proof$", re.I)


def clean(s):
    return re.sub(r"\s+", " ", (s or "")).strip()


def parse_abv(raw):
    """Return float ABV or None if not parseable."""
    raw = clean(raw)
    m = PCT_RE.match(raw)
    if m:
        return float(m.group(1))
    m = PROOF_RE.match(raw)
    if m:
        return float(m.group(1)) / 2
    return None


def num(x):
    """Render 6.0 as 6 for tidier JSON."""
    return int(x) if x is not None and float(x).is_integer() else x


def build(csv_path):
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    beers, seen, problems = [], set(), []
    for rownum, row in enumerate(rows[2:], start=3):
        if not any(c.strip() for c in row):
            continue
        row = (row + [""] * 5)[:5]
        brewery, beer, style, abv_raw, tent = (clean(c) for c in row)
        if style == "-":
            style = ""
        key = (brewery, beer, tent)
        if key in seen:
            continue  # exact duplicate at same tent
        seen.add(key)
        abv, est = parse_abv(abv_raw), False
        if abv is None:
            if (brewery, beer) in ESTIMATES:
                abv, est = float(ESTIMATES[(brewery, beer)]), True
            elif (brewery, beer) not in UNKNOWN:
                problems.append(f"r{rownum}: no ABV for {brewery} / {beer} ({abv_raw!r})")
        beers.append({
            "id": f"r{rownum}", "brewery": brewery, "beer": beer, "style": style,
            "abv": num(abv), "est": est, "tent": tent,
        })
    return beers, problems


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    here = os.path.dirname(os.path.abspath(__file__))
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "..", "beers.json")
    beers, problems = build(sys.argv[1])
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"source": SOURCE, "beers": beers}, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print(f"wrote {os.path.normpath(out)}")
    print(f"beers: {len(beers)}  estimated abv: {sum(b['est'] for b in beers)}  "
          f"null abv: {sum(b['abv'] is None for b in beers)}")
    for tent, n in sorted(Counter(b["tent"] for b in beers).items()):
        print(f"  {tent or '(no tent)':<14} {n}")
    for p in problems:
        print("WARNING", p)
    if problems:
        sys.exit(1)


if __name__ == "__main__":
    main()
