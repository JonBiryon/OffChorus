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

let songs = [];
let editingId = null;

// Live preview as you type
lyricsInput.addEventListener('input', () => {
  livePreview.innerHTML = renderScore(lyricsInput.value);
});

// Submit song (add or update)
submitBtn.onclick = async function () {
  const title = titleInput.value.trim();
  const lyrics = lyricsInput.value.trim();
  if (!title || !lyrics) return;

  if (editingId) {
    // Update existing song
    await supabase
      .from('songs')
      .update({ title, lyrics })
      .eq('id', editingId);
    editingId = null;
    submitBtn.textContent = "Submit";
  } else {
    // Add new song
    await supabase
      .from('songs')
      .insert([{ title, lyrics }]);
  }
  titleInput.value = '';
  lyricsInput.value = '';
  livePreview.innerHTML = '';
  await reloadSongs();
};

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

function deleteSongPrompt(id) {
  if (confirm("Delete this song?")) {
    supabase
      .from('songs')
      .delete()
      .eq('id', id)
      .then(reloadSongs);
  }
}

async function reloadSongs() {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('title', { ascending: true });
  songs = data || [];
  renderSongs();
}

// Utility to avoid HTML injection
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[m];
  });
}

// Example renderScore for minimal function (add your own if you like)
function renderScore(text) {
  return `<pre>${escapeHTML(text)}</pre>`;
}

// Expose functions to global for inline onclicks
window.editSong = editSong;
window.deleteSongPrompt = deleteSongPrompt;

// Initial page load
reloadSongs();
livePreview.innerHTML = renderScore(lyricsInput.value);
