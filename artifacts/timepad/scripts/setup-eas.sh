#!/bin/bash
# HR Control EAS Setup va APK Build
# Bu skriptni kompyuteringizda ishga tushiring (Replit'da emas)

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   HR Control — APK Build Sozlash${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 1. EAS CLI o'rnatish
echo -e "\n${YELLOW}1. EAS CLI tekshirilmoqda...${NC}"
if ! command -v eas &>/dev/null; then
  echo -e "   O'rnatilmoqda..."
  npm install -g eas-cli
fi
echo -e "${GREEN}   ✓ EAS CLI: $(eas --version)${NC}"

# 2. Expo login
echo -e "\n${YELLOW}2. Expo hisobiga kirish...${NC}"
echo -e "   expo.dev saytida bepul hisob oching va quyida kiring:"
eas login
echo -e "${GREEN}   ✓ Hisob: $(eas whoami)${NC}"

# 3. EAS Project yaratish
echo -e "\n${YELLOW}3. EAS proyektga bog'lash...${NC}"
cd "$(dirname "$0")/.."
eas init --id "" --non-interactive 2>/dev/null || eas init
echo -e "${GREEN}   ✓ Proyekt bog'landi${NC}"

# 4. API URL sozlash
echo -e "\n${YELLOW}4. API URL ni sozlang${NC}"
echo -e "   Replit proyektingizning URL manzilini kiriting:"
echo -e "   (Masalan: https://abcd-0-xyz.global.replit.app)"
read -p "   API URL: " API_URL

# eas.json ga env qo'shish
node -e "
const fs = require('fs');
const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
['kiosk','employee','admin','unified'].forEach(p => {
  eas.build[p].env = eas.build[p].env || {};
  eas.build[p].env.EXPO_PUBLIC_DOMAIN = '$API_URL'.replace(/^https:\/\//, '');
});
fs.writeFileSync('eas.json', JSON.stringify(eas, null, 2));
console.log('eas.json yangilandi');
"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   Sozlash tugadi! APK qurish uchun:${NC}"
echo -e ""
echo -e "   ${BLUE}# 1. TimePad Kioski APK:${NC}"
echo -e "   eas build --platform android --profile kiosk"
echo -e ""
echo -e "   ${BLUE}# 2. Xodim Mobile Key APK:${NC}"
echo -e "   eas build --platform android --profile employee"
echo -e ""
echo -e "   ${BLUE}# 3. HR Admin APK:${NC}"
echo -e "   eas build --platform android --profile admin"
echo -e ""
echo -e "   ${BLUE}# Barcha 3 ta APK bir vaqtda:${NC}"
echo -e "   bash scripts/build-apks.sh all"
echo -e ""
echo -e "   APKlar expo.dev saytida yuklab olinadi."
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
