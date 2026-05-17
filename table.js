/* global MarkdownParser, createSectionRow */
document.addEventListener('DOMContentLoaded', () => {
    const parser = new MarkdownParser();

    parser.loadMarkdownFile().then(sections => {
        window.parsedSections = sections;

        const jsonOutput = document.getElementById('json-output');
        jsonOutput.style.display = 'block';
        jsonOutput.textContent = JSON.stringify(sections, null, 2);

        const table = document.getElementById('sections-table');
        const tbody = document.getElementById('sections-tbody');
        const loading = document.getElementById('loading');

        loading.style.display = 'none';
        table.style.display = 'table';
        document.getElementById('table-controls').style.display = 'flex';

        tbody.innerHTML = '';
        sections.forEach((section, index) => {
            tbody.appendChild(createSectionRow(section, index));
        });

        window.updateTableColumnWidths = function() {
            const t = document.getElementById('sections-table');
            if (!t) return;

            const firstColumnWidth = 100;
            const columnWidth = Math.floor((t.offsetWidth - firstColumnWidth) / 3);

            t.querySelectorAll('tr').forEach(row => {
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 4) {
                    cells[1].style.width = columnWidth + 'px';
                    cells[2].style.width = columnWidth + 'px';
                    cells[3].style.width = columnWidth + 'px';
                }
            });
        };

        window.updateTableColumnWidths();
    }).catch(err => {
        const error = document.getElementById('error');
        error.style.display = 'block';
        error.textContent = err.message;
    });

    const downloadBtn = document.getElementById('download-json');
    const jsonOutput = document.getElementById('json-output');

    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([jsonOutput.textContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'requirer.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('collapse-all-btn').addEventListener('click', () => {
        document.querySelectorAll('.source-content-container').forEach(c => { c.style.display = 'none'; });
        document.querySelectorAll('.collapse-arrow').forEach(a => { a.textContent = '▶'; });
    });

    document.getElementById('expand-all-btn').addEventListener('click', () => {
        document.querySelectorAll('.source-content-container').forEach(c => { c.style.display = 'block'; });
        document.querySelectorAll('.collapse-arrow').forEach(a => { a.textContent = '▼'; });
    });
});
