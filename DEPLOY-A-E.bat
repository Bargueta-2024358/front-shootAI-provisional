@echo off
echo ========================================
echo  Deploy Shoot AI -^> E:\hack\Frontend-ShootAI
echo ========================================

set "SRC=C:\Users\elips\Frontend-ShootAI"
set "DST=E:\hack\Frontend-ShootAI"

if not exist "E:\hack" (
  echo ERROR: La unidad E:\hack no existe.
  pause
  exit /b 1
)

echo Eliminando destino anterior...
if exist "%DST%" rmdir /s /q "%DST%"

echo Copiando proyecto...
xcopy "%SRC%" "%DST%\" /E /I /Y /EXCLUDE:%SRC%\scripts\xcopy-exclude.txt

echo Verificando videos...
if not exist "%DST%\public\videos\pre-shoot.mp4" (
  mkdir "%DST%\public\videos" 2>nul
  copy /Y "c:\Users\elips\Videos\videos de app\12104978_2160_3840_30fps.mp4" "%DST%\public\videos\pre-shoot.mp4"
  copy /Y "c:\Users\elips\Videos\videos de app\15434321_1080_1920_30fps.mp4" "%DST%\public\videos\live-shoot.mp4"
)

echo Instalando dependencias en E:...
cd /d "%DST%"
call npm install

echo.
echo ========================================
echo  LISTO
echo  cd E:\hack\Frontend-ShootAI
echo  npm run dev
echo ========================================
pause
