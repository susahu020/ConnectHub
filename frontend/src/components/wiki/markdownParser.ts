// ----------------------------------------------------
// CUSTOM MARKDOWN PARSER
// ----------------------------------------------------
export const parseMarkdown = (text: string) => {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-slate-850 dark:text-slate-100 mt-5 mb-2 border-b pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3">$1</h1>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr class="border-t border-slate-200 dark:border-slate-800 my-4" />');

  // Bold & Italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Checklist Items (Unchecked and Checked)
  html = html.replace(
    /^\- \[ \] (.*$)/gim,
    '<li class="list-none flex items-center space-x-2 text-slate-700 dark:text-slate-350 my-1"><input type="checkbox" disabled class="mr-2 rounded border-slate-300 dark:border-slate-700 h-3.5 w-3.5 text-primary" /> $1</li>'
  );
  html = html.replace(
    /^\- \[x\] (.*$)/gim,
    '<li class="list-none flex items-center space-x-2 text-slate-400 dark:text-slate-500 line-through my-1"><input type="checkbox" checked disabled class="mr-2 rounded border-slate-300 dark:border-slate-700 h-3.5 w-3.5 text-primary bg-primary" /> $1</li>'
  );

  // Bullet Lists
  html = html.replace(/^\- (.*$)/gim, '<li class="list-disc ml-5 mb-1 text-slate-700 dark:text-slate-355">$1</li>');

  // Numbered Lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="list-decimal ml-5 mb-1 text-slate-700 dark:text-slate-355">$1</li>');

  // Blockquotes
  html = html.replace(
    /^\> (.*$)/gim,
    '<blockquote class="border-l-4 border-primary bg-slate-50 dark:bg-slate-800/40 px-4 py-2 rounded-r-xl my-4 text-slate-650 dark:text-slate-400 italic">$1</blockquote>'
  );

  // Code blocks & Inline Code
  html = html.replace(
    /\`\`\`([\s\S]*?)\`\`\`/g,
    '<pre class="bg-slate-55 dark:bg-slate-800 p-4 rounded-xl overflow-x-auto text-[11px] font-mono border dark:border-slate-700 my-4 text-slate-700 dark:text-slate-300">$1</pre>'
  );
  html = html.replace(
    /\`(.*?)\`/g,
    '<code class="bg-slate-55 dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700 text-[11px] font-mono text-primary">$1</code>'
  );

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline font-semibold" target="_blank" rel="noopener noreferrer">$1</a>');

  // Table Parsing
  const lines = html.split('\n');
  let inTable = false;
  let tableHeader = true;
  let tableHTML = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (!inTable) {
        inTable = true;
        tableHeader = true;
        tableHTML = '<div class="overflow-x-auto my-4"><table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 border dark:border-slate-850 rounded-xl overflow-hidden">';
      }

      // Check for separator row (e.g. |---|---|)
      if (cells.every((c) => c.match(/^:?-+:?$/))) {
        tableHeader = false;
        continue;
      }

      if (tableHeader) {
        tableHTML += '<thead class="bg-slate-50 dark:bg-slate-800/50"><tr>';
        cells.forEach((cell) => {
          tableHTML += `<th class="px-4 py-2.5 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">${cell}</th>`;
        });
        tableHTML += '</tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">';
        tableHeader = false;
      } else {
        tableHTML += '<tr class="hover:bg-slate-55/50 dark:hover:bg-slate-800/20">';
        cells.forEach((cell) => {
          tableHTML += `<td class="px-4 py-2 text-xs text-slate-700 dark:text-slate-350">${cell}</td>`;
        });
        tableHTML += '</tr>';
      }
    } else {
      if (inTable) {
        tableHTML += '</tbody></table></div>';
        lines[i - 1] = tableHTML;
        inTable = false;
      }
    }
  }
  if (inTable) {
    tableHTML += '</tbody></table></div>';
    lines[lines.length - 1] = tableHTML;
  }

  html = lines.join('\n');
  return html;
};
