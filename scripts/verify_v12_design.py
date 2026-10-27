from pathlib import Path
from xml.etree import ElementTree as ET
from html.parser import HTMLParser
import subprocess
ROOT=Path(__file__).resolve().parents[1]
assets=ROOT/"app/src/main/assets"
html=(assets/"index.html").read_text(encoding="utf-8")
class IDs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=set()
    def handle_starttag(self,tag,attrs):
        id=dict(attrs).get("id")
        if id:self.ids.add(id)
parser=IDs();parser.feed(html)
needed={"home","eq","cabin","sources","settings","dial","dialProgress","dialMarker","volumeValue","eqBands","balance","fader","carShell","v7-library"} 
# V7 library is inserted by JS at runtime and must not be required in static HTML.
needed.remove("v7-library")
assert needed.issubset(parser.ids),needed-parser.ids
for name in ["v12.css","v12.js","cover-v12.svg","vehicle.svg"]:
    assert (assets/name).stat().st_size>500,name
assert '<link rel="stylesheet" href="v12.css">' in html
assert '<script src="v12.js"></script>' in html
assert html.index('src="v11.js"') < html.index('src="v12.js"')
for svg in ["vehicle.svg","cover-v12.svg"]:
    ET.parse(assets/svg)
for file in ["v12.js","v11.js","v10.js","v8.js","v7.js"]:
    subprocess.run(["node","--check",str(assets/file)],check=True)
js=(assets/"v12.js").read_text()
css=(assets/"v12.css").read_text()
for key in ["v12-shortcut","v12-eq-curve","v12-cabin-presets","v12-bridge","DTV12"]:
    assert key in js,key
for key in [".dial", ".car-shell", ".eq-scroll", "#v11-modal", ".nav", "#v7-library"]:
    assert key in css,key
print("V12 custom blue cockpit assets, DOM anchors and JS syntax verified; no APK produced.")
