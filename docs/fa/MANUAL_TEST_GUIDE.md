# راهنمای تست دستی - SystemUpdate

## پیش‌نیازها
Android Studio، Docker، Python 3.11+، Node 20+، دستگاه یا Emulator

## تست Android
- Debug نصب: `./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`
- Release امنیت: ساخت، نصب، ثبت لاگ Cleartext، تست پین‌کردن گواهی

## تست Backend
- Health: `curl http://localhost:5000/health`
- WebSocket: بررسی “WS Connected” در داشبورد

## سناریوی End-to-End
1) نصب اپ اندروید 2) ثبت دستگاه 3) ارسال دستور 4) مشاهده نتیجه real-time
