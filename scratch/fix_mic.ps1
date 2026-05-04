$filePath = "c:\Users\UvaanG\Desktop\brand-strategy-agent\src\main.ts"
$lines = [System.IO.File]::ReadAllLines($filePath, [System.Text.Encoding]::UTF8)

$replacement = @'
btnMic.addEventListener('click', async () => {
  if (audioState.isRecording) {
    stopRecordingLimitBar();
    stopRecording(true, recordingElements, (text) => {
      const transcript = createTranscript({
        name: `Recording ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        text,
        source: 'recording',
      });
      if (currentUserId) {
        syncTranscriptToSupabase(currentUserId, transcript);
        incrementRecordingSession(currentUserId);
      }
      showTranscriptionModal(`[Audio Recording]\n\n${text}`);
    }, addSystemMessage);
  } else {
    // Check 24-session limit
    if (state.recordingSessionCount >= MAX_RECORDING_SESSIONS) {
      addSystemMessage({
        role: 'agent',
        content: `You've reached the maximum of **${MAX_RECORDING_SESSIONS} recording sessions**. Please delete old recordings or upgrade your plan to record more.`,
      });
      return;
    }
    startRecording(recordingElements, addSystemMessage);
    startRecordingLimitBar();
  }
});

btnStopRecording.addEventListener('click', () => {
  stopRecordingLimitBar();
  stopRecording(true, recordingElements, (text) => {
    const transcript = createTranscript({
      name: `Recording ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      text,
      source: 'recording',
    });
    if (currentUserId) {
      syncTranscriptToSupabase(currentUserId, transcript);
      incrementRecordingSession(currentUserId);
    }
    showTranscriptionModal(`[Audio Recording]\n\n${text}`);
  }, addSystemMessage);
});

btnCancelRecording.addEventListener('click', () => {
  stopRecordingLimitBar();
  stopRecording(false, recordingElements, handleUserInput, addSystemMessage);
  addSystemMessage({ role: 'agent', content: `Recording cancelled.` });
});
'@

$replacementLines = $replacement -split "`n"

# Replace lines 1014-1033 (0-indexed: 1013-1032)
$before = $lines[0..1012]
$after = $lines[1033..($lines.Count - 1)]

$newLines = $before + $replacementLines + $after

[System.IO.File]::WriteAllLines($filePath, $newLines, (New-Object System.Text.UTF8Encoding $true))

Write-Host "Done. Replaced mic handlers at lines 1014-1033. New total: $($newLines.Count) lines"
