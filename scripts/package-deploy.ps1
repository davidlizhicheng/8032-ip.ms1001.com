# 打包 ip-card-ai 部署包（排除 node_modules / .next / 密钥 / 本地库）
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "dist"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Archive = Join-Path $OutDir "ip-card-ai-deploy-$Stamp.tgz"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$exclude = @(
  "node_modules",
  ".next",
  ".git",
  ".cursor",
  "dist",
  "dev.db",
  "prisma/dev.db",
  "prisma/test-*.db",
  "public/uploads",
  ".env"
)

Push-Location $Root
try {
  if (Get-Command tar -ErrorAction SilentlyContinue) {
    $tarExclude = $exclude | ForEach-Object { "--exclude=$_" }
    & tar -czf $Archive @tarExclude .
    Write-Host "Created: $Archive"
    Write-Host ("Size: {0:N2} MB" -f ((Get-Item $Archive).Length / 1MB))
  } else {
    throw "tar not found"
  }
} finally {
  Pop-Location
}

Write-Host $Archive
