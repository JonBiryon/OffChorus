// common.js

// --- Supabase global config ---
const SUPABASE_URL = 'https://kktkzkypfeqipdmchowc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdGt6a3lwZmVxaXBkbWNob3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDE3MDMsImV4cCI6MjA2NDM3NzcwM30.wmpwoFgEWfHNYJJlH2nQxJxY0MhOa_FuKVSZi4KS3Yw';
// --- Supabase init ---
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
} // used for lyric search

// --- Export helpers ---
window.OffChorus = {
   supabase,
   escapeHTML,
   isRTL,
   replaceTimeSignatures,
   stripCodes
};

/**
 * Injects a flexible top navigation bar.
 * - Left: "« Index" (only on song page)
 * - Center: Submit, Feedback, Preferences (always centered)
 *
 * @param {boolean} includeIndexLink - Set true on song page to include Index button
 */
function insertNavBar(includeIndexLink = false) {
   const bar = document.createElement('div');
   bar.className = 'options-bar';

   // --- Left-aligned container (Index or empty spacer) ---
   const leftZone = document.createElement('div');
   leftZone.style.flex = '1';
   if (includeIndexLink) {
      const indexLink = document.createElement('a');
      indexLink.href = 'index.html';
      indexLink.textContent = '« Index';
      indexLink.className = 'button-link';
      leftZone.appendChild(indexLink);
   }
   bar.appendChild(leftZone);

   // --- Center-aligned container ---
   const centerZone = document.createElement('div');
   centerZone.style.display = 'flex';
   centerZone.style.gap = '2em';
   centerZone.style.justifyContent = 'center';
   centerZone.style.alignItems = 'center';
   centerZone.style.flex = '0 1 auto';

   const buttons = [
      { text: '+ Submit new song', href: 'song.html' },
      { text: 'Feedback', href: 'feedback.html' },
      { text: 'Preferences', href: 'preferences.html' }
   ];

   for (const { text, href } of buttons) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      link.className = 'button-link';
      centerZone.appendChild(link);
   }

   bar.appendChild(centerZone);

   // --- Right zone: flexible empty space to balance layout ---
   const rightZone = document.createElement('div');
   rightZone.style.flex = '1';
   bar.appendChild(rightZone);

   document.body.prepend(bar);
}