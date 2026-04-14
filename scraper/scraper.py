import asyncio
import base64
from playwright.async_api import async_playwright


async def scrape_page(url: str, take_screenshot: bool = False) -> tuple[str, str | None]:
    """
    Scrape a page using Playwright headless Chromium.
    Returns (html, screenshot_base64 | None)
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--disable-gpu",
            ],
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            # Wait for dynamic content
            await page.wait_for_timeout(2_000)

            # Try to wait for network idle (but don't fail if it times out)
            try:
                await page.wait_for_load_state("networkidle", timeout=8_000)
            except Exception:
                pass

            html = await page.content()

            screenshot_b64 = None
            if take_screenshot:
                screenshot_bytes = await page.screenshot(
                    full_page=False,  # viewport only — faster
                    type="png",
                )
                screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")

            return html, screenshot_b64

        finally:
            await context.close()
            await browser.close()
