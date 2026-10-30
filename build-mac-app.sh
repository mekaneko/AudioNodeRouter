#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== 1. フロントエンド (React / Vite) のビルド ==="
./node_modules/.bin/vite build

echo "=== 2. macOS ネイティブバイナリのコンパイル (Swift) ==="
swiftc -O -target arm64-apple-macos12.0 \
  src-native/main.swift \
  -o AudioNodeRouter \
  -framework Cocoa \
  -framework WebKit

echo "=== 3. AudioNodeRouter.app バンドルの作成 ==="
APP_NAME="AudioNodeRouter.app"
rm -rf "$APP_NAME"
mkdir -p "$APP_NAME/Contents/MacOS"
mkdir -p "$APP_NAME/Contents/Resources/web"

# バイナリとInfo.plistの配置
mv AudioNodeRouter "$APP_NAME/Contents/MacOS/"
cp src-native/Info.plist "$APP_NAME/Contents/"

# Webアセットの配置 (dist/ を Resources/web/ へ)
cp -R dist/* "$APP_NAME/Contents/Resources/web/"

echo "=== 4. デスクトップ直下にアプリケーションを配置 ==="
DESKTOP_DIR="/Users/yuta2023/Desktop"
rm -rf "$DESKTOP_DIR/$APP_NAME"
cp -R "$APP_NAME" "$DESKTOP_DIR/"

echo "✅ ビルド完了！"
echo "デスクトップに『AudioNodeRouter.app』が作成されました！"
echo "ダブルクリックするだけでブラウザ不要の独立ソフトとして起動します。"
