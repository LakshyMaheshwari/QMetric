param(
    [string]$Email = 'faculty@wce.ac.in',
    [Parameter(Mandatory = $true)][string]$PaperId
)

$BaseUrl = 'http://127.0.0.1:5000'

# -- Step 1: Get dev auth token ------------------------------------
$tokenResp = Invoke-RestMethod -Uri "$BaseUrl/dev/login" `
    -Method Post -Body (@{ email = $Email } | ConvertTo-Json) `
    -ContentType 'application/json' -ErrorAction Stop
$token = $tokenResp.token

$headers = @{
    Authorization = "Bearer $token"
    'Content-Type' = 'application/json'
}

# -- Counters ------------------------------------------------------
$script:passed = 0
$script:failed = 0

function Invoke-Test {
    param(
        [string]$Name,
        [scriptblock]$Script
    )
    try {
        & $Script
        Write-Host "PASS: $Name" -ForegroundColor Green
        $script:passed++
        return $true
    }
    catch {
        Write-Host "FAIL: $Name" -ForegroundColor Red

        $errorBody = $null
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $errorBody = $_.ErrorDetails.Message
        }
        else {
            try {
                $resp = $_.Exception.Response
                if ($resp) {
                    $stream = $resp.GetResponseStream()
                    $reader = [System.IO.StreamReader]::new($stream)
                    $errorBody = $reader.ReadToEnd()
                    $reader.Dispose()
                }
            }
            catch { }
        }

        if ($errorBody) {
            try {
                $parsed = $errorBody | ConvertFrom-Json -ErrorAction Stop
                Write-Host "  Response: $($parsed | ConvertTo-Json -Compress)" -ForegroundColor Red
            }
            catch {
                Write-Host "  Response: $errorBody" -ForegroundColor Red
            }
        }
        else {
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        }

        $script:failed++
        return $false
    }
}

# -- SECTION: Corrections ------------------------------------------
Write-Host "`n=== Corrections ===" -ForegroundColor Cyan

Invoke-Test "Submit correction (questionIndex 0)" {
    $body = @{
        questionIndex      = 0
        correctedDomain    = 'cognitive'
        correctedLevel     = 5
        correctedLevelName = 'Analyze'
        reason             = 'Dev smoke test correction'
    } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$BaseUrl/reviewer/papers/$PaperId/corrections" `
        -Method Post -Body $body -Headers $headers -ErrorAction Stop
    if (-not $resp) { throw 'Empty response' }
}

$script:corrections = $null
Invoke-Test "List corrections" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/reviewer/papers/$PaperId/corrections" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
    $total = $resp.corrections.Count
    if ($total -lt 1) { throw "Expected >= 1 correction, got $total" }
    $script:corrections = $resp.corrections
}

Invoke-Test "Get single correction" {
    if ($null -eq $script:corrections) { throw 'Corrections not loaded; skipping' }
    $firstQIdx = $script:corrections[0].questionIndex
    $resp = Invoke-RestMethod -Uri "$BaseUrl/reviewer/papers/$PaperId/corrections/$firstQIdx" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

Invoke-Test "Update correction (correctedLevel === 5)" {
    if ($null -eq $script:corrections) { throw 'Corrections not loaded; skipping' }
    $firstQIdx = $script:corrections[0].questionIndex
    $body = @{ correctedLevel = 5 } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$BaseUrl/reviewer/papers/$PaperId/corrections/$firstQIdx" `
        -Method Put -Body $body -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
    if ($resp.updated.correctedLevel -ne 5) { throw "Expected correctedLevel === 5, got $($resp.updated.correctedLevel)" }
}

Invoke-Test "Delete correction" {
    if ($null -eq $script:corrections) { throw 'Corrections not loaded; skipping' }
    $firstQIdx = $script:corrections[0].questionIndex
    $resp = Invoke-RestMethod -Uri "$BaseUrl/reviewer/papers/$PaperId/corrections/$firstQIdx" `
        -Method Delete -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

# -- SECTION: Bloom recommendations --------------------------------
Write-Host "`n=== Bloom Recommendations ===" -ForegroundColor Cyan

Invoke-Test "GET bloom recommendations" {
    try {
        $resp = Invoke-RestMethod -Uri "$BaseUrl/reviewer/papers/$PaperId/recommendations/bloom" `
            -Method Get -Headers $headers -ErrorAction Stop
        if ($resp.error -eq $true) { throw "Unexpected error: $($resp.message)" }
    }
    catch {
        $msg = $_.ErrorDetails.Message
        if ($msg -match 'not yet generated') { return }  # acceptable
        throw
    }
}

# -- SECTION: OCR logs ---------------------------------------------
Write-Host "`n=== OCR Logs ===" -ForegroundColor Cyan

$script:ocrLogs = $null
Invoke-Test "List OCR logs" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/admin/ocr-logs" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
    $script:ocrLogs = $resp.logs
}

Invoke-Test "Get OCR stats" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/admin/ocr-logs/stats" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

Invoke-Test "Get + verify first OCR log" {
    if ($null -eq $script:ocrLogs -or $script:ocrLogs.Count -eq 0) {
        Write-Host "  Skipped (no OCR logs found)" -ForegroundColor Yellow
        return
    }
    $logId = $script:ocrLogs[0]._id
    $logResp = Invoke-RestMethod -Uri "$BaseUrl/admin/ocr-logs/$logId" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($logResp.error -eq $true) { throw "API error: $($logResp.message)" }
    $verResp = Invoke-RestMethod -Uri "$BaseUrl/admin/ocr-logs/$logId/verify" `
        -Method Put -Headers $headers -ErrorAction Stop
    if ($verResp.error -eq $true) { throw "API error: $($verResp.message)" }
}
# -- SECTION: Learned verbs ----------------------------------------
Write-Host "`n=== Learned Verbs ===" -ForegroundColor Cyan

Invoke-Test "List learned verbs" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/super-admin/learned-verbs" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

Invoke-Test "Create learned verb" {
    $body = @{
        verb = 'smoketestverb'
        domain = 'cognitive'
        level = 3
        confidence = 0.9
        context = 'smoke test'
    } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$BaseUrl/super-admin/learned-verbs" `
        -Method Post -Body $body -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
    $script:createdVerbId = $resp.learnedVerb._id
}

Invoke-Test "Update learned verb" {
    if (-not $script:createdVerbId) { throw 'No verb to update' }
    $body = @{ level = 4 } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$BaseUrl/super-admin/learned-verbs/$($script:createdVerbId)" `
        -Method Put -Body $body -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

Invoke-Test "Delete learned verb" {
    if (-not $script:createdVerbId) { throw 'No verb to delete' }
    $resp = Invoke-RestMethod -Uri "$BaseUrl/super-admin/learned-verbs/$($script:createdVerbId)" `
        -Method Delete -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

Invoke-Test "Suggestions endpoint" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/super-admin/learned-verbs/suggestions" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

# -- SECTION: Paper metadata ---------------------------------------
Write-Host "`n=== Paper Metadata ===" -ForegroundColor Cyan

Invoke-Test "Get paper metadata" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/reviewer/papers/$PaperId/metadata" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

# -- SECTION: Bulk register helpers + email -------------------------
Write-Host "`n=== Bulk Register Helpers ===" -ForegroundColor Cyan

Invoke-Test "GET bulk register format" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/auth/bulk-register/format" -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
    if (-not $resp.format.columns) { throw "Missing format.columns" }
}

Invoke-Test "GET bulk register template" {
    $resp = Invoke-WebRequest -Uri "$BaseUrl/auth/bulk-register/template" `
        -Method Get -Headers $headers -UseBasicParsing -ErrorAction Stop
    if ($resp.StatusCode -ne 200) { throw "Expected 200, got $($resp.StatusCode)" }
}

Write-Host "`n=== Email Endpoints ===" -ForegroundColor Cyan

Invoke-Test "GET email test" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/super-admin/email/test" -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

# -- SECTION: Notifications ----------------------------------------
Write-Host "`n=== Notifications ===" -ForegroundColor Cyan

Invoke-Test "Get unread count" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/notifications/unread-count" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
    if ($null -eq $resp.unreadCount) { throw "No unreadCount field" }
}

Invoke-Test "List notifications" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/notifications?limit=10" `
        -Method Get -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
    if ($null -eq $resp.notifications) { throw "No notifications field" }
    $script:notifications = $resp.notifications
}

Invoke-Test "Mark all as read" {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/notifications/read-all" `
        -Method Put -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

Invoke-Test "Delete first notification (if any)" {
    if ($null -eq $script:notifications -or $script:notifications.Count -eq 0) {
        Write-Host "  Skipped (no notifications)" -ForegroundColor Yellow
        return
    }
    $nid = $script:notifications[0]._id
    $resp = Invoke-RestMethod -Uri "$BaseUrl/notifications/$nid" `
        -Method Delete -Headers $headers -ErrorAction Stop
    if ($resp.error -eq $true) { throw "API error: $($resp.message)" }
}

# -- Summary -------------------------------------------------------
Write-Host ""
if ($script:failed -eq 0) {
    Write-Host "$($script:passed) passed, 0 failed" -ForegroundColor Green
    exit 0
} else {
    Write-Host "$($script:passed) passed, $($script:failed) failed" -ForegroundColor Red
    exit 1
}