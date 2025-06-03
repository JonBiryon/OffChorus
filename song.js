// --- Inject navigation bar at top ---
insertNavBar(true);

// --- DOM references ---
const editPanel = document.getElementById('edit-panel');
const viewPanel = document.getElementById('view-panel');
const errorPanel = document.getElementById('error-panel');

const viewTitle = document.getElementById('view-title');
const viewMeta = document.getElementById('view-metadata');
const viewRender = document.getElementById('rendered-song');

const titleInput = document.getElementById('title');
const artistInput = document.getElementById('artist');
const submitterInput = document.getElementById('submitter');
const lyricsInput = document.getElementById('lyrics');

// --- Entry point: Detect mode after DOM is ready ---
window.addEventListener('DOMContentLoaded', handleSongPageMode);

/**
 * Determines the current page mode based on URL.
 * - If no ?id= → show edit mode for a new song.
 * - If id exists and is valid → show view mode.
 * - If id does not resolve → show error message.
 */
async function handleSongPageMode() {
   const params = new URLSearchParams(window.location.search);
   const songId = params.get('id');

   if (!songId) {
      enterEditMode();
      return;
   }

   const { data, error } = await supabase.from('songs').select('*').eq('id', songId).single();

   if (error || !data) {
      enterErrorMode();
      return;
   }

   enterViewMode(data);
}

/**
 * Activates Edit Mode for new song entry.
 * Shows input fields and enables live preview.
 */
function enterEditMode() {
   editPanel.style.display = '';
   viewPanel.style.display = 'none';
   errorPanel.style.display = 'none';

   document.getElementById('submit-btn').style.display = '';
   document.getElementById('update-btn').style.display = 'none';

   lyricsInput.addEventListener('input', () => {
      renderScore(lyricsInput.value, 'live-preview');
   });
}

/**
 * Activates View Mode with a given song object.
 * Renders title, metadata, and lyrics preview.
 * @param {object} song - Song record from Supabase
 */
function enterViewMode(song) {
   editPanel.style.display = 'none';
   viewPanel.style.display = '';
   errorPanel.style.display = 'none';

   viewTitle.textContent = song.title;
   viewMeta.textContent = `${song.artist} • Submitted by ${song.submitter}`;
   renderScore(song.lyrics, 'rendered-song');
}

/**
 * Activates Error Mode if song is not found.
 * Displays error message and hides other panels.
 */
function enterErrorMode() {
   editPanel.style.display = 'none';
   viewPanel.style.display = 'none';
   errorPanel.style.display = '';
}

function renderScore(text, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  let lines = text.split(/\r?\n/);
  let html = '';

  lines.forEach((line) => {
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

    const rtl = isRTL(line.replace(/<[^>]*>/g, ''));
    const blocksHTML = blocks.map((block) => {
      if (block.type === 'chord') {
        let showSprite = showAllChords || activeChords.has(block.chord);
        return `<span class="block chord-block">
          <button class="chord-btn" tabindex="0" onclick="toggleChordSprite(this, '${block.chord.replace(/'/g, "\\'")}')">${escapeHTML(block.chord)}</button>
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
      <div class="blocks" dir="${rtl ? 'rtl' : 'ltr'}" style="direction:${rtl ? 'rtl' : 'ltr'};text-align:${rtl ? 'right' : 'left'};">
        ${blocksHTML.join('')}
      </div>
    </div>`;
  });

  container.innerHTML = html;
}
