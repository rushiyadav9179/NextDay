$ErrorActionPreference = 'Stop'
$seed = Get-Content -Raw 'apps/api/prisma/seed.ts'
$regularPassword = [regex]::Match($seed, "const passwordHash = await bcrypt\.hash\('([^']+)'").Groups[1].Value
$adminPassword = [regex]::Match($seed, "const adminPasswordHash = await bcrypt\.hash\('([^']+)'").Groups[1].Value
$userMatches = [regex]::Matches($seed, "email: '([^']+)', pass: (adminPasswordHash|passwordHash), role: Role\.(\w+)")
if (-not $regularPassword -or -not $adminPassword -or $userMatches.Count -ne 6) { throw 'Could not derive seeded test users from seed source.' }

function Get-Status([string]$Uri, [string]$Token) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec 12
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return 0
  }
}

$base = 'http://127.0.0.1:4000/api/v1'
$tokens = @{}
foreach ($match in $userMatches) {
  $email = $match.Groups[1].Value
  $password = if ($match.Groups[2].Value -eq 'adminPasswordHash') { $adminPassword } else { $regularPassword }
  $role = $match.Groups[3].Value
  $body = @{ email = $email; password = $password } | ConvertTo-Json -Compress
  try {
    $login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $body -TimeoutSec 15
    if (-not $login.accessToken -or $login.user.role -ne $role) { throw 'Unexpected login result' }
    $tokens[$role] = $login.accessToken
    "LOGIN $role PASS"
  } catch {
    "LOGIN $role FAIL"
  }
}

if ($tokens.Count -ne 6) { throw 'At least one seeded role could not log in.' }

$cases = @(
  @{ path='/auth/me'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200 },
  @{ path='/dashboard'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE') },
  @{ path='/admin/users'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN') },
  @{ path='/admin/tenant'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN') },
  @{ path='/candidates'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER') },
  @{ path='/payroll/runs'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN') },
  @{ path='/agents'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200 },
  @{ path='/agents/runs'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER') },
  @{ path='/employees'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE') },
  @{ path='/attendance'; roles=@('SUPER_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE') },
  @{ path='/leave'; roles=@('SUPER_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE') },
  @{ path='/payroll/payslips'; roles=@('SUPER_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN','MANAGER','EMPLOYEE') },
  @{ path='/emails/templates'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200; deny=403; allowed=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER') },
  @{ path='/custom-modules'; roles=@('SUPER_ADMIN','HR_ADMIN','RECRUITER','MANAGER','EMPLOYEE','CANDIDATE'); allow=200 }
)

$passed = 0
$failed = 0
foreach ($case in $cases) {
  foreach ($role in $case.roles) {
    $expected = if ($case.allowed) { if ($case.allowed -contains $role) { $case.allow } else { $case.deny } } else { $case.allow }
    $actual = Get-Status "$base$($case.path)" $tokens[$role]
    if ($actual -eq $expected) { $passed++ } else { $failed++; "ROUTE FAIL $role $($case.path) expected=$expected actual=$actual" }
  }
}
"ROLE_ROUTE_CHECKS passed=$passed failed=$failed"
if ($failed -gt 0) { exit 1 }
