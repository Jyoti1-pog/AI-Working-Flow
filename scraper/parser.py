from bs4 import BeautifulSoup


CTA_KEYWORDS = {
    "get", "start", "try", "sign", "buy", "order", "book", "free", "now",
    "join", "learn", "discover", "shop", "claim", "grab", "download",
    "subscribe", "register", "access", "view", "explore",
}

TRUST_KEYWORDS = {
    "trusted", "rated", "reviews", "customers", "certified", "guarantee",
    "secure", "award", "featured", "verified", "protected", "official",
    "money back", "no risk", "proven", "accredited",
}


def parse_page(html: str) -> dict:
    """
    Parse a scraped HTML page using BeautifulSoup and return a structured
    representation useful for the CRO strategy agent.
    """
    soup = BeautifulSoup(html, "lxml")

    # Remove script/style tags to reduce noise
    for tag in soup(["script", "style", "noscript", "svg", "iframe"]):
        tag.decompose()

    # ── Title & Meta ──────────────────────────────────────────────────────────
    title = soup.title.string.strip() if soup.title and soup.title.string else ""

    meta_desc = ""
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content"):
        meta_desc = meta["content"].strip()

    # ── Hero Headline (first h1) ──────────────────────────────────────────────
    h1 = soup.find("h1")
    hero_headline = h1.get_text(strip=True) if h1 else ""

    # ── All Headings with selectors ───────────────────────────────────────────
    headings = []
    counters: dict[str, int] = {}
    for tag_name in ["h1", "h2", "h3"]:
        counters[tag_name] = 0
        for el in soup.find_all(tag_name):
            text = el.get_text(strip=True)
            if not text:
                continue
            counters[tag_name] += 1
            headings.append(
                {
                    "tag": tag_name,
                    "index": counters[tag_name],
                    "text": text[:300],
                    "selector": f"{tag_name}:nth-of-type({counters[tag_name]})",
                }
            )

    # ── CTAs ──────────────────────────────────────────────────────────────────
    ctas: list[str] = []
    for el in soup.find_all(["button", "a"]):
        text = el.get_text(strip=True)
        if not text or len(text) > 80:
            continue
        tokens = set(text.lower().split())
        if tokens & CTA_KEYWORDS:
            ctas.append(text)

    # ── Paragraphs (meaningful, > 30 chars) ───────────────────────────────────
    paragraphs = []
    p_counter = 0
    for el in soup.find_all("p"):
        text = el.get_text(strip=True)
        if len(text) < 30:
            continue
        p_counter += 1
        paragraphs.append(
            {
                "index": p_counter,
                "text": text[:500],
                "selector": f"p:nth-of-type({p_counter})",
            }
        )
        if p_counter >= 6:
            break

    # ── Trust Signals ─────────────────────────────────────────────────────────
    trust_signals: list[str] = []
    for el in soup.find_all(string=True):
        text = el.strip()
        if not text or len(text) < 5:
            continue
        tokens = set(text.lower().split())
        if tokens & TRUST_KEYWORDS:
            trust_signals.append(text[:200])
            if len(trust_signals) >= 5:
                break

    # ── Form Present? ─────────────────────────────────────────────────────────
    form_present = bool(soup.find("form"))

    # ── Hero Section Content ──────────────────────────────────────────────────
    hero_content = ""
    hero_classes = ["hero", "banner", "header", "jumbotron", "above-fold", "above_fold"]
    for el in soup.find_all(["section", "div", "header"]):
        classes = " ".join(el.get("class", [])).lower()
        if any(kw in classes for kw in hero_classes):
            hero_content = el.get_text(separator=" ", strip=True)[:1000]
            break

    return {
        "title": title,
        "meta_description": meta_desc,
        "hero_headline": hero_headline,
        "headings": headings[:12],
        "ctas": list(dict.fromkeys(ctas))[:10],  # deduplicate, preserve order
        "paragraphs": paragraphs,
        "trust_signals": trust_signals,
        "form_present": form_present,
        "hero_content": hero_content,
    }
