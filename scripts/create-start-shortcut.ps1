param(
    [string]$DestinationDirectory
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not $DestinationDirectory) {
    $DestinationDirectory = $projectRoot
}

$targetPath = Join-Path $projectRoot "start-server.bat"
$iconPath = Join-Path $projectRoot "assets\course-manager.ico"
$shortcutPath = Join-Path $DestinationDirectory "Course Manager.lnk"

if (-not (Test-Path -LiteralPath $targetPath)) {
    throw "Launcher not found: $targetPath"
}

if (-not (Test-Path -LiteralPath $iconPath)) {
    throw "Icon not found: $iconPath"
}

if (-not (Test-Path -LiteralPath $DestinationDirectory)) {
    New-Item -ItemType Directory -Path $DestinationDirectory | Out-Null
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = "Start the Course Manager development server"
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Output "Shortcut: $shortcutPath"
