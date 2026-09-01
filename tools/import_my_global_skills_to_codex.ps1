param(
    [string]$SourceRoot = "C:\Users\Donald\.gemini\config\plugins\my-global-skills",
    [string]$NativeSkillsRoot = "C:\Users\Donald\.codex\skills",
    [string]$PluginRoot = "C:\Users\Donald\plugins\my-global-skills-codex"
)

$ErrorActionPreference = "Stop"

function Convert-ToSkillName {
    param([string]$Name)
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($Name)
    $withWordBreaks = [regex]::Replace($baseName, '([a-z0-9])([A-Z])', '$1-$2')
    $normalized = $withWordBreaks.ToLowerInvariant() -replace '[^a-z0-9]+', '-'
    $normalized = $normalized.Trim('-') -replace '-+', '-'
    if ([string]::IsNullOrWhiteSpace($normalized)) {
        throw "Cannot normalize skill name from '$Name'"
    }
    return $normalized
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Set-SkillNameInMarkdown {
    param(
        [string]$Content,
        [string]$SkillName
    )

    if ($Content -match '(?s)\A---\r?\n(.*?)\r?\n---\r?\n') {
        $frontmatter = $Matches[1]
        $body = $Content.Substring($Matches[0].Length)
        if ($frontmatter -match '(?m)^name:\s*.+$') {
            $frontmatter = [regex]::Replace($frontmatter, '(?m)^name:\s*.+$', "name: $SkillName", 1)
        }
        else {
            $frontmatter = "name: $SkillName`n$frontmatter"
        }
        return "---`n$frontmatter`n---`n$body"
    }

    return "---`nname: $SkillName`ndescription: Imported from Donald's my-global-skills Gemini plugin.`n---`n`n$Content"
}

function Copy-SkillDirectory {
    param(
        [System.IO.FileInfo]$SkillFile,
        [string]$DestinationRoot,
        [bool]$SkipExistingNative
    )

    $sourceDir = $SkillFile.Directory.FullName
    $skillName = Convert-ToSkillName $SkillFile.Directory.Name
    $destinationDir = Join-Path $DestinationRoot $skillName

    if ($SkipExistingNative -and (Test-Path -LiteralPath $destinationDir)) {
        return [pscustomobject]@{ Name = $skillName; Destination = $destinationDir; Status = "skipped-existing" }
    }

    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    Get-ChildItem -LiteralPath $sourceDir -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $destinationDir -Recurse -Force
    }

    $destinationSkill = Join-Path $destinationDir 'SKILL.md'
    $content = Get-Content -LiteralPath $destinationSkill -Raw -Encoding utf8
    $updated = Set-SkillNameInMarkdown -Content $content -SkillName $skillName
    Write-Utf8NoBom -Path $destinationSkill -Content $updated

    return [pscustomobject]@{ Name = $skillName; Destination = $destinationDir; Status = "copied" }
}

function Write-ManagerSkill {
    param(
        [string]$DestinationRoot,
        [bool]$SkipExistingNative
    )

    $destinationDir = Join-Path $DestinationRoot 'auto-skill-manager'
    if ($SkipExistingNative -and (Test-Path -LiteralPath $destinationDir)) {
        return [pscustomobject]@{ Name = 'auto-skill-manager'; Destination = $destinationDir; Status = "skipped-existing" }
    }

    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    $sourceRule = Join-Path $SourceRoot 'rules\auto-skill-manager.md'
    $body = Get-Content -LiteralPath $sourceRule -Raw -Encoding utf8
    $content = "---
name: auto-skill-manager
description: Central index for Donald's global skills. Use to select the right imported skill before starting broad, repetitive, strategic, or technical workflows.
---

$body
"
    Write-Utf8NoBom -Path (Join-Path $destinationDir 'SKILL.md') -Content $content

    return [pscustomobject]@{ Name = 'auto-skill-manager'; Destination = $destinationDir; Status = "copied" }
}

$sourceSkillsRoot = Join-Path $SourceRoot 'skills'
$pluginSkillsRoot = Join-Path $PluginRoot 'skills'

if (!(Test-Path -LiteralPath $sourceSkillsRoot)) {
    throw "Source skills directory not found: $sourceSkillsRoot"
}
if (!(Test-Path -LiteralPath $PluginRoot)) {
    throw "Plugin root not found: $PluginRoot"
}

New-Item -ItemType Directory -Force -Path $NativeSkillsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $pluginSkillsRoot | Out-Null

$skillFiles = Get-ChildItem -LiteralPath $sourceSkillsRoot -Filter 'SKILL.md' -Recurse -File
$results = @()

foreach ($skillFile in $skillFiles) {
    $results += Copy-SkillDirectory -SkillFile $skillFile -DestinationRoot $pluginSkillsRoot -SkipExistingNative $false
    $results += Copy-SkillDirectory -SkillFile $skillFile -DestinationRoot $NativeSkillsRoot -SkipExistingNative $false
}

$results += Write-ManagerSkill -DestinationRoot $pluginSkillsRoot -SkipExistingNative $false
$results += Write-ManagerSkill -DestinationRoot $NativeSkillsRoot -SkipExistingNative $false

$summary = $results | Group-Object Status | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ Status = $_.Name; Count = $_.Count }
}

$summary | Format-Table -AutoSize

"TOTAL_SOURCE_SKILLS=$($skillFiles.Count)"
"TOTAL_OPERATIONS=$($results.Count)"
"PLUGIN_SKILLS_ROOT=$pluginSkillsRoot"
"NATIVE_SKILLS_ROOT=$NativeSkillsRoot"
