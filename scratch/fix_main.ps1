$filePath = "c:\Users\UvaanG\Desktop\brand-strategy-agent\src\main.ts"
$lines = [System.IO.File]::ReadAllLines($filePath, [System.Text.Encoding]::UTF8)

$replacement = @'
// --- CSV: ANALYTICS UPLOAD ---

btnCsvUpload.addEventListener('click', () => csvFileInput.click());
csvFileInput.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processCSVFile(
      target.files[0],
      (msg) => addSystemMessage(msg),
      (msg) => addSystemMessage(msg)
    );
  }
  csvFileInput.value = '';
});

// Drag & Drop
const chatInputArea = document.querySelector('.chat-input-area')!;
['dragenter', 'dragover'].forEach(evt => {
  chatInputArea.addEventListener(evt, (e) => {
    e.preventDefault();
    fileUploadZone.classList.add('active');
  });
});
['dragleave', 'drop'].forEach(evt => {
  chatInputArea.addEventListener(evt, (e) => {
    e.preventDefault();
    fileUploadZone.classList.remove('active');
  });
});
chatInputArea.addEventListener('drop', (e) => {
  e.preventDefault();
  const de = e as DragEvent;
  const files = de.dataTransfer?.files;
  if (files && files.length > 0) {
    processFileSelection(files[0]);
  }
});

// --- SCRIPTS PAGE ---

const scriptsPage = document.getElementById('scripts-page');
const btnScripts = document.getElementById('btn-scripts');
const btnScriptsClose = document.getElementById('btn-scripts-close');
const scriptsContainer = document.getElementById('scripts-list-container');

if (btnScripts) {
  btnScripts.addEventListener('click', () => {
    if (scriptsPage) {
      scriptsPage.classList.remove('hidden');
      setScriptManagerCallbacks(refreshUI, currentUserId);
      if (scriptsContainer) renderScriptManager(scriptsContainer);
    }
  });
}

if (btnScriptsClose) {
  btnScriptsClose.addEventListener('click', () => {
    if (scriptsPage) scriptsPage.classList.add('hidden');
  });
}

// --- WELCOME SCREEN ---

function showWelcome(): void {
  chatMessages.innerHTML = `
    <div class="welcome-card">
      <h1>Build Your B.I.G Doc</h1>
      <p>Let Brandy guide you through the VMV8 framework — 8 sections that define your brand's identity, voice, and strategy.</p>
      <div class="welcome-sections">
        ${FRAMEWORK.map(s => `
          <div class="welcome-section-chip">
            <div class="welcome-chip-dot" style="background: ${s.color}"></div>
            ${s.icon} ${s.label}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  setTimeout(() => {
    addSystemMessage({
      role: 'agent',
      content: `Welcome! I'm **Brandy**, your VMV8 Brand Strategy Agent.\n\nI'll help you build your **B.I.G Doc** (Brand Identity Guiding Document) across **8 sections**.\n\nHow would you like to get started?`,
      quickActions: [
        'Guided Interview (recommended)',
        'Record a meeting',
        'Paste a transcript',
        'Free chat',
      ],
    });
  }, 500);
}
'@

$replacementLines = $replacement -split "`n"

# Lines are 0-indexed in the array, but 1-indexed in editor
# We want to replace lines 1192 (0-indexed: 1191) through 1260 (0-indexed: 1259)
$before = $lines[0..1191]
$after = $lines[1260..($lines.Count - 1)]

$newLines = $before + $replacementLines + $after

[System.IO.File]::WriteAllLines($filePath, $newLines, (New-Object System.Text.UTF8Encoding $true))

Write-Host "Done. Replaced lines 1193-1260. New total: $($newLines.Count) lines"
