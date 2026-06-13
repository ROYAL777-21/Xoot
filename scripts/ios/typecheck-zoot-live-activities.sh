#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_DIR="$ROOT_DIR/native/ios/ZootLiveActivities"
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

"$SWIFTC" "${COMMON_FLAGS[@]}" \
  -target arm64-apple-ios16.1 \
  "$IOS_DIR/ZootBookingActivityAttributes.swift" \
  "$IOS_DIR/ZootLiveActivityController.swift"

"$SWIFTC" "${COMMON_FLAGS[@]}" \
  -target arm64-apple-ios17.0 \
  "$IOS_DIR/ZootBookingActivityAttributes.swift" \
  "$IOS_DIR/ZootLiquidGlass.swift" \
  "$IOS_DIR/ZootBookingLiveActivityWidget.swift" \
  "$IOS_DIR/ZootBookingSummaryWidget.swift" \
  "$IOS_DIR/ZootWidgetBundle.swift"

echo "Zoot native iOS Live Activity and widget Swift type-check passed."
