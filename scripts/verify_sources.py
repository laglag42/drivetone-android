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
