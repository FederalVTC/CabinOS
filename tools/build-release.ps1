$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$ui = Join-Path $root "ui"

Push-Location $ui
try {
    npm run build:release
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}

Push-Location $root
try {
    cargo build --release -p westplay-plugin -p cabinos-probe -p cabinos-maps
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    $required = @(
        "target/release/cabinos.dll",
        "target/release/cabinos-probe.exe",
        "target/release/cabinos-maps.exe"
    )
    foreach ($file in $required) {
        if (-not (Test-Path (Join-Path $root $file))) {
            throw "Required CabinOS release component was not produced: $file"
        }
    }
}
finally {
    Pop-Location
}
