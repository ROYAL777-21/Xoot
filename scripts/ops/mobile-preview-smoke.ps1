param(
  [string]$AndroidApkPath,
  [string]$IosSimulatorArchivePath,
  [switch]$InstallAndroid,
  [switch]$RequireAndroidDevice,
  [switch]$Json
)

$ErrorActionPreference = "Continue"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Area,
    [string]$Name,
    [string]$Status,
    [string]$Detail
  )

  $checks.Add([pscustomobject]@{
    area = $Area
    name = $Name
    status = $Status
    detail = $Detail
  })
}

function Resolve-InputPath {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return $null
  }

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return $Path
  }

  return Join-Path $repoRoot $Path
}

function Resolve-LatestArtifact {
  param(
    [string]$Directory,
    [string]$Pattern
  )

  $rootedDirectory = Join-Path $repoRoot $Directory
  if (-not (Test-Path -LiteralPath $rootedDirectory -PathType Container)) {
    return $null
  }

  $item = Get-ChildItem -LiteralPath $rootedDirectory -Filter $Pattern -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($item) {
    return $item.FullName
  }

  return $null
}

function Add-ArtifactCheck {
  param(
    [string]$Area,
    [string]$Path
  )

  $resolved = Resolve-InputPath $Path
  if ([string]::IsNullOrWhiteSpace($resolved)) {
    Add-Check $Area "artifact present" "fail" "No artifact path supplied and no matching default artifact was found."
    return $null
  }

  if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
    Add-Check $Area "artifact present" "fail" "Missing artifact: $resolved"
    return $null
  }

  $item = Get-Item -LiteralPath $resolved
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $resolved
  Add-Check $Area "artifact present" "pass" "$($item.FullName) ($($item.Length) bytes, sha256 $($hash.Hash))"
  return $item.FullName
}

function Test-IsMacOS {
  return [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
    [System.Runtime.InteropServices.OSPlatform]::OSX
  )
}

if ([string]::IsNullOrWhiteSpace($AndroidApkPath)) {
  $AndroidApkPath = Resolve-LatestArtifact -Directory "outputs" -Pattern "*.apk"
}

if ([string]::IsNullOrWhiteSpace($IosSimulatorArchivePath)) {
  $IosSimulatorArchivePath = Resolve-LatestArtifact -Directory "mobile/outputs" -Pattern "*ios-simulator*.tar.gz"
}

$androidApk = Add-ArtifactCheck "android-preview" $AndroidApkPath
$iosArchive = Add-ArtifactCheck "ios-preview" $IosSimulatorArchivePath

if ($androidApk) {
  $adb = Get-Command adb -ErrorAction SilentlyContinue
  if (-not $adb) {
    $status = if ($RequireAndroidDevice -or $InstallAndroid) { "fail" } else { "manual" }
    Add-Check "android-preview" "adb available" $status "adb is not installed or not on PATH. Install Android Platform Tools, enable USB debugging, then rerun with -InstallAndroid."
  } else {
    Add-Check "android-preview" "adb available" "pass" $adb.Source
    $deviceOutput = & $adb.Source devices 2>&1
    $authorizedDevices = @(
      $deviceOutput |
        Where-Object { $_ -match "^\S+\s+device$" } |
        ForEach-Object { ($_ -split "\s+")[0] }
    )

    if ($authorizedDevices.Count -eq 0) {
      $status = if ($RequireAndroidDevice -or $InstallAndroid) { "fail" } else { "manual" }
      Add-Check "android-preview" "authorized Android device" $status "No authorized Android device found. Connect a device, enable USB debugging, and accept the RSA prompt."
    } else {
      Add-Check "android-preview" "authorized Android device" "pass" ($authorizedDevices -join ", ")

      if ($InstallAndroid) {
        $installOutput = & $adb.Source -s $authorizedDevices[0] install -r $androidApk 2>&1
        $installText = ($installOutput -join "`n")
        if ($LASTEXITCODE -eq 0 -and $installText -match "(?m)Success") {
          Add-Check "android-preview" "APK installed" "pass" "Installed $androidApk on $($authorizedDevices[0])."
        } else {
          Add-Check "android-preview" "APK installed" "fail" $installText
        }
      } else {
        Add-Check "android-preview" "APK installed" "manual" "Rerun with -InstallAndroid to install on the connected device."
      }
    }
  }
}

if ($iosArchive) {
  if (Test-IsMacOS) {
    $xcrun = Get-Command xcrun -ErrorAction SilentlyContinue
    if ($xcrun) {
      Add-Check "ios-preview" "simulator tooling" "pass" "xcrun is available. Extract the archive on macOS and install the .app with simctl."
    } else {
      Add-Check "ios-preview" "simulator tooling" "manual" "xcrun was not found. Install Xcode command line tools on macOS."
    }
  } else {
    Add-Check "ios-preview" "simulator tooling" "manual" "This is not macOS. The simulator archive must be tested on a Mac with Xcode."
  }

  Add-Check "ios-preview" "physical iOS preview" "manual" "The current artifact is simulator-only. A physical iPhone preview requires EAS iOS internal-distribution credentials and a non-simulator iOS preview build."
}

$summary = [pscustomobject]@{
  checkedAt = (Get-Date).ToString("o")
  pass = @($checks | Where-Object status -eq "pass").Count
  fail = @($checks | Where-Object status -eq "fail").Count
  manual = @($checks | Where-Object status -eq "manual").Count
}

if ($Json) {
  [pscustomobject]@{
    summary = $summary
    checks = $checks
  } | ConvertTo-Json -Depth 5
} else {
  $summary | Format-List
  $checks | Sort-Object area, name | Format-Table area, status, name, detail -AutoSize -Wrap
}

if ($summary.fail -gt 0) {
  exit 1
}
