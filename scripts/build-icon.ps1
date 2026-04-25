# build-icon.ps1 — generate a multi-size Windows .ico from the master PNG.
#
# Run once when the logo changes; output lives at
#   src/main/resources/spatio/images/Icon.ico
# and is consumed by the jpackage plugin for the SpatioStudio.exe icon.
#
# No external tools required. Uses .NET System.Drawing to resize and packs
# a modern PNG-embedded ICO (each entry is a PNG blob — Windows Vista+ supports this).

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$src = Join-Path $repoRoot 'src\main\resources\spatio\images\Icon.png'
$dst = Join-Path $repoRoot 'src\main\resources\spatio\images\Icon.ico'

if (-not (Test-Path $src)) { throw "Source PNG not found: $src" }

$sizes = 16, 24, 32, 48, 64, 128, 256

Write-Host "Reading $src ..."
$source = [System.Drawing.Bitmap]::FromFile($src)
Write-Host ("  source dimensions: {0}x{1}" -f $source.Width, $source.Height)

# Resize and encode each size as PNG.
$pngBlobs = @()
foreach ($size in $sizes) {
    $resized = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($source, 0, 0, $size, $size)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBlobs += , $ms.ToArray()
    $resized.Dispose()
    Write-Host ("  {0}x{0}: {1} bytes" -f $size, $ms.Length)
}
$source.Dispose()

# Write ICO container.
$fs = [System.IO.File]::Create($dst)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR (6 bytes)
$bw.Write([UInt16]0)                 # Reserved
$bw.Write([UInt16]1)                 # Type = icon
$bw.Write([UInt16]$sizes.Count)      # Image count

# ICONDIRENTRY entries (16 bytes each)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $size = $sizes[$i]
    $wh = if ($size -ge 256) { 0 } else { $size }   # 0 means 256 per ICO spec
    $bw.Write([Byte]$wh)             # Width
    $bw.Write([Byte]$wh)             # Height
    $bw.Write([Byte]0)               # ColorCount (0 for >= 8bpp)
    $bw.Write([Byte]0)               # Reserved
    $bw.Write([UInt16]1)             # Planes
    $bw.Write([UInt16]32)            # BitCount
    $bw.Write([UInt32]$pngBlobs[$i].Length)
    $bw.Write([UInt32]$offset)
    $offset += $pngBlobs[$i].Length
}

# Image payload (raw PNG blobs, one per size)
foreach ($blob in $pngBlobs) { $bw.Write($blob) }

$bw.Close()
$fs.Close()

Write-Host "Wrote $dst ($([System.IO.FileInfo]::new($dst).Length) bytes)"
