const titleFilterInput = document.getElementById('filter-title');
const artistFilterInput = document.getElementById('filter-artist');
const submitterFilterInput = document.getElementById('filter-submitter');
const lyricsSearchInput = document.getElementById('search-lyrics');
const songListDiv = document.getElementById('song-list');
const statusDiv = document.getElementById('status-message');

let allSongs = [];

fetchSongs();

async function fetchSongs() {
   const { data, error } = await OffChorus.supabase
      .from('songs')
      .select('*')
      .order('title', { ascending: true });

   if (error) {
      statusDiv.textContent = 'Failed to load songs: ' + error.message;
      statusDiv.style.color = '#fb6868';
      return;
   }

   allSongs = data.map(row => ({
      id: row.id,
      title: row.title,
      lyrics: row.lyrics,
      artist: row.artist || '',
      submitter: row.submitter || ''
   }));

   statusDiv.textContent = '';
   renderFilteredSongs();
}

function renderFilteredSongs() {
   const titleFilter = titleFilterInput.value.trim().toLowerCase();
   const artistFilter = artistFilterInput.value.trim().toLowerCase();
   const submitterFilter = submitterFilterInput.value.trim().toLowerCase();
   const lyricsFilter = lyricsSearchInput.value.trim().toLowerCase();

   const matches = allSongs.filter(song => {
      return song.title.toLowerCase().includes(titleFilter) &&
             song.artist.toLowerCase().includes(artistFilter) &&
             song.submitter.toLowerCase().includes(submitterFilter) &&
             OffChorus.stripCodes(song.lyrics).toLowerCase().includes(lyricsFilter);
   });

   songListDiv.innerHTML = '';
   matches.forEach(song => {
      const el = document.createElement('div');
      el.className = 'song';
      el.innerHTML =
         `<b>${OffChorus.escapeHTML(song.title)}</b><br>
          <small>Artist: ${OffChorus.escapeHTML(song.artist)} | 
          Submitter: ${OffChorus.escapeHTML(song.submitter)}</small>`;
      songListDiv.appendChild(el);
   });

   if (matches.length === 0) {
      songListDiv.innerHTML = '<i>No matching songs found.</i>';
   }
}

titleFilterInput.addEventListener('input', renderFilteredSongs);
artistFilterInput.addEventListener('input', renderFilteredSongs);
submitterFilterInput.addEventListener('input', renderFilteredSongs);
lyricsSearchInput.addEventListener('input', renderFilteredSongs);