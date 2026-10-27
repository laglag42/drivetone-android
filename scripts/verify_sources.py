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

v6=(r/'app/src/main/assets/v6.js').read_text()
core=(r/'app/src/main/assets/v6-core.js').read_text()
assert '<script src="v6-core.js"></script><script src="v6.js"></script>' in html
for text in ['v6-brain','v6-protect','v6-carview','v6-drive','v6-haptic','v6-safe','v6-source-matrix','v6-test-100']:
 assert text in v6,text
for text in ['makeOffsets','safeStartVolume','protectFromPeak','detectSource']:
 assert text in core,text
assert 'hapticTick' in source
subprocess.run(['node','--check',str(r/'app/src/main/assets/v6.js')],check=True)
subprocess.run(['node','--check',str(r/'app/src/main/assets/v6-core.js')],check=True)
print("V6: eight feature modules passed presence and syntax checks")

# V7: actual Android media service, SAF storage and backup/diagnostics checks
library=(r/'app/src/main/java/com/drivetone/studio/NativeMusicLibrary.kt').read_text()
playback=(r/'app/src/main/java/com/drivetone/studio/PlaybackService.kt').read_text()
v7=(r/'app/src/main/assets/v7.js').read_text()
extras=(r/'app/src/main/assets/v7-extras.js').read_text()
manifest=(r/'app/src/main/AndroidManifest.xml').read_text()
assert 'takePersistableUriPermission' in source
assert 'fun nativePlay(' in source and 'getNativePlaybackSnapshot' in source
assert 'getRoutedOutput' in source and 'saveBackupJson' in source
assert 'class NativeMusicLibrary' in library and 'SharedPreferences' not in library
assert 'getSharedPreferences' in library and 'OpenableColumns.DISPLAY_NAME' in library
assert 'class PlaybackService : MediaSessionService' in playback
assert 'setAudioAttributes' in playback and 'true' in playback
assert 'FOREGROUND_SERVICE_MEDIA_PLAYBACK' in manifest
assert 'androidx.media3.session.MediaSessionService' in manifest
assert '<script src="v7.js"></script><script src="v7-extras.js"></script>' in html
for tag in ['v7-library','v7-toggle','v7-list','v7-refresh','v7-seek']:
 assert tag in v7, tag
for tag in ['v7-backup-save','v7-backup-restore','v7-route-refresh']:
 assert tag in extras, tag
for name in ['v7.js','v7-extras.js']:
 subprocess.run(['node','--check',str(r/'app/src/main/assets'/name)],check=True)
print('V7: native background playback, library, backup and diagnostics static checks passed')
