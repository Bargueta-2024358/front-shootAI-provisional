$ErrorActionPreference = "Stop"

$source = "C:\Users\elips\Frontend-ShootAI"
$target = "E:\hack\Frontend-ShootAI"
$videoPre = "c:\Users\elips\Videos\videos de app\12104978_2160_3840_30fps.mp4"
$videoLive = "c:\Users\elips\Videos\videos de app\15434321_1080_1920_30fps.mp4"

Write-Host "Creando directorios en $target..."
New-Item -ItemType Directory -Force -Path $target, "$target\public\videos" | Out-Null

Write-Host "Copiando proyecto..."
robocopy $source $target /E /XD node_modules dist .git /NFL /NDL /NJH /NJS /nc /ns /np
if ($LASTEXITCODE -ge 8) { throw "Robocopy falló con código $LASTEXITCODE" }

Write-Host "Copiando videos..."
Copy-Item -LiteralPath $videoPre -Destination "$target\public\videos\pre-shoot.mp4" -Force
Copy-Item -LiteralPath $videoLive -Destination "$target\public\videos\live-shoot.mp4" -Force

Write-Host "Instalando dependencias..."
Set-Location $target
npm install

Write-Host "Listo. Ejecuta: cd E:\hack\Frontend-ShootAI && npm run dev"
