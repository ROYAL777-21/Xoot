#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_DIR="$ROOT_DIR/native/ios/XootLiveActivities"
SDK_PATH="$(xcrun --sdk iphoneos --show-sdk-path)"
SWIFTC="$(xcrun --find swiftc)"

echo "Swift compiler: $($SWIFTC --version | head -n 1)"
echo "iPhoneOS SDK: $SDK_PATH"

COMMON_FLAGS=(
  -typecheck
  -parse-as-library
  -application-extension
  -sdk "$SDK_PATH"
)

APP_FLAGS=(
  -typecheck
  -parse-as-library
  -sdk "$SDK_PATH"
)

"$SWIFTC" "${APP_FLAGS[@]}" \
  -target arm64-apple-ios16.0 \
  "$IOS_DIR/XootAppIntents.swift"

"$SWIFTC" "${COMMON_FLAGS[@]}" \
  -target arm64-apple-ios16.2 \
  "$IOS_DIR/XootBookingActivityAttributes.swift" \
  "$IOS_DIR/XootLiveActivityController.swift"

"$SWIFTC" "${COMMON_FLAGS[@]}" \
  -target arm64-apple-ios17.0 \
  "$IOS_DIR/XootBookingActivityAttributes.swift" \
  "$IOS_DIR/XootLiquidGlass.swift" \
  "$IOS_DIR/XootBookingLiveActivityWidget.swift" \
  "$IOS_DIR/XootBookingSummaryWidget.swift" \
  "$IOS_DIR/XootWidgetBundle.swift"

echo "Xoot native iOS Live Activity and widget Swift type-check passed."
