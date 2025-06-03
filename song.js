// song.js

// --- Initiate overhead navigation bar ---
insertNavBar(true); // true = include the Index button

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
   livePreview.innerHTML = renderScore(lyricsInput.value);
});

showAllChordsCheckbox.addEventListener('change', function () {
   showAllChords = this.checked;
   if (showAllChords) {
      activeChords = collectChords(lyricsInput.value);
   } else {
      activeChords.clear();
   }
   livePreview.innerHTML = renderScore(lyricsInput.value);
   renderSongs();
});

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
   const { data, error } = await supabase.from('songs').select('*').order('title');
   if (error) {
      setStatus('Failed to load songs: ' + error.message, false);
      songs = [];
   } else {
      songs = data.map(row => ({ id: row.id, title: row.title, lyrics: row.lyrics }));
      setStatus('');
   }
   renderSongs();
   livePreview.innerHTML = renderScore(lyricsInput.value);
   resetEditor();
}

async function submitSong() {
   const title = titleInput.value.trim();
   const artist = artistInput.value.trim();
   const submitter = submitterInput.value.trim();
   const lyrics = lyricsInput.value.trim();
   if (!titleInput.value.trim() || !lyrics) {
      setStatus("Title and lyrics are required.", false);
      return;
   }
   const existingIdx = songs.findIndex(song => song.title === titleInput.value.trim());
   if (existingIdx !== -1) {
      showPromptBox(
         `Song with title "<b>${escapeHTML(titleInput.value.trim())}</b>" already exists.`,
         [
            { label: "Rename", isRename: true },
            {
               label: "Overwrite", action: async () => {
                  const id = songs[existingIdx].id;
                  const { error } = await supabase.from('songs').update({ title: titleInput.value.trim(), lyrics }).eq('id', id);
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
            if (songs.some(song => song.title === newTitle.trim())) {
               showPromptBox(`A song with "<b>${escapeHTML(newTitle.trim())}</b>" also exists. Try another name.`, [
                  { label: "Rename", isRename: true },
                  { label: "Cancel", action: () => { hidePromptBox(); } }
               ], arguments.callee);
            } else {
               const { error } = await supabase.from('songs').insert([{ title: newTitle.trim(), lyrics }]);
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
   const { error } = await supabase.from('songs').insert([{ title: titleInput.value.trim(), lyrics }]);
   if (!error) {
      await fetchSongs();
      setStatus("Song added successfully.");
   } else {
      setStatus('Failed to add: ' + error.message, false);
   }
}

async function updateSong() {
   if (editingIndex === null || !editingSongId) {
      setStatus("No song selected for update.", false);
      return;
   }
   const title = titleInput.value.trim();
   const lyrics = lyricsInput.value.trim();
   if (!title || !lyrics) {
      setStatus("Title and lyrics are required.", false);
      return;
   }
   const { error } = await supabase.from('songs').update({ title, lyrics }).eq('id', editingSongId);
   if (!error) {
      await fetchSongs();
      setStatus("Song updated.");
      resetEditor();
   } else {
      setStatus('Error updating song: ' + error.message, false);
   }
}

function escapeHTML(str) {
   return str.replace(/[&<>"]|'/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
   })[m]);
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

function editSong(idx) {
   const song = songs[idx];
   titleInput.value = song.title;
   artistInput.value = song.artist;
   submitterInput.value = song.submitter;
   lyricsInput.value = song.lyrics;
   livePreview.innerHTML = renderScore(song.lyrics);
   editingIndex = idx;
   editingSongId = song.id;
   updateBtn.style.display = '';
   setStatus("Editing song: " + song.title);
   window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteSong(idx) {
   if (!confirm("Delete this song?")) return;
   const id = songs[idx].id;
   const { error } = await supabase.from('songs').delete().eq('id', id);
   if (!error) {
      await fetchSongs();
      setStatus("Song deleted.");
   } else {
      setStatus('Failed to delete: ' + error.message, false);
   }
}

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

function isRTL(s) {
   return /[\u0590-\u05FF\u0600-\u06FF]/.test(s);
}

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

function renderScore(text) {
   let lines = text.split(/\r?\n/);
   let html = '';
   lines.forEach(line => {
      line = replaceTimeSignatures(line);
      let blocks = [];
      let i = 0;
      while (i < line.length) {
         if (line[i] === '<') {
            let tagEnd = line.indexOf('</span>', i);
            if (tagEnd !== -1) {
               blocks.push({ type: 'html', html: line.slice(i, tagEnd + 7) });
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
            let j = i + 1;
            while (j < line.length && line[j] !== '~') j++;
            let chord = line.substring(i + 1, j);
            i = j + 1;
            let lyricChar = '';
            if (i < line.length && line[i] !== '|' && line[i] !== '~') {
               lyricChar = line[i];
               i++;
            }
            blocks.push({ type: 'chord', chord, lyric: lyricChar });
         } else {
            blocks.push({ type: 'char', char: line[i] });
            i++;
         }
      }
      const rtl = isRTL(line.replace(/<[^>]*>/g, ""));
      let blocksHTML = blocks.map(block => {
         if (block.type === 'chord') {
            let showSprite = showAllChords || activeChords.has(block.chord);
            return `<span class="block chord-block">
          <button class="chord-btn" tabindex="0" onclick="onChordClick('${block.chord.replace(/'/g, "\\'")}')">${escapeHTML(block.chord)}</button>
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

window.onChordClick = function (chord) {
   if (showAllChords) return;
   if (activeChords.has(chord)) activeChords.delete(chord);
   else activeChords.add(chord);
   livePreview.innerHTML = renderScore(lyricsInput.value);
   renderSongs();
};

window.editSong = editSong;
window.deleteSong = deleteSong;
