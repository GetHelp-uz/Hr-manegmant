#!/bin/bash
# HR Control — 3 ta alohida APK qurish skripti
# Ishlatish: bash scripts/build-apks.sh [kiosk|employee|admin|all]

set -e

PROFILE="${1:-all}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; PURPLE='\033[0;35m'; NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   HR Control — APK Build${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check EAS CLI
if ! command -v eas &>/dev/null; then
  echo -e "${RED}❌ EAS CLI topilmadi.${NC}"
  echo "   O'rnating: npm install -g eas-cli"
  echo ""
  echo "   Keyin Expo hisobingizga kiring: eas login"
  exit 1
fi

# Check login
echo -e "${BLUE}👤 EAS hisobi tekshirilmoqda...${NC}"
if ! eas whoami &>/dev/null; then
  echo -e "${RED}❌ EAS hisobiga kirilmagan.${NC}"
  echo "   Kirish: eas login"
  exit 1
fi

build_profile() {
  local profile="$1"
  local label="$2"
  local color="$3"

  echo ""
  echo -e "${color}▶  ${label} APK qurilmoqda (profil: ${profile})...${NC}"
  echo ""

  eas build \
    --platform android \
    --profile "${profile}" \
    --non-interactive \
    --message "HR Control ${label} v1.0.0"

  echo -e "${GREEN}✅ ${label} APK tayyor!${NC}"
}

case "$PROFILE" in
  kiosk)
    build_profile "kiosk" "TimePad Kioski" "$BLUE"
    ;;
  employee)
    build_profile "employee" "HR Mobile Key" "$PURPLE"
    ;;
  admin)
    build_profile "admin" "HR Admin" "$GREEN"
    ;;
  all)
    build_profile "kiosk"    "TimePad Kioski" "$BLUE"
    build_profile "employee" "HR Mobile Key"  "$PURPLE"
    build_profile "admin"    "HR Admin"        "$GREEN"
    ;;
  unified)
    build_profile "unified" "HR Control (Unified)" "$BLUE"
    ;;
  *)
    echo -e "${RED}❌ Noto'g'ri profil: $PROFILE${NC}"
    echo "   Mumkin: kiosk | employee | admin | all | unified"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   Barcha APK fayllar Expo dashboard'da mavjud:${NC}"
echo -e "${GREEN}   https://expo.dev/accounts/[USERNAME]/projects/timepad/builds${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
