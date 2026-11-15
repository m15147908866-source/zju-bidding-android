#!/usr/bin/env bash
# ZJU 叫牌 —— APK 构建脚本（不依赖 Gradle，直接用 SDK 工具链）
#
# 用法：bash android/build.sh
#
# 可用环境变量覆盖（CI 与本地共用同一套逻辑）：
#   ANDROID_HOME / ANDROID_SDK_ROOT   Android SDK 根目录
#   BUILD_TOOLS                       build-tools 版本，默认 36.0.0
#   ANDROID_PLATFORM                  platforms 目录名，默认 android-34
#   OUT_APK                           产物路径，默认 dist/ZJU-bidding.apk
#   KEYSTORE / KEYSTORE_PASS          签名密钥；不提供则使用 .keystore/ 下的临时调试密钥
#   KEY_ALIAS / KEY_PASS              别名与密钥口令，默认取 KEYSTORE_PASS
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/android"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-D:/WorkBuddy/.workbuddy/android/sdk}}"
BT="$SDK/build-tools/${BUILD_TOOLS:-36.0.0}"
PLATFORM="$SDK/platforms/${ANDROID_PLATFORM:-android-34}/android.jar"
OUT_APK="${OUT_APK:-$ROOT/dist/ZJU-bidding.apk}"

# Windows 下工具带 .bat，类 Unix 下是不带后缀的脚本
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*) BAT=".bat" ;;
  *) BAT="" ;;
esac

# Windows 下可执行文件带 .exe，类 Unix 下不带
if [ -f "$BT/aapt2.exe" ]; then AAPT2="$BT/aapt2.exe"; else AAPT2="$BT/aapt2"; fi
if [ -f "$BT/zipalign.exe" ]; then ZIPALIGN="$BT/zipalign.exe"; else ZIPALIGN="$BT/zipalign"; fi

# JDK：优先用环境里的 JAVA_HOME，否则回退到本机既有安装
if [ -z "${JAVA_HOME:-}" ] && [ -d "C:/Program Files/Microsoft/jdk-25.0.3.9-hotspot" ]; then
  export JAVA_HOME="C:/Program Files/Microsoft/jdk-25.0.3.9-hotspot"
fi
if [ -n "${JAVA_HOME:-}" ]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

# Python 只用于把 classes.dex 写进 APK
PYTHON="${PYTHON:-}"
if [ -z "$PYTHON" ]; then
  for candidate in python3 python py; do
    if command -v "$candidate" >/dev/null 2>&1; then
      PYTHON="$candidate"
      break
    fi
  done
fi
if [ -z "$PYTHON" ]; then
  echo "缺少 Python，无法把 classes.dex 写入 APK" >&2
  exit 1
fi

if [ ! -f "$PLATFORM" ]; then
  echo "找不到 Android 平台：$PLATFORM" >&2
  echo "请检查 ANDROID_HOME 与 ANDROID_PLATFORM" >&2
  exit 1
fi

cd "$APP"
rm -rf build assets
mkdir -p build/gen build/classes build/dex assets

echo "==> 0/7 生成规则数据（data/bridge-data.js）"
if command -v node >/dev/null 2>&1; then
  node "$ROOT/scripts/build-data.mjs"
else
  echo "缺少 Node，直接使用仓库里已生成的 data/bridge-data.js" >&2
fi

echo "==> 1/7 复制网页资源"
mkdir -p assets/core assets/data assets/icons
cp "$ROOT"/index.html "$ROOT"/app.js "$ROOT"/engine.js "$ROOT"/sw.js "$ROOT"/manifest.json assets/
find "$ROOT"/core -maxdepth 1 -name '*.js' ! -name '*.test.js' -exec cp {} assets/core/ \;
cp "$ROOT"/data/bridge-data.js assets/data/
cp "$ROOT"/icons/* assets/icons/
ls -R assets/ | head -40

echo "==> 2/7 编译资源"
"$AAPT2" compile --dir res -o build/res.zip

echo "==> 3/7 链接资源与 assets"
"$AAPT2" link \
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
"$BT/d8$BAT" --lib "$PLATFORM" --min-api 23 --release \
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
"$ZIPALIGN" -f -p 4 build/app-unsigned.apk build/app-aligned.apk

if [ -n "${KEYSTORE:-}" ] && [ -f "$KEYSTORE" ]; then
  KS="$KEYSTORE"
  KS_PASS="${KEYSTORE_PASS:?提供 KEYSTORE 时必须同时提供 KEYSTORE_PASS}"
  ALIAS="${KEY_ALIAS:-zju}"
  KEY_PASS="${KEY_PASS:-$KS_PASS}"
  echo "    使用发布密钥签名"
else
  # 放在仓库根的 .keystore/ 下并已被忽略：多次本地构建签名保持一致
  KS="$ROOT/.keystore/debug.keystore"
  KS_PASS="zju-debug"
  mkdir -p "$ROOT/.keystore"
  ALIAS="zju"
  KEY_PASS="$KS_PASS"
  echo "    未提供 KEYSTORE，使用临时调试密钥（签名与历史版本不同）"
  if [ ! -f "$KS" ]; then
    keytool -genkeypair -keystore "$KS" -alias "$ALIAS" \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -storepass "$KS_PASS" -keypass "$KEY_PASS" \
      -dname "CN=ZJU Bidding, OU=Personal, O=Personal, L=Hangzhou, ST=Zhejiang, C=CN" 2>/dev/null
  fi
fi

mkdir -p "$(dirname "$OUT_APK")"
"$BT/apksigner$BAT" sign \
  --ks "$KS" --ks-pass "pass:$KS_PASS" --ks-key-alias "$ALIAS" --key-pass "pass:$KEY_PASS" \
  --out "$OUT_APK" \
  build/app-aligned.apk

"$BT/apksigner$BAT" verify --print-certs "$OUT_APK" | head -5
ls -lh "$OUT_APK"
echo "==> 完成：$OUT_APK"
