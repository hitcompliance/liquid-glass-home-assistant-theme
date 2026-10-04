(() => {
  const dialog = document.getElementById('readme-dialog');
  const content = document.getElementById('readme-content');
  const opener = document.querySelector('[data-readme-open]');
  const repository = 'https://github.com/hitcompliance/liquid-glass-home-assistant-theme/blob/main/';
  const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => {
    try { const url = new URL(value, repository); return /^https?:$/.test(url.protocol) ? url.href : '#'; }
    catch { return '#'; }
  };
  // Render the README's Markdown subset locally, without remote scripts or raw HTML.
  function inline(text) {
    const tokens = [];
    const token = html => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
    text = text.replace(/`([^`]+)`/g, (_, code) => token(`<code>${escape(code)}</code>`));
    text = text.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g, (_, label, image, href) => token(`<a href="${escape(safeUrl(href))}" target="_blank" rel="noopener">${escape(label)} ↗</a>`));
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => token(`<a href="${escape(safeUrl(href))}" target="_blank" rel="noopener">${escape(label)} ↗</a>`));
    return escape(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
  }
  function render(markdown) {
    const lines = markdown.replace(/\r/g, '').split('\n');
    let html = '', paragraph = [], list = false;
    const flush = () => { if (paragraph.length) { html += `<p>${inline(paragraph.join(' '))}</p>`; paragraph = []; } if (list) { html += '</ul>'; list = false; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^```/.test(line)) {
        flush(); const code = [];
        while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
        html += `<pre><code>${escape(code.join('\n'))}</code></pre>`;
      } else if (/^#{1,6}\s/.test(line)) {
        flush(); const [, hashes, title] = line.match(/^(#{1,6})\s+(.*)$/);
        html += `<h${hashes.length}>${inline(title)}</h${hashes.length}>`;
      } else if (line.startsWith('|') && /^\|[\s:|\-]+$/.test(lines[i + 1] || '')) {
        flush(); const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        html += '<div class="readme-table"><table><thead><tr>' + cells(line).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
        i++;
        while (lines[i + 1]?.startsWith('|')) html += '<tr>' + cells(lines[++i]).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
        html += '</tbody></table></div>';
      } else if (/^[-*]\s/.test(line)) {
        if (paragraph.length) { html += `<p>${inline(paragraph.join(' '))}</p>`; paragraph = []; }
        if (!list) { html += '<ul>'; list = true; }
        html += `<li>${inline(line.slice(2))}</li>`;
      } else if (!line.trim()) flush();
      else { if (list) flush(); paragraph.push(line); }
    }
    flush(); return html;
  }
  let loaded = false;
  opener.addEventListener('click', async event => {
    event.preventDefault(); dialog.showModal(); document.body.classList.add('readme-open');
    if (loaded) return;
    content.textContent = 'README wird geladen …';
    try {
      const response = await fetch('README.md', {cache:'no-cache'});
      if (!response.ok) throw new Error('README unavailable');
      content.innerHTML = render(await response.text()); loaded = true;
    } catch { content.textContent = 'Die README konnte nicht geladen werden. Bitte über „Auf GitHub öffnen“ aufrufen.'; }
  });
  document.querySelector('[data-readme-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.classList.remove('readme-open'); opener.focus(); });
})();
