// --- Song storage and state ---
let songs = JSON.parse(localStorage.getItem('songs') || '[]');
let editingIndex = null;
let activeChords = new Set();
let showAllChords = false;

// --- DOM elements ---
const titleInput = document.getElementById('title');
const lyricsInput = document.getElementById('lyrics');
const submitBtn = document.getElementById('submit-btn');
const livePreview = document.getElementById('live-preview');
const songsDiv = document.getElementById('songs');
const promptModal = document.getElementById('prompt-modal');
const showAllChordsCheckbox = document.getElementById('showAllChords');

// --- Live preview updates as you type ---
lyricsInput.addEventListener('input', () => {
  if (!showAllChords) activeChords.clear();
  livePreview.innerHTML = renderScore(lyricsInput.value);
});

// --- Show all chords toggle ---
showAllChordsCheckbox.addEventListener('change', function() {
  showAllChords = this.checked;
  if (showAllChords) {
    activeChords = collectChords(lyricsInput.value);
  } else {
    activeChords.clear();
  }
  livePreview.innerHTML = renderScore(lyricsInput.value);
  renderSongs();
});

// --- Utility: collect all chords in text as Set ---
function collectChords(text) {
  const set = new Set();
  text.replace(/~([^~]+)~/g, (_, chord) => { set.add(chord); return ''; });
  return set;
}

// --- Local storage save ---
function saveSongs() {
  localStorage.setItem('songs', JSON.stringify(songs));
}

// --- Submit/Update song ---
function submitSong() {
  const title = titleInput.value.trim();
  const lyrics = lyricsInput.value.trim();
  if (!title || !lyrics) return;
  const existingIdx = songs.findIndex(song => song.title === title);
  if (editingIndex !== null) {
    songs[editingIndex] = { title, lyrics };
    editingIndex = null;
    submitBtn.textContent = "Submit";
    saveSongs();
    renderSongs();
    livePreview.innerHTML = renderScore(lyricsInput.value);
    return;
  }
  if (existingIdx !== -1) {
    showPromptBox(
      `Song with title "<b>${escapeHTML(title)}</b>" already exists.`,
      [
        { label: "Rename", isRename: true },
        { label: "Overwrite", action: () => {
          songs[existingIdx] = { title, lyrics };
          saveSongs(); renderSongs();
          livePreview.innerHTML = renderScore(lyricsInput.value);
          hidePromptBox();
        }},
        { label: "Cancel", action: () => { hidePromptBox(); } }
      ],
      (newTitle) => {
        if (!newTitle.trim()) return;
        if (songs.some(song => song.title === newTitle.trim())) {
          showPromptBox(
            `A song with "<b>${escapeHTML(newTitle.trim())}</b>" also exists. Try another name.`,
            [
              { label: "Rename", isRename: true },
              { label: "Cancel", action: () => { hidePromptBox(); } }
            ],
            arguments.callee
          );
        } else {
          songs.push({ title: newTitle.trim(), lyrics });
          saveSongs(); renderSongs();
          livePreview.innerHTML = renderScore(lyricsInput.value);
          hidePromptBox();
        }
      }
    );
  } else {
    songs.push({ title, lyrics });
    saveSongs();
    renderSongs();
    livePreview.innerHTML = renderScore(lyricsInput.value);
  }
}

// --- Escape HTML (for safety) ---
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[m];
  });
}

// --- Overwrite/Rename/Cancel prompt modal ---
function showPromptBox(message, actions, renameCallback) {
  let html = `<div class="prompt-modal"><div class="prompt-box">${message}<div>`;
  let renameActive = actions.some(a => a.isRename);
  if (renameActive) {
    html += `<input id="prompt-rename" type="text" value="${escapeHTML(titleInput.value)}" placeholder="New Title">`;
  }
  html += `<div style="margin-top:1em;">`;
  actions.forEach((action, i) => {
    if (action.isRename) {
      html += `<button onclick="onRenamePrompt()">Rename</button>`;
    } else {
      html += `<button onclick="window._promptActions[${i}]()">${action.label}</button>`;
    }
  });
  html += `</div></div></div>`;
  promptModal.innerHTML = html;
  promptModal.style.display = 'flex';
  window._promptActions = actions.map(a => a.action);
  window.onRenamePrompt = () => {
    let newTitle = document.getElementById('prompt-rename').value;
    if (renameCallback) renameCallback(newTitle);
  };
}
function hidePromptBox() {
  promptModal.innerHTML = '';
  promptModal.style.display = 'none';
  window._promptActions = null;
  window.onRenamePrompt = null;
}

// --- Edit existing song ---
function editSong(idx) {
  const song = songs[idx];
  titleInput.value = song.title;
  lyricsInput.value = song.lyrics;
  livePreview.innerHTML = renderScore(song.lyrics);
  editingIndex = idx;
  submitBtn.textContent = "Update";
  window.scrollTo({top: 0, behavior: 'smooth'});
}

// --- Delete song ---
function deleteSong(idx) {
  if (confirm("Delete this song?")) {
    songs.splice(idx, 1);
    saveSongs();
    renderSongs();
    livePreview.innerHTML = renderScore(lyricsInput.value);
  }
}

// --- Render all saved songs ---
function renderSongs() {
  songsDiv.innerHTML = '';
  songs.forEach((song, idx) => {
    const el = document.createElement('div');
    el.className = 'song';
    el.innerHTML =
      `<b>${escapeHTML(song.title)}</b><br>${renderScore(song.lyrics)}
      <div class="actions">
        <button onclick="editSong(${idx})">Edit</button>
        <button onclick="deleteSong(${idx})">Delete</button>
      </div>`;
    songsDiv.appendChild(el);
  });
}

// --- Utility: check for RTL characters ---
function isRTL(s) {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(s);
}

// --- Replace time signatures inline ---
function replaceTimeSignatures(str) {
  return str.replace(/_TS:(C\/2|C|(\d+)\/(\d+))_/g, (match, group1, num, den) => {
    if (group1 === 'C') {
      return '<span class="ts commontime" title="Common Time">&#x1D134;</span>';
    } else if (group1 === 'C/2') {
      return '<span class="ts cuttime" title="Cut Time">&#x1D135;</span>';
    } else if (num && den) {
      return `<span class="ts"><span>${num}</span><span>${den}</span></span>`;
    } else {
      return match;
    }
  });
}

// --- Main lyric/chord/timesig/bar renderer ---
function renderScore(text) {
  let lines = text.split(/\r?\n/);
  let html = '';
  lines.forEach((line, lineIdx) => {
    line = replaceTimeSignatures(line);

    // Build blocks (chord/lyric/bar/html/char)
    let blocks = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '<') {
        let tagEnd = line.indexOf('</span>', i);
        if (tagEnd !== -1) {
          let tag = line.slice(i, tagEnd + 7);
          blocks.push({ type: 'html', html: tag });
          i = tagEnd + 7;
          continue;
        }
      }
      if (line[i] === '|') {
        blocks.push({ type: 'bar' });
        i++;
        continue;
      }
      if (line[i] === '~') {
        let j = i+1;
        while (j < line.length && line[j] !== '~') j++;
        let chord = line.substring(i+1, j);
        i = j+1;
        let lyricChar = '';
        if (i < line.length && line[i] !== '|' && line[i] !== '~') {
          lyricChar = line[i];
          i++;
        }
        blocks.push({
          type: 'chord',
          chord: chord,
          lyric: lyricChar
        });
      } else {
        blocks.push({ type: 'char', char: line[i] });
        i++;
      }
    }

    const rtl = isRTL(line.replace(/<[^>]*>/g, ""));

    let blocksHTML = blocks.map((block) => {
      if (block.type === 'chord') {
        let showSprite = showAllChords || activeChords.has(block.chord);
        return `<span class="block chord-block">
          <button class="chord-btn" tabindex="0" onclick="onChordClick('${block.chord.replace(/'/g,"\\'")}')">${escapeHTML(block.chord)}</button>
          ${showSprite ? `<span class="chord-sprite">{${escapeHTML(block.chord)}}</span>` : ''}
          <span style="height:1em;line-height:1em;">${escapeHTML(block.lyric)}</span>
        </span>`;
      } else if (block.type === 'bar') {
        return '<span class="bar-marker"></span>';
      } else if (block.type === 'html') {
        return block.html;
      } else if (block.type === 'char') {
        return `<span class="block"><span style="height:1em;line-height:1em;"></span><span style="height:1em;line-height:1em;">${escapeHTML(block.char)}</span></span>`;
      }
      return '';
    });

    html += `<div class="score-block">
      <div class="blocks" dir="${rtl ? "rtl" : "ltr"}" style="direction:${rtl ? "rtl" : "ltr"};text-align:${rtl ? "right" : "left"};">
        ${blocksHTML.join('')}
      </div>
    </div>`;
  });
  return html;
}

// --- Chord click: toggle all chords of that name ---
window.onChordClick = function(chord) {
  if (showAllChords) return;
  if (activeChords.has(chord)) activeChords.delete(chord);
  else activeChords.add(chord);
  livePreview.innerHTML = renderScore(lyricsInput.value);
  renderSongs();
};

// --- Initial render on load ---
renderSongs();
livePreview.innerHTML = renderScore(lyricsInput.value);

// --- Expose edit/delete to global for inline handlers ---
window.editSong = editSong;
window.deleteSong = deleteSong;