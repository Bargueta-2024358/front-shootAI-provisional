@echo off
set SOURCE=C:\Users\elips\Frontend-ShootAI
set TARGET=E:\hack\Frontend-ShootAI

echo Creando directorios...
if not exist "%TARGET%\public\videos" mkdir "%TARGET%\public\videos"

echo Copiando archivos...
xcopy "%SOURCE%" "%TARGET%\" /E /I /Y /EXCLUDE:%SOURCE%\scripts\xcopy-exclude.txt

echo Copiando videos...
copy /Y "c:\Users\elips\Videos\videos de app\12104978_2160_3840_30fps.mp4" "%TARGET%\public\videos\pre-shoot.mp4"
copy /Y "c:\Users\elips\Videos\videos de app\15434321_1080_1920_30fps.mp4" "%TARGET%\public\videos\live-shoot.mp4"

cd /d "%TARGET%"
call npm install
echo.
echo Listo! Ejecuta: cd E:\hack\Frontend-ShootAI ^&^& npm run dev
pause
