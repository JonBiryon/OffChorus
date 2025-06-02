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
} // used for lyric search

// --- Export helpers (if needed in module systems) ---
window.OffChorus = {
   supabase,
   escapeHTML,
   isRTL,
   replaceTimeSignatures,
   stripCodes
};