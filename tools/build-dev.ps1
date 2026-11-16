$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    cargo build --release -p westplay-plugin -p cabinos-probe -p cabinos-maps
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}

# Tauri keeps this process alive as the companion's Vite development server.
npm run dev
