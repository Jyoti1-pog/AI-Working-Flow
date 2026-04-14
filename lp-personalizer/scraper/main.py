"""
Scraper Microservice — FastAPI + Playwright + BeautifulSoup
Deploy on Railway (or any server that can run headless Chromium).
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from scraper import scrape_page
from parser import parse_page

app = FastAPI(title="LP Personalizer Scraper", version="1.0.0")

# Allow requests from the Next.js app
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    url: HttpUrl
    screenshot: bool = False


class ScrapeResponse(BaseModel):
    html: str
    screenshot_base64: str | None
    parsed: dict


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest):
    url_str = str(request.url)
    try:
        html, screenshot_b64 = await scrape_page(url_str, request.screenshot)
    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        print(f"[scrape] error for {url_str}: {type(exc).__name__}: {exc}\n{tb}", flush=True)
        detail = f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__
        raise HTTPException(status_code=500, detail=f"Scrape failed: {detail}") from exc

    try:
        parsed = parse_page(html)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Parse failed: {exc}") from exc

    return ScrapeResponse(
        html=html,
        screenshot_base64=screenshot_b64,
        parsed=parsed,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8001)), reload=False)
