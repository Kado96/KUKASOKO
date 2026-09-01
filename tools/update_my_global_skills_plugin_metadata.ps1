param(
    [string]$PluginManifest = "C:\Users\Donald\plugins\my-global-skills-codex\.codex-plugin\plugin.json"
)

$ErrorActionPreference = "Stop"

$json = Get-Content -LiteralPath $PluginManifest -Raw | ConvertFrom-Json

$json.description = "Donald global skills imported from Gemini for Codex workflows"
$json.author.name = "Donald"
$json.interface.displayName = "My Global Skills"
$json.interface.shortDescription = "Donald global skill manager for Codex."
$json.interface.longDescription = "Imports Donald's Gemini my-global-skills library as a local Codex plugin with normalized native skills and the auto-skill-manager index."
$json.interface.developerName = "Donald"
$json.interface.defaultPrompt = "Use my global skills manager to choose the right workflow before working."

$output = $json | ConvertTo-Json -Depth 20
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($PluginManifest, $output, $utf8NoBom)

"UPDATED_PLUGIN_MANIFEST=$PluginManifest"
