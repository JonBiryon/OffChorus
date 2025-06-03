// submit.js

// --- State ---
let songs = [];
let editingIndex = null;
let editingSongId = null;
let activeChords = new Set();
let showAllChords = false;

// --- DOM elements ---
const titleInput = document.getElementById('title');
const artistInput = document.getElementById('artist');
const submitterInput = document.getElementById('submitter');
const lyricsInput = document.getElementById('lyrics');
const submitBtn = document.getElementById('submit-btn');
const updateBtn = document.getElementById('update-btn');
const backToSongBtn = document.getElementById('back-to-song');
const livePreview = document.getElementById('live-preview');
const songsDiv = document.getElementById('songs');
const promptModal = document.getElementById('prompt-modal');
const showAllChordsCheckbox = document.getElementById('showAllChords');
const statusDiv = document.getElementById('status-message');

// --- On load ---
fetchSongs();
resetEditor();

lyricsInput.addEventListener('input', () => {
  if (!showAllChords) activeChords.clear();
  livePreview.innerHTML = OffChorus.renderScore(lyricsInput.value, activeChords, showAllChords);
});

showAllChordsCheckbox.addEventListener('change', function () {
  showAllChords = this.checked;
  if (showAllChords) {
    activeChords = collectChords(lyricsInput.value);
  } else {
    activeChords.clear();
  }
  livePreview.innerHTML = OffChorus.renderScore(lyricsInput.value, activeChords, showAllChords);
  renderSongs();
});

const params = new URLSearchParams(window.location.search);
const editId = params.get('edit');
if (editId) {
  backToSongBtn.style.display = '';
  backToSongBtn.onclick = () => location.href = `view.html?id=${editId}`;
  loadSongForEdit(editId);
}

function collectChords(text) {
  const set = new Set();
  text.replace(/~([^~]+)~/g, (_, chord) => { set.add(chord); return ''; });
  return set;
}

function setStatus(msg, good = true) {
  statusDiv.textContent = msg;
  statusDiv.style.color = good ? '#7f7' : '#fb6868';
  statusDiv.style.fontWeight = 'bold';
}

function resetEditor() {
  editingIndex = null;
  editingSongId = null;
  updateBtn.style.display = 'none';
}

async function fetchSongs() {
  const { data, error } = await OffChorus.supabase.from('songs').select('*').order('title', { ascending: true });
  if (error) {
    setStatus('Failed to load songs: ' + error.message, false);
    songs = [];
  } else {
    songs = data;
    setStatus('');
  }
  renderSongs();
  livePreview.innerHTML = OffChorus.renderScore(lyricsInput.value, activeChords, showAllChords);
  resetEditor();
}

async function loadSongForEdit(id) {
  const { data, error } = await OffChorus.supabase.from('songs').select('*').eq('id', id).single();
  if (error || !data) {
    setStatus('Failed to load song for editing.', false);
    return;
  }
  titleInput.value = data.title;
  lyricsInput.value = data.lyrics;
  artistInput.value = data.artist;
  submitterInput.value = data.submitter;
  editingIndex = null;
  editingSongId = data.id;
  updateBtn.style.display = '';
  setStatus("Editing song: " + data.title);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function submitSong() {
  const title = titleInput.value.trim();
  const artist = artistInput.value.trim();
  const submitter = submitterInput.value.trim();
  const lyrics = lyricsInput.value.trim();

  if (!title || !lyrics || !artist || !submitter) {
    setStatus("All fields are required.", false);
    return;
  }

  const existingIdx = songs.findIndex(song => song.title === title && song.artist === artist);

  if (existingIdx !== -1) {
    showPromptBox(
      `A song titled "<b>${OffChorus.escapeHTML(title)}</b>" by "<b>${OffChorus.escapeHTML(artist)}</b>" already exists.`,
      [
        { label: "Rename", isRename: true },
        {
          label: "Overwrite", action: async () => {
            const id = songs[existingIdx].id;
            const { error } = await OffChorus.supabase
              .from('songs')
              .update({ title, lyrics, artist, submitter })
              .eq('id', id);
            if (!error) {
              await fetchSongs();
              setStatus("Song overwritten.");
              hidePromptBox();
            } else {
              setStatus('Error overwriting: ' + error.message, false);
            }
          }
        },
        { label: "Cancel", action: () => { hidePromptBox(); } }
      ],
      async (newTitle) => {
        if (!newTitle.trim()) return;
        if (songs.some(song => song.title === newTitle.trim() && song.artist === artist)) {
          showPromptBox(
            `A song with title "<b>${OffChorus.escapeHTML(newTitle.trim())}</b>" by "<b>${OffChorus.escapeHTML(artist)}</b>" also exists. Try another name.`,
            [
              { label: "Rename", isRename: true },
              { label: "Cancel", action: () => { hidePromptBox(); } }
            ],
            arguments.callee
          );
        } else {
          const { error } = await OffChorus.supabase
            .from('songs')
            .insert([{ title: newTitle.trim(), lyrics, artist, submitter }]);
          if (!error) {
            await fetchSongs();
            setStatus("Song added with new name.");
            hidePromptBox();
          } else {
            setStatus('Error renaming: ' + error.message, false);
          }
        }
      }
    );
    return;
  }

  const { error } = await OffChorus.supabase.from('songs').insert([{ title, lyrics, artist, submitter }]);
  if (!error) {
    await fetchSongs();
    setStatus("Song added successfully.");
  } else {
    setStatus('Failed to add: ' + error.message, false);
  }
}

async function updateSong() {
  if (editingIndex === null && !editingSongId) {
    setStatus("No song selected for update.", false);
    return;
  }
  const title = titleInput.value.trim();
  const artist = artistInput.value.trim();
  const submitter = submitterInput.value.trim();
  const lyrics = lyricsInput.value.trim();
  if (!title || !lyrics || !artist || !submitter) {
    setStatus("All fields are required.", false);
    return;
  }
  const { error } = await OffChorus.supabase
    .from('songs')
    .update({ title, lyrics, artist, submitter })
    .eq('id', editingSongId);
  if (!error) {
    await fetchSongs();
    setStatus("Song updated.");
    resetEditor();
  } else {
    setStatus('Error updating song: ' + error.message, false);
  }
}

function showPromptBox(message, actions, renameCallback) {
  let html = `<div class="prompt-modal"><div class="prompt-box">${message}<div>`;
  let renameActive = actions.some(a => a.isRename);
  if (renameActive) {
    html += `<input id="prompt-rename" type="text" value="${OffChorus.escapeHTML(titleInput.value)}" placeholder="New Title">`;
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

function renderSongs() {
  songsDiv.innerHTML = '';
  songs.forEach((song, idx) => {
    const el = document.createElement('div');
    el.className = 'song';
    el.innerHTML =
      `<b>${OffChorus.escapeHTML(song.title)}</b><br>
       <small>Artist: ${OffChorus.escapeHTML(song.artist)} | Submitter: ${OffChorus.escapeHTML(song.submitter)}</small>
       <div class="actions">
         <button onclick="editSong(${idx})">Edit</button>
         <button onclick="deleteSong(${idx})">Delete</button>
       </div>`;
    songsDiv.appendChild(el);
  });
}

function deleteSong(idx) {
  if (!confirm("Delete this song?")) return;
  const id = songs[idx].id;
  OffChorus.supabase
    .from('songs')
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (!error) {
        fetchSongs();
        setStatus("Song deleted.");
      } else {
        setStatus('Failed to delete: ' + error.message, false);
      }
    });
}

window.submitSong = submitSong;
window.updateSong = updateSong;
