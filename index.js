// library.js – controls song listing on index.html

// --- DOM elements ---
const titleFilter = document.getElementById('filter-title');
const artistFilter = document.getElementById('filter-artist');
const submitterFilter = document.getElementById('filter-submitter');
const lyricsFilter = document.getElementById('filter-lyrics');
const songListDiv = document.getElementById('song-list');

let songs = [];

// --- Fetch and render all songs ---
fetchSongs();

async function fetchSongs() {
   const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('title', { ascending: true });

   if (error) {
      console.error('Failed to load songs:', error);
      return;
   }
   songs = data;
   renderSongs();
}

// --- Render songs ---
function renderSongs() {
   const titleQuery = titleFilter.value.trim().toLowerCase();
   const artistQuery = artistFilter.value.trim().toLowerCase();
   const submitterQuery = submitterFilter.value.trim().toLowerCase();
   const lyricsQuery = lyricsFilter.value.trim().toLowerCase();

   songListDiv.innerHTML = '';

   songs.forEach(song => {
      if (titleQuery && !song.title.toLowerCase().includes(titleQuery)) return;
      if (artistQuery && !song.artist?.toLowerCase().includes(artistQuery)) return;
      if (submitterQuery && !song.submitter?.toLowerCase().includes(submitterQuery)) return;

      if (lyricsQuery) {
         const cleanLyrics = song.lyrics.replace(/~[^~]+~/g, '').replace(/_[^_]+_/g, '').toLowerCase();
         if (!cleanLyrics.includes(lyricsQuery)) return;
      }

      const entry = document.createElement('div');
      entry.className = 'song-entry';
      entry.tabIndex = 0;
      entry.onclick = () => {
         location.href = `view.html?id=${song.id}`;
      };
      entry.innerHTML = `
         <div class="song-artist">${escapeHTML(song.artist || '')}</div>
         <div class="song-title">${escapeHTML(song.title)}</div>
      `;
      songListDiv.appendChild(entry);
   });
}

// --- Filter events ---
titleFilter.addEventListener('input', renderSongs);
artistFilter.addEventListener('input', renderSongs);
submitterFilter.addEventListener('input', renderSongs);
lyricsFilter.addEventListener('input', renderSongs);