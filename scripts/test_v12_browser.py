from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json, os

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/src/main/assets"
REPORT = ROOT / "v12-browser-results"
REPORT.mkdir(exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ASSETS)))
Thread(target=server.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{server.server_port}/index.html"
results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    for width, height in ((320, 640), (360, 780), (393, 852), (430, 932)):
        context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, is_mobile=True, has_touch=True)
        page = context.new_page()
        errors=[]
        page.on("pageerror",lambda error: errors.append(str(error)))
        page.goto(URL, wait_until="load", timeout=25000)
        page.wait_for_timeout(450)
        assert page.locator("body.v12-design").count() == 1, "V12 theme not initialized"
        assert page.locator("#eqBands .eq-band").count() == 28, "28 band EQ not initialized"
        assert page.locator(".v12-shortcut").count() == 4
        def check(name):
            dims=page.evaluate("""() => ({
              viewport:document.documentElement.clientWidth,
              root:document.documentElement.scrollWidth,
              app:document.querySelector('#app').getBoundingClientRect().width
            })""")
            assert dims["root"] <= dims["viewport"] + 2, f"Overflow {width}px / {name}: {dims}"
            assert len(errors) == 0, f"JavaScript errors at {width}px/{name}: {errors}"
        check("home")
        page.screenshot(path=str(REPORT/f"home-{width}.png"),full_page=False)
        page.locator(".v12-shortcut[data-tab=eq]").click()
        assert page.locator("#eq").evaluate("(e)=>e.classList.contains('active')")
        page.locator("#eqPresets [data-preset='Rock']").click()
        assert page.locator(".v12-eq-curve path.line").count() == 1
        check("eq")
        page.locator(".nav [data-tab=cabin]").click()
        page.locator(".v12-cabin-presets [data-pos-x='-40']").click()
        assert page.locator("#balance").input_value() == "-40"
        check("cabin")
        page.screenshot(path=str(REPORT/f"cabin-{width}.png"),full_page=False)
        page.locator(".nav [data-tab=sources]").click()
        assert page.locator(".v12-bridge").count() == 1
        check("sources")
        page.locator(".nav [data-tab=settings]").click()
        check("settings")
        page.locator(".nav [data-tab=home]").click()
        page.locator("#v12-open-player").click()
        assert page.locator("#v11-modal").is_visible()
        check("full-player")
        page.screenshot(path=str(REPORT/f"player-{width}.png"),full_page=False)
        page.locator("#v11-close").click()
        assert not page.locator("#v11-modal").is_visible()
        context.close()
        results.append({"viewport":f"{width}x{height}","tabs":"passed","eq":"passed","cabin":"passed","fullscreen":"passed","horizontal_overflow":"none","page_errors":errors})
    browser.close()
server.shutdown()
(REPORT/"results.json").write_text(json.dumps(results,indent=2),encoding="utf-8")
print(json.dumps(results,ensure_ascii=False,indent=2))
