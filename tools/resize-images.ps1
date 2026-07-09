# Downscales exported sprite PNGs to 256px (app_icon to 512px) in place.
# ASCII-only + $PSScriptRoot so it is safe to run as a file on Windows PowerShell.
#   powershell -ExecutionPolicy Bypass -File tools\resize-images.ps1
Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot "..\apps\infinite-loot-loop\assets\img"

function Resize-Png($path, $max) {
  $img = [System.Drawing.Image]::FromFile($path)
  $big = [Math]::Max($img.Width, $img.Height)
  if ($big -le $max) { $img.Dispose(); return $false }
  $scale = $max / $big
  $nw = [Math]::Max(1, [int]($img.Width * $scale)); $nh = [Math]::Max(1, [int]($img.Height * $scale))
  $bmp = New-Object System.Drawing.Bitmap $nw, $nh
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $nw, $nh); $g.Dispose()
  $img.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  return $true
}

$n = 0
Get-ChildItem $dir -Filter *.png | ForEach-Object {
  if ($_.Name -like 'map_*') { return }
  $max = if ($_.Name -eq 'app_icon.png') { 512 } else { 256 }
  if (Resize-Png $_.FullName $max) { $n++ }
}
"Resized $n images"
"Total: {0:N1} MB" -f ((Get-ChildItem $dir -Recurse | Measure-Object Length -Sum).Sum / 1MB)
