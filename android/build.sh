#!/usr/bin/env bash
# SAYC 叫牌 —— APK 构建脚本（不依赖 Gradle，直接用 SDK 工具链）
set -e

# JDK（路径含空格，PATH 用 Git Bash 的 /c/ 形式）
export JAVA_HOME="C:/Program Files/Microsoft/jdk-25.0.3.9-hotspot"
export PATH="/c/Program Files/Microsoft/jdk-25.0.3.9-hotspot/bin:$PATH"

SDK="D:/WorkBuddy/.workbuddy/android/sdk"
BT="$SDK/build-tools/36.0.0"
PLATFORM="$SDK/platforms/android-34/android.jar"
APP="D:/WorkBuddy/output/bridge-bidding/android"
SRC="D:/WorkBuddy/output/bridge-bidding"

cd "$APP"
rm -rf build assets
mkdir -p build/gen build/classes build/dex assets

echo "==> 1/7 复制网页资源"
cp "$SRC/index.html" "$SRC"/app.js "$SRC"/engine.js "$SRC"/data*.js assets/
ls -la assets/

echo "==> 2/7 编译资源"
"$BT/aapt2.exe" compile --dir res -o build/res.zip

echo "==> 3/7 链接资源与 assets"
"$BT/aapt2.exe" link \
  -o build/base.apk \
  -I "$PLATFORM" \
  --manifest AndroidManifest.xml \
  -R build/res.zip \
  --java build/gen \
  --min-sdk-version 23 \
  --target-sdk-version 34 \
  -A assets \
  --auto-add-overlay

echo "==> 4/7 编译 Java"
javac -encoding UTF-8 -nowarn -Xlint:-options \
  --release 8 \
  -classpath "$PLATFORM" \
  -d build/classes \
  build/gen/com/feng/sayc/R.java \
  java/com/feng/sayc/MainActivity.java

echo "==> 5/7 转 dex"
"$BT/d8.bat" --lib "$PLATFORM" --min-api 23 --release \
  --output build/dex \
  build/classes/com/feng/sayc/*.class

echo "==> 6/7 合并 dex 进 APK"
"$PYTHON" - <<'PY'
import zipfile, os, shutil
shutil.copy('build/base.apk', 'build/app-unsigned.apk')
with zipfile.ZipFile('build/app-unsigned.apk', 'a', zipfile.ZIP_DEFLATED) as z:
    z.write('build/dex/classes.dex', 'classes.dex')
print('  classes.dex 已写入', os.path.getsize('build/dex/classes.dex'), 'bytes')
PY

echo "==> 7/7 对齐与签名"
"$BT/zipalign.exe" -f -p 4 build/app-unsigned.apk build/app-aligned.apk

if [ ! -f keystore.jks ]; then
  keytool -genkeypair -keystore keystore.jks -alias sayc \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass sayc2026 -keypass sayc2026 \
    -dname "CN=SAYC Bidding, OU=Personal, O=Personal, L=Beijing, ST=Beijing, C=CN" 2>/dev/null
fi

"$BT/apksigner.bat" sign \
  --ks keystore.jks --ks-pass pass:sayc2026 --key-pass pass:sayc2026 \
  --out "$SRC/ZJU-bidding.apk" \
  build/app-aligned.apk

"$BT/apksigner.bat" verify --print-certs "$SRC/ZJU-bidding.apk" | head -4
ls -lh "$SRC/ZJU-bidding.apk"
echo "==> 完成"
