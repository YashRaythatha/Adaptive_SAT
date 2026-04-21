# Build the Adaptive SAT backend Docker image in Google Cloud (Cloud Build).
# No local Docker or WSL required.
#
# Before running:
#   1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
#   2. In PowerShell:  gcloud auth login
#   3. Run this script from the repository ROOT (Adaptive_SAT):
#        .\scripts\gcp_build_backend.ps1
#
# Optional: set a different tag
#   .\scripts\gcp_build_backend.ps1 -Tag v2

param(
    [string]$ProjectId = "sat1600",
    [string]$Region = "us-central1",
    [string]$Repository = "adaptive-sat",
    [string]$ImageName = "adaptive-sat-api",
    [string]$Tag = "v1"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "Repository root: $Root" -ForegroundColor Cyan

Write-Host "`nChecking gcloud..." -ForegroundColor Cyan
$null = gcloud --version

Write-Host "`nSetting project to $ProjectId ..." -ForegroundColor Cyan
gcloud config set project $ProjectId

Write-Host "`nEnabling APIs (safe to run every time)..." -ForegroundColor Cyan
gcloud services enable cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com --project=$ProjectId

$ImageUri = "$Region-docker.pkg.dev/$ProjectId/$Repository/${ImageName}:$Tag"
Write-Host "`nSubmitting Cloud Build (this can take several minutes)..." -ForegroundColor Cyan
Write-Host "Image will be: $ImageUri`n" -ForegroundColor Yellow

gcloud builds submit --tag $ImageUri ./backend

Write-Host "`n--- Success ---" -ForegroundColor Green
Write-Host "Use this container image in Cloud Run:" -ForegroundColor Green
Write-Host $ImageUri -ForegroundColor White
Write-Host "`nNext: Cloud Run -> Create service -> Container image URL = above" -ForegroundColor Cyan
Write-Host "     Attach Cloud SQL, set DATABASE_URL secret, port 8080.`n" -ForegroundColor Cyan
