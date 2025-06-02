// == Supabase configuration ==
const SUPABASE_URL = 'https://kktkzkypfeqipdmchowc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdGt6a3lwZmVxaXBkbWNob3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDE3MDMsImV4cCI6MjA2NDM3NzcwM30.wmpwoFgEWfHNYJJlH2nQxJxY0MhOa_FuKVSZi4KS3Yw';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// == DOM elements ==
const titleInput = document.getElementById('title');
const lyricsInput = document.getElementById('lyrics');
const submitBtn = document.getElementById('submit-btn');
const livePreview = document.getElementById('live-preview');
const songsDiv = document.getElementById('songs');
const promptModal = document.getElementById('prompt-modal');
const showAllChordsBox = document.getElementById('showAllChords');

let songs = [];
let editingId = null;
// Keep track of which chord overlays are toggled
let shownChords = new Set();
let showAllChords = false;

// -- Live preview updates --
lyricsInput.addEventListener('input', () => {
  livePreview.innerHTML = renderScore(lyricsInput.value, shownChords, showAllChords);
});

// -- "Show All Chord Fingering" option --
showAllChordsBox.addEventListener('change', () => {
  showAllChords = showAllChordsBox.checked;
  // update preview and song list
  livePreview.innerHTML = renderScore(lyricsInput.value, shownChords, showAllChords);
  renderSongs();
});

// == Utility: escape HTML ==
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
}

// == Detect if a string is RTL (Hebrew/Arabic) ==
function isRTL(s) {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(s);
}

// == Chord overlay logic ==
function toggleChordOverlay(chord) {
  chord = chord.trim();
  if (!chord) return;
  if (shownChords.has(chord)) {
    shownChords.delete(chord);
  } else {
    shownChords.add(chord);
  }
  // Refresh preview and all saved songs (so all visible chords update)
  livePreview.innerHTML = renderScore(lyricsInput.value, shownChords, showAllChords);
  renderSongs();
}

// == Song submit (add or update) ==
async function submitSong() {
  const title = titleInput.value.trim();
  const lyrics = lyricsInput.value.trim();
  if (!title || !lyrics) return;

  // Check for duplicate title (except when editing this song)
  const found = songs.find(song => song.title === title && song.id !== editingId);

  if (found && !editingId) {
    // Modal: Overwrite, Rename, Cancel
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
          showPromptBox(
            `A song with "<b>${escapeHTML(newTitle.trim())}</b>" also exists. Try another name.`,
            [
              { label: "Rename", isRename: true },
              { label: "Cancel", action: () => { hidePromptBox(); } }
            ],
            arguments.callee
          );
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
  shownChords.clear();
  await reloadSongs();
}

// == CRUD helpers ==
async function fetchSongs() {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('title', { ascending: true });
  if (error) {
    alert("Failed to load songs: " + error.message);
    return [];
  }
  return data || [];
}
async function addSong(song) {
  const { error } = await supabase
    .from('songs')
    .insert([song]);
  if (error) alert("Failed to add song: " + error.message);
}
async function updateSong(id, fields) {
  const { error } = await supabase
    .from('songs')
    .update(fields)
    .eq('id', id);
  if (error) alert("Failed to update song: " + error.message);
}
async function deleteSong(id) {
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id);
  if (error) alert("Failed to delete song: " + error.message);
}

// == Render all saved songs in the UI ==
function renderSongs() {
  songsDiv.innerHTML = '';
  songs.forEach(song => {
    const el = document.createElement('div');
    el.className = 'song';
    el.innerHTML =
      `<b>${escapeHTML(song.title)}</b><br>${renderScore(song.lyrics, shownChords, showAllChords)}
       <div class="actions">
         <button onclick="editSong('${song.id}')">Edit</button>
         <button onclick="deleteSongPrompt('${song.id}')">Delete</button>
       </div>`;
    songsDiv.appendChild(el);
  });
}

// == Edit song ==
function editSong(id) {
  const song = songs.find(s => s.id === id);
  if (!song) return;
  titleInput.value = song.title;
  lyricsInput.value = song.lyrics;
  livePreview.innerHTML = renderScore(song.lyrics, shownChords, showAllChords);
  editingId = id;
  submitBtn.textContent = "Update";
  window.scrollTo({top: 0, behavior: 'smooth'});
}
window.editSong = editSong;

// == Delete song with confirmation ==
function deleteSongPrompt(id) {
  if (confirm("Delete this song?")) {
    deleteSong(id).then(reloadSongs);
  }
}
window.deleteSongPrompt = deleteSongPrompt;

// == Modal prompt logic ==
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

// == Main song parser & renderer ==
function renderScore(text, shownChords, showAllChords) {
  let lines = text.split(/\r?\n/);
  let html = '';
  for (let line of lines) {
    // Parse and render time signature (including mid-line!)
    let blocks = [];
    let i = 0;
    while (i < line.length) {
      // Bar
      if (line[i] === '|') {
        blocks.push('<span class="bar-marker"></span>');
        i++;
        continue;
      }
      // Time signature (common/cut/numeric)
      if (line.slice(i).startsWith('_TS:C/2_')) {
        blocks.push('<span class="ts cuttime" title="Cut Time">&#x1D135;</span>');
        i += 8;
        continue;
      }
      if (line.slice(i).startsWith('_TS:C_')) {
        blocks.push('<span class="ts commontime" title="Common Time">&#x1D134;</span>');
        i += 6;
        continue;
      }
      let tsMatch = line.slice(i).match(/^_TS:([0-9]+)\/([0-9]+)_/);
      if (tsMatch) {
        let num = tsMatch[1], den = tsMatch[2];
        blocks.push(`<span class="ts"><span>${escapeHTML(num)}</span><span>${escapeHTML(den)}</span></span>`);
        i += tsMatch[0].length;
        continue;
      }
      // Chord parsing (~Chord~)
      if (line[i] === '~') {
        let j = i+1;
        while (j < line.length && line[j] !== '~') j++;
        let chord = line.substring(i+1, j);
        i = j+1;
        let lyricChar = '';
        if (i < line.length && !['_','~','|'].includes(line[i])) {
          lyricChar = line[i];
          i++;
        }
        // Chord block (bold, button, overlay)
        let displayOverlay = showAllChords || shownChords.has(chord);
        blocks.push(
          `<span class="chord-block">` +
            `<button class="chord-btn" type="button" onclick="toggleChordOverlay('${escapeHTML(chord)}')">${escapeHTML(chord)}</button>` +
            (displayOverlay ? `<span class="chord-sprite">{${escapeHTML(chord)}}</span>` : '') +
            `<span style="height:1em;line-height:1em;">${escapeHTML(lyricChar)}</span>` +
          `</span>`
        );
        continue;
      }
      // Regular lyric
      blocks.push(`<span class="block"><span style="height:1em;line-height:1em;"></span><span style="height:1em;line-height:1em;">${escapeHTML(line[i])}</span></span>`);
      i++;
    }
    // RTL/LTR
    const rtl = isRTL(line);
    html += `<div class="score-block">` +
      `<div class="blocks" dir="${rtl ? "rtl" : "ltr"}" style="direction:${rtl ? "rtl" : "ltr"};text-align:${rtl ? "right" : "left"};">` +
      (rtl ? blocks.reverse().join('') : blocks.join('')) +
      `</div></div>`;
  }
  return html;
}
window.toggleChordOverlay = toggleChordOverlay;

// == Reload song list from DB ==
async function reloadSongs() {
  songs = await fetchSongs();
  renderSongs();
}

// == Initial page load ==
reloadSongs();
livePreview.innerHTML = renderScore(lyricsInput.value, shownChords, showAllChords);
