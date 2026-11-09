#!/bin/bash
# Builds GrannyxDBD.apk with the plain SDK tools (no Gradle). Usage: ./build-apk.sh path/to/GrannyDBD.html
set -e
# the signing key is not in the repo: put release.jks next to this script and set KS_PASS to its password
: "${KS_PASS:?set KS_PASS to the keystore password}"
HTML=$(realpath "$1"); [ -n "$KS" ] && KS=$(realpath "$KS")
cd "$(dirname "$0")"
KS=${KS:-release.jks}
SDK=${SDK:-/home/user/android-sdk}; BT=$SDK/build-tools/34.0.0; JAR=$SDK/platforms/android-34/android.jar
# no Google SDK here: Ubuntu's packaged tools work too (apt install aapt dalvik-exchange zipalign apksigner android-sdk-platform-23)
if [ ! -x "$BT/aapt2" ]; then BT=/usr/lib/android-sdk/build-tools/debian; JAR=/usr/lib/android-sdk/platforms/android-23/android.jar; fi
rm -rf build && mkdir -p build/gen build/obj build/dex build/stubs
# the game page laid out 1280 CSS px wide, so the menus fit a phone screen
# and in mobile mode from the first frame: touch controls only, every hint names the on-screen buttons
python3 - "$HTML" build/index.html <<'PY'
import sys, re
s = open(sys.argv[1], encoding='utf-8').read()
s = re.sub(r'<meta name="viewport"[^>]*>', '<meta name="viewport" content="width=1280, user-scalable=no">', s, count=1)
s = s.replace('<head>', '<head><script>window.__forceTouch=true;document.documentElement.classList.add("mobile")</script>', 1)
open(sys.argv[2], 'w', encoding='utf-8').write(s)
PY
mkdir -p build/assets && mv build/index.html build/assets/index.html
$BT/aapt2 compile --dir res -o build/res.zip
$BT/aapt2 link -o build/base.apk -I $JAR --manifest AndroidManifest.xml -R build/res.zip --java build/gen \
  --min-sdk-version 26 --target-sdk-version 34 --version-code ${VC:-2} --version-name ${VN:-1.0.1} -A build/assets
# classes newer than the platform jar (an older android.jar) compile against stubs that are not packaged
javac -source 8 -target 8 -nowarn -bootclasspath $JAR -d build/stubs $(find stubs -name '*.java') 2>build/javac.log || { cat build/javac.log; exit 1; }
javac -source 8 -target 8 -nowarn -bootclasspath $JAR -classpath $JAR:build/stubs -d build/obj $(find src build/gen -name '*.java') 2>build/javac.log || { cat build/javac.log; exit 1; }
(cd build/obj && jar cf ../classes.jar .)
if [ -x "$BT/d8" ]; then $BT/d8 --release --lib $JAR --min-api 26 --output build/dex build/classes.jar; else $BT/dx --dex --min-sdk-version=26 --output=build/dex/classes.dex build/classes.jar; fi
(cd build/dex && zip -q -j ../base.apk classes.dex)
$BT/zipalign -p -f 4 build/base.apk build/aligned.apk
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -alias grannyxdbd -keyalg RSA -keysize 2048 -validity 10000 -storepass "$KS_PASS" -keypass "$KS_PASS" -dname "CN=Granny x DBD, O=froodyofficial-maker" >/dev/null 2>&1
$BT/apksigner sign --ks "$KS" --ks-pass env:KS_PASS --key-pass env:KS_PASS --ks-key-alias grannyxdbd --out GrannyxDBD.apk build/aligned.apk
$BT/apksigner verify GrannyxDBD.apk && ls -la GrannyxDBD.apk
