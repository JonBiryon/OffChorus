// common.js

// --- Global Config ---
const SUPABASE_URL = 'https://kktkzkypfeqipdmchowc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdGt6a3lwZmVxaXBkbWNob3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDE3MDMsImV4cCI6MjA2NDM3NzcwM30.wmpwoFgEWfHNYJJlH2nQxJxY0MhOa_FuKVSZi4KS3Yw';

// --- Supabase Init ---
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Utilities ---
function escapeHTML(str) {
   return str.replace(/[&<>"']/g, function(m) {
      return ({
         '&': '&amp;', '<': '&lt;', '>': '&gt;',
         '"': '&quot;', "'": '&#39;'
      })[m];
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

function stripCodes(text) {
   return text.replace(/~[^~]*~/g, '').replace(/_TS:[^_]*_/g, '');
}

function collectChords(text) {
   const set = new Set();
   text.replace(/~([^~]+)~/g, (_, chord) => { set.add(chord); return ''; });
   return set;
}

function renderScore(text, showAllChords, activeChords) {
   const lines = text.split(/\r?\n/);
   let html = '';

   for (const line of lines) {
      const isRtl = isRTL(line.replace(/<[^>]*>/g, ""));
      const lineWithTS = replaceTimeSignatures(line);

      const blocks = [];
      let i = 0;
      while (i < lineWithTS.length) {
         if (lineWithTS[i] === '<') {
            const tagEnd = lineWithTS.indexOf('</span>', i);
            if (tagEnd !== -1) {
               const tag = lineWithTS.slice(i, tagEnd + 7);
               blocks.push({ type: 'html', html: tag });
               i = tagEnd + 7;
               continue;
            }
         }
         if (lineWithTS[i] === '|') {
            blocks.push({ type: 'bar' });
            i++;
            continue;
         }
         if (lineWithTS[i] === '~') {
            let j = i+1;
            while (j < lineWithTS.length && lineWithTS[j] !== '~') j++;
            const chord = lineWithTS.substring(i+1, j);
            i = j+1;
            let lyricChar = '';
            if (i < lineWithTS.length && lineWithTS[i] !== '|' && lineWithTS[i] !== '~') {
               lyricChar = lineWithTS[i];
               i++;
            }
            blocks.push({ type: 'chord', chord, lyric: lyricChar });
         } else {
            blocks.push({ type: 'char', char: lineWithTS[i] });
            i++;
         }
      }

      const blocksHTML = blocks.map((block) => {
         if (block.type === 'chord') {
            const showSprite = showAllChords || activeChords.has(block.chord);
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
      }).join('');

      html += `<div class="score-block">
         <div class="blocks" dir="${isRtl ? 'rtl' : 'ltr'}" style="direction:${isRtl ? 'rtl' : 'ltr'};text-align:${isRtl ? 'right' : 'left'};">
            ${blocksHTML}
         </div>
      </div>`;
   }

   return html;
}

// --- Export helpers ---
window.OffChorus = {
   supabase,
   escapeHTML,
   isRTL,
   replaceTimeSignatures,
   stripCodes,
   collectChords,
   renderScore
};
