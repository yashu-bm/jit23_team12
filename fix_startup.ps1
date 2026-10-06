$ErrorActionPreference = 'Stop'

Write-Host "Detecting processes that might be locking the folder..."
$lockingProcesses = Get-Process -Name node, vite -ErrorAction SilentlyContinue

if ($lockingProcesses) {
    Write-Host "Found processes locking the folder. Stopping them:"
    $lockingProcesses | Format-Table Id, ProcessName
    $lockingProcesses | Stop-Process -Force
    Write-Host "Processes stopped."
} else {
    Write-Host "No conflicting node/vite processes found."
}

$currentPath = "C:\Users\yashu\OneDrive\Desktop\Smart-Legal-Assistance-System"
$targetPath = "C:\Projects\Smart-Legal-Assistance-System"

if ($currentPath -match "OneDrive") {
    Write-Host "Project is inside OneDrive, which often locks node_modules files."
    Write-Host "Safely moving project to $targetPath..."
    
    if (!(Test-Path $targetPath)) {
        New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    }
    
    # We use robocopy to mirror the directory but exclude node_modules and .git for speed and to drop the corrupted cache
    Write-Host "Copying files to $targetPath (excluding node_modules)..."
    robocopy $currentPath $targetPath /E /XD "node_modules" ".git" /R:1 /W:1 | Out-Null
    
    # Switch working directory to the new project location
    Set-Location $targetPath
    Write-Host "Moved to new directory: $targetPath"
}

$frontendDir = Join-Path (Get-Location).Path "frontend"
Set-Location $frontendDir
Write-Host "Currently in: $(Get-Location)"

Write-Host "Removing corrupted node_modules and .vite cache..."
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}
Write-Host "node_modules removed."

Write-Host "Reinstalling dependencies..."
npm install

Write-Host "Starting the development server..."
npm run dev
