// view.js

let activeChords = new Set();
let showAllChords = false;
let currentLyrics = '';

const titleEl = document.getElementById('song-title');
const artistEl = document.getElementById('song-artist');
const contentEl = document.getElementById('song-body');
const showAllChordsCheckbox = document.getElementById('showAllChords');
const editBtn = document.getElementById('edit-btn');
const deleteBtn = document.getElementById('delete-btn');

const params = new URLSearchParams(window.location.search);
const songId = params.get('id');

if (!songId) {
  contentEl.textContent = 'Invalid song ID.';
} else {
  fetchSong(songId);
}

async function fetchSong(id) {
  const { data, error } = await OffChorus.supabase
    .from('songs')
    .select('id, title, artist, lyrics')
    .eq('id', id)
    .single();

  if (error || !data) {
    contentEl.textContent = 'Failed to load song.';
    console.error(error);
    return;
  }

  titleEl.textContent = data.title;
  artistEl.textContent = data.artist || '';
  currentLyrics = data.lyrics;

  renderLyrics();

  editBtn.onclick = () => {
    location.href = `submit.html?edit=${encodeURIComponent(data.id)}`;
  };

  deleteBtn.onclick = async () => {
    if (!confirm('Delete this song?')) return;
    const { error } = await OffChorus.supabase.from('songs').delete().eq('id', data.id);
    if (!error) {
      location.href = 'index.html';
    } else {
      alert('Failed to delete song.');
    }
  };
}

function renderLyrics() {
  showAllChords = showAllChordsCheckbox.checked;
  activeChords = showAllChords ? OffChorus.collectChords(currentLyrics) : new Set();
  contentEl.innerHTML = OffChorus.renderScore(currentLyrics, showAllChords, activeChords);
}

showAllChordsCheckbox.addEventListener('change', renderLyrics);