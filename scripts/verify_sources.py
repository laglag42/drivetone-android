from pathlib import Path
from xml.etree import ElementTree as ET
r=Path(__file__).resolve().parent.parent
html=(r/'app/src/main/assets/index.html').read_text()
assert 'DRIVETONE' in html
assert 'window.DRIVETONE' in html
assert html.count('data-band') >= 1
assert (r/'app/src/main/assets/vehicle.svg').stat().st_size > 100
ET.parse(r/'app/src/main/AndroidManifest.xml')
ET.parse(r/'app/src/main/res/drawable/ic_launcher.xml')
source=(r/'app/src/main/java/com/drivetone/studio/MainActivity.kt').read_text()
for method in ('getMediaVolume','setMediaVolume','getCurrentMedia','toggleMedia','openMusicApp','openBluetoothSettings'):
 assert 'fun '+method+'(' in source, method
print('Static DRIVETONE source checks passed.')

# V5: verify all ten added features and their UI entry points exist.
features=(r/'app/src/main/assets/features.js').read_text()
from html.parser import HTMLParser
import subprocess, tempfile
class IdCollector(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=set()
 def handle_starttag(self,tag,attrs):
  data=dict(attrs)
  if 'id' in data:self.ids.add(data['id'])
collector=IdCollector();collector.feed(html)
ids=['dt5-shuffle','dt5-repeat','dt5-favorite-current','dt5-search','dt5-favorites','dt5-speed','dt5-sleep-status','dt5-ab','dt5-export','dt5-import','dt5-track-save','dt5-track-remove','dt5-eq-picker']
assert all(i in collector.ids for i in ids),set(ids)-collector.ids
assert 'src="features.js"' in html
assert all(key in features for key in ['onEnded','randomIndex','importEQ','exportEQ','saveTrackEQ','sleepSet','toggleFavorite','eqCompare'])
assert 'saveProfileJson' in source
with tempfile.TemporaryDirectory() as td:
 script=Path(td)/'inline.js'
 script.write_text(html.split('<script>')[1].split('</script>')[0])
 subprocess.run(['node','--check',str(script)],check=True)
 subprocess.run(['node','--check',str(r/'app/src/main/assets/features.js')],check=True)
print('V5: 10 new feature points and JavaScript syntax checks passed.')
