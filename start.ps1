# Sobe a Fabrica de Sites (app Scout): API (FastAPI :8001) + frontend (Vite :5173)
# em janelas separadas, e abre o navegador sozinho.
# Uso:  .\start.ps1
$raiz = $PSScriptRoot

# 1. Garante o ambiente Python (venv + projeto instalado em modo editavel)
if (-not (Test-Path "$raiz\.venv")) {
  Write-Host "Criando ambiente virtual Python..." -ForegroundColor Yellow
  python -m venv "$raiz\.venv"
  & "$raiz\.venv\Scripts\python.exe" -m pip install -q -e "$raiz"
}

# 2. Garante as dependencias do frontend
if (-not (Test-Path "$raiz\frontend\node_modules")) {
  Write-Host "Instalando dependencias do frontend..." -ForegroundColor Yellow
  Push-Location "$raiz\frontend"; npm install; Pop-Location
}

# 3. Backend (API) -> http://localhost:8001  (Swagger em /docs)
Write-Host "Iniciando API      -> http://localhost:8001/docs" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$raiz'; `$env:PYTHONIOENCODING='utf-8'; .\.venv\Scripts\python.exe -m uvicorn fabrica_sites.api.app:app --reload --port 8001"
)

# 4. Frontend (produto Scout) -> http://localhost:5173
Write-Host "Iniciando frontend -> http://localhost:5173" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$raiz\frontend'; npm run dev"
)

Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"
Write-Host ""
Write-Host "App no ar! Abra http://localhost:5173 (abre sozinho em instantes)." -ForegroundColor Green
Write-Host "Para parar: feche as duas janelas que abriram." -ForegroundColor DarkGray
