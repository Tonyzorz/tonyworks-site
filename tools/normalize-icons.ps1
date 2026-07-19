# Normalises exported sprite PNGs so every icon RENDERS at the same visual size.
#
# Why: the source art has wildly different amounts of transparent margin. Older gear sits in
# roughly 38-43% of its canvas, newer World Gate gear fills 90-98%. The site draws icons with
# object-fit:contain, which fits the WHOLE canvas (empty margin included), so a loosely-cropped
# sprite renders about half the size of a tight one. CSS cannot detect transparent padding, so
# the pixels have to be fixed.
#
# What it does per image: find the opaque bounding box, crop to it, then scale that artwork so
# its longest side occupies -Fill of a square -Size canvas, centred. Aspect ratio is preserved,
# nothing is stretched. Idempotent: an image already square and already at the target fill is
# skipped, so re-running does not resample repeatedly.
#
#   powershell -ExecutionPolicy Bypass -File tools\normalize-icons.ps1 -dir <img dir>
#
# ASCII-only + -dir passed in: Windows PowerShell 5.1 reads .ps1 as ANSI, so a non-ASCII path
# baked into this file would be mangled.
param(
  [Parameter(Mandatory = $true)][string]$dir,
  [string]$Filter = "item_*.png",
  [int]$Size = 256,
  [double]$Fill = 0.92,
  [int]$AlphaThreshold = 16
)
Add-Type -AssemblyName System.Drawing

function Get-OpaqueBounds($bmp) {
  $w = $bmp.Width; $h = $bmp.Height
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $data.Stride
  $bytes = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $w; $x++) {
      if ($bytes[$row + $x * 4 + 3] -gt $AlphaThreshold) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { return $null }
  [pscustomobject]@{ X = $minX; Y = $minY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1) }
}

function Normalize-Icon($path) {
  $src = New-Object System.Drawing.Bitmap $path
  $b = Get-OpaqueBounds $src
  if ($null -eq $b) { $src.Dispose(); return "empty" }   # fully transparent - leave it alone

  # Already normalised? square canvas at the right size and the artwork already at target fill.
  $curFill = [Math]::Max($b.W, $b.H) / [double]$Size
  if ($src.Width -eq $Size -and $src.Height -eq $Size -and [Math]::Abs($curFill - $Fill) -lt 0.02) {
    $src.Dispose(); return "skip"
  }

  $target = $Size * $Fill
  $scale = $target / [Math]::Max($b.W, $b.H)
  $nw = [Math]::Max(1, [int][Math]::Round($b.W * $scale))
  $nh = [Math]::Max(1, [int][Math]::Round($b.H * $scale))

  $out = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode   = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode     = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality  = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $dstRect = New-Object System.Drawing.Rectangle ([int](($Size - $nw) / 2)), ([int](($Size - $nh) / 2)), $nw, $nh
  $srcRect = New-Object System.Drawing.Rectangle $b.X, $b.Y, $b.W, $b.H
  $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $src.Dispose()   # release the file lock before writing back over it
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  return "done"
}

$done = 0; $skip = 0; $empty = 0
Get-ChildItem $dir -Filter $Filter | ForEach-Object {
  switch (Normalize-Icon $_.FullName) {
    "done"  { $done++ }
    "skip"  { $skip++ }
    "empty" { $empty++; Write-Host ("  fully transparent, left as-is: " + $_.Name) }
  }
}
"Normalized $done, already-ok $skip, empty $empty  (filter $Filter -> ${Size}px @ $([int]($Fill*100))% fill)"
