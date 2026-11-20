$ErrorActionPreference = 'Stop'
$seed = Get-Content -Raw 'apps/api/prisma/seed.ts'
$password = [regex]::Match($seed, "const adminPasswordHash = await bcrypt\.hash\('([^']+)'").Groups[1].Value
$email = [regex]::Match($seed, "email: '([^']+)', pass: adminPasswordHash, role: Role\.SUPER_ADMIN").Groups[1].Value
if (-not $email -or -not $password) { throw 'Could not derive seeded test account from seed source.' }
$base = 'http://127.0.0.1:4000/api/v1'
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email=$email;password=$password}|ConvertTo-Json -Compress)
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
$agents = (Invoke-RestMethod -Uri "$base/agents" -Headers $headers).agents
if ($agents.Count -ne 19) { throw "Expected 19 registered agents; found $($agents.Count)." }
$invoked = 0
$successful = 0
$unavailable = 0
$failed = @()
foreach ($agent in $agents) {
  $params = @{}
  if ($agent.id -eq 'dev-autocoding') { $params.previewOnly = $true }
  $response = Invoke-RestMethod -Method Post -Uri "$base/agents/$($agent.id)/run" -Headers $headers -ContentType 'application/json' -Body (@{params=$params}|ConvertTo-Json -Depth 10 -Compress)
  $invoked++
  if ($response.success) { $successful++ }
  if ($response.data.status -eq 'UNAVAILABLE' -or $response.data.status -eq 'MOCK_UNVERIFIED' -or $response.error) { $unavailable++ }
  if (-not $response -or -not $response.summary) { $failed += $agent.id }
}
$audit = (Invoke-RestMethod -Uri "$base/agents/audit-trail" -Headers $headers).trails
$agentNames = @($agents | ForEach-Object { $_.name })
$audited = @($audit | Where-Object { $agentNames -contains $_.agentName } | Select-Object -ExpandProperty agentName -Unique).Count
"AGENT_REGISTERED $($agents.Count)/19"
"AGENT_INVOKED $invoked/19"
"AGENT_AUDIT_COVERAGE $audited/19"
"AGENT_SUCCEEDED $successful; unavailable_or_review_required=$unavailable"
if ($failed.Count) { "AGENT_MISSING_SUMMARY $($failed -join ',')"; exit 1 }
