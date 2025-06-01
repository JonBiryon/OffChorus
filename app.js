// == Supabase configuration ==
const SUPABASE_URL = 'https://kktkzkypfeqipdmchowc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdGt6a3lwZmVxaXBkbWNob3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDE3MDMsImV4cCI6MjA2NDM3NzcwM30.wmpwoFgEWfHNYJJlH2nQxJxY0MhOa_FuKVSZi4KS3Yw';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// == DOM elements ==
const titleInput = document.getElementById('title');
const lyricsInput = document.getElementById('lyrics');
const submitBtn = document.getElementById('submit-btn');
const livePreview = document.getElementById('live-preview');
const songsDiv = document.getElementById('songs');
const promptModal = document.getElementById('prompt-modal');

let songs = [];
let editingId = null;

// == Live preview as you type ==
lyricsInput.addEventListener('input', () => {
  livePreview.innerHTML = renderScore(lyricsInput.value);
});

// == Fetch all songs from Supabase ==
async function fetchSongs() {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('title', { ascending: true });
  if (error) {
    alert("Failed to load songs: " + error.message);
    return [];
  }
  return data;
}

// == Add a new song ==
async function addSong(song) {
  const { data, error } = await supabase
    .from('songs')
    .insert([song])
    .select(); // Returns the inserted row(s)
  if (error) {
    alert("Failed to add song: " + error.message);
    return null;
  }
  return data[0];
}

// == Update an existing song ==
async function updateSong(id, fields) {
  const { data, error } = await supabase
    .from('songs')
    .update(fields)
    .eq('id', id)
    .select();
  if (error) {
    alert("Failed to update song: " + error.message);
    return null;
  }
  return data[0];
}

// == Delete a song ==
async function deleteSong(id) {
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id);
  if (error) {
    alert("Failed to delete song: " + error.message);
  }
}

// == Song submit (add or update) ==
async function submitSong() {
  const title = titleInput.value.trim();
  const lyrics = lyricsInput.value.trim();
  if (!title || !lyrics) return;

  // Check for duplicate title
  const found = songs.find(song => song.title === title && song.id !== editingId);

  if (found && !editingId) {
    showPromptBox(
      `Song with title "<b>${escapeHTML(title)}</b>" already exists.`,
      [
        { label: "Rename", isRename: true },
        { label: "Overwrite", action: async () => {
            await updateSong(found.id, { title, lyrics });
            editingId = null;
            submitBtn.textContent = "Submit";
            hidePromptBox();
            await reloadSongs();
          }
        },
        { label: "Cancel", action: () => { hidePromptBox(); } }
      ],
      async (newTitle) => {
        if (!newTitle.trim()) return;
        if (songs.some(song => song.title === newTitle.trim())) {
          alert("A song with this name already exists.");
        } else {
          await addSong({ title: newTitle.trim(), lyrics });
          hidePromptBox();
          await reloadSongs();
        }
      }
    );
    return;
  }

  if (editingId) {
    await updateSong(editingId, { title, lyrics });
    editingId = null;
    submitBtn.textContent = "Submit";
  } else {
    await addSong({ title, lyrics });
  }
  titleInput.value = '';
  lyricsInput.value = '';
  livePreview.innerHTML = '';
  await reloadSongs();
}

// == Edit song ==
function editSong(id) {
  const song = songs.find(s => s.id === id);
  if (!song) return;
  titleInput.value = song.title;
  lyricsInput.value = song.lyrics;
  livePreview.innerHTML = renderScore(song.lyrics);
  editingId = id;
  submitBtn.textContent = "Update";
  window.scrollTo({top: 0, behavior: 'smooth'});
}

// == Render all songs ==
function renderSongs() {
  songsDiv.innerHTML = '';
  songs.forEach(song => {
    const el = document.createElement('div');
    el.className = 'song';
    el.innerHTML =
      `<b>${escapeHTML(song.title)}</b><br>${renderScore(song.lyrics)}
      <div class="actions">
        <button onclick="editSong('${song.id}')">Edit</button>
        <button onclick="deleteSongPrompt('${song.id}')">Delete</button>
      </div>`;
    songsDiv.appendChild(el);
  });
}

// == Delete with confirmation ==
function deleteSongPrompt(id) {
  if (confirm("Delete this song?")) {
    deleteSong(id).then(reloadSongs);
  }
}

// == Reload song list from DB ==
async function reloadSongs() {
  songs = await fetchSongs();
  renderSongs();
}

// == Prompt box (same as previous, unchanged) ==
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[m];
  });
}

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

// == Expose edit and delete for button onclick ==
window.editSong = editSong;
window.deleteSongPrompt = deleteSongPrompt;

// == Song rendering (same as previous, unchanged) ==
// --- Detect if a string contains Hebrew or Arabic (RTL) ---
function isRTL(s) {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(s);
}

// --- Render one song (with chord, lyric, bar, and time signature) ---
function renderScore(text) {
  let lines = text.split(/\r?\n/);
  let html = '';
  lines.forEach(line => {
    let tsCMatch = line.match(/^_TS:C(\/2)?_/);
    let customTimeSigHtml = '';
    let timeSig = null;
    if (tsCMatch) {
      if (tsCMatch[1] === '/2') {
        customTimeSigHtml = '<span class="ts cuttime" title="Cut Time">&#x1D135;</span>';
      } else {
        customTimeSigHtml = '<span class="ts commontime" title="Common Time">&#x1D134;</span>';
      }
      line = line.replace(/^_TS:C(\/2)?_/, '').trim();
    } else {
      let tsMatch = line.match(/^_TS:([0-9]+)\/([0-9]+)_/);
      if (tsMatch) {
        timeSig = { num: tsMatch[1], den: tsMatch[2] };
        line = line.replace(/^_TS:[0-9]+\/[0-9]+_/, '').trim();
      }
    }
    // --- Build blocks (either LTR or RTL) ---
    let blocks = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '|') {
        blocks.push('<span class="bar-marker"></span>');
        i++;
        continue;
      }
      // Chord parsing (~Chord~)
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
        blocks.push(`<span class="block"><span style="height:1em;line-height:1em;font-weight:bold;color:#bb86fc;cursor:pointer;" onclick="toggleChord('${chord}')">${escapeHTML(chord)}</span><span style="height:1em;line-height:1em;">${escapeHTML(lyricChar)}</span></span>`);
      } else {
        blocks.push(`<span class="block"><span style="height:1em;line-height:1em;"></span><span style="height:1em;line-height:1em;">${escapeHTML(line[i])}</span></span>`);
        i++;
      }
    }
    const rtl = isRTL(line);
    html += `<div class="score-block">` +
      (customTimeSigHtml ||
        (timeSig
          ? `<div class="ts"><span>${escapeHTML(timeSig.num)}</span><span>${escapeHTML(timeSig.den)}</span></div>`
          : `<div style="width:1.1em"></div>`)) +
      `<div class="blocks" dir="${rtl ? "rtl" : "ltr"}" style="direction:${rtl ? "rtl" : "ltr"};text-align:${rtl ? "right" : "left"};">` +
        blocks.join('') +
      `</div></div>`;
  });
  return html;
}

// == Chord fingering placeholder (for demonstration) ==
function toggleChord(chord) {
  // This should toggle fingering overlays for all chords with the same name
  // For now, just show a simple alert or placeholder
  alert('Fingering for chord: ' + chord);
}

// == Initial page load ==
reloadSongs();
livePreview.innerHTML = renderScore(lyricsInput.value);
