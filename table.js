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
        const error = document.getElementById('error');

        loading.style.display = 'none';
        table.style.display = 'table';
        
        const tableControls = document.getElementById('table-controls');
        tableControls.style.display = 'block';
        
        tbody.innerHTML = '';

        sections.forEach((section, index) => {
            if (!section.code) section.code = [];
            if (!section.other) section.other = [];
            
            const row = document.createElement('tr');
            row.className = 'section-row';

            const sourceCell = document.createElement('td');
            sourceCell.className = 'source-content';

            const contentContainer = document.createElement('div');
            contentContainer.className = 'source-content-container';
            contentContainer.style.display = 'none';

            if (section.title && section.title.trim() !== '') {
                const titleEl = document.createElement('h3');
                titleEl.className = 'collapsible-title';
                titleEl.style.margin = '0 0 10px 0';
                titleEl.style.color = '#333';
                titleEl.style.cursor = 'pointer';
                titleEl.style.userSelect = 'none';
                titleEl.style.display = 'flex';
                titleEl.style.alignItems = 'center';
                
                const arrow = document.createElement('span');
                arrow.className = 'collapse-arrow';
                arrow.textContent = '▶';
                arrow.style.marginRight = '8px';
                arrow.style.transition = 'transform 0.2s ease';
                
                const titleText = document.createElement('span');
                titleText.textContent = section.title;
                
                titleEl.appendChild(arrow);
                titleEl.appendChild(titleText);
                
                titleEl.addEventListener('click', () => {
                    const isCollapsed = contentContainer.style.display === 'none';
                    if (isCollapsed) {
                        contentContainer.style.display = 'block';
                        arrow.textContent = '▼';
                        arrow.style.transform = 'rotate(0deg)';
                    } else {
                        contentContainer.style.display = 'none';
                        arrow.textContent = '▶';
                        arrow.style.transform = 'rotate(0deg)';
                    }
                });
                
                sourceCell.appendChild(titleEl);
            }

        if (Array.isArray(section.source) && section.source.length > 0) {
            const hasTables = section.source.some(item => Array.isArray(item) && item.length > 0 && typeof item[0] === 'object');
            
            if (hasTables) {
                section.source.forEach(item => {
                        if (Array.isArray(item) && item.length > 0 && typeof item[0] === 'object') {
                            const tableEl = document.createElement('table');
                            tableEl.style.width = '100%';
                            tableEl.style.borderCollapse = 'collapse';
                            tableEl.style.fontSize = '0.9em';
                            tableEl.style.marginBottom = '10px';

                            const thead = document.createElement('thead');
                            const headerRow = document.createElement('tr');
                            const headers = Object.keys(item[0]);

                            headers.forEach(header => {
                                const th = document.createElement('th');
                                th.textContent = header;
                                th.style.padding = '8px';
                                th.style.border = '1px solid #ccc';
                                th.style.textAlign = 'left';
                                th.style.backgroundColor = '#f2f2f2';
                                headerRow.appendChild(th);
                            });
                            thead.appendChild(headerRow);
                            tableEl.appendChild(thead);

                            const tbody = document.createElement('tbody');
                            item.forEach(row => {
                                const tr = document.createElement('tr');
                                headers.forEach(header => {
                                    const td = document.createElement('td');
                                    td.innerHTML = escapeHtml(row[header] || '').replace(/\n/g, '<br>');
                                    td.style.padding = '8px';
                                    td.style.border = '1px solid #ccc';
                                    tr.appendChild(td);
                                });
                                tbody.appendChild(tr);
                            });
                            tableEl.appendChild(tbody);

                            contentContainer.appendChild(tableEl);
                        } else if (typeof item === 'string') {
                            const textEl = document.createElement('div');
                            textEl.innerHTML = escapeHtml(item).replace(/\n/g, '<br>');
                            textEl.style.marginBottom = '10px';
                            contentContainer.appendChild(textEl);
                        }
                    });
                } else {
                    const text = section.source.join('\n\n');
                    const textEl = document.createElement('div');
                    textEl.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
                    textEl.style.marginBottom = '10px';
                    contentContainer.appendChild(textEl);
                }
            }

            sourceCell.appendChild(contentContainer);

            const codeCell = document.createElement('td');

            const otherCell = document.createElement('td');

            const actionCell = document.createElement('td');
            const runButton = document.createElement('button');
            runButton.textContent = 'Rerun';
            runButton.className = 'run-btn';
            runButton.addEventListener('click', () => {
                processSection(index, runButton);
            });
            actionCell.appendChild(runButton);

            const runThisAndBelowButton = document.createElement('button');
            runThisAndBelowButton.innerHTML = 'Update this<br>and below';
            runThisAndBelowButton.className = 'run-btn';
            runThisAndBelowButton.style.fontSize = '0.8em';
            runThisAndBelowButton.style.padding = '4px 8px';
            runThisAndBelowButton.addEventListener('click', () => {
                processSectionAndBelow(index, runThisAndBelowButton);
            });
            actionCell.appendChild(runThisAndBelowButton);

            row.appendChild(actionCell);
            row.appendChild(sourceCell);
            row.appendChild(codeCell);
            row.appendChild(otherCell);

            tbody.appendChild(row);
        });

        window.updateTableColumnWidths = function() {
            const table = document.getElementById('sections-table');
            if (!table) return;
            
            const tableWidth = table.offsetWidth;
            const firstColumnWidth = 100;
            const remainingWidth = tableWidth - firstColumnWidth;
            const columnWidth = Math.floor(remainingWidth / 3);
            
            const allRows = table.querySelectorAll('tr');
            allRows.forEach(row => {
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
        const jsonText = jsonOutput.textContent;
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'requirer.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');

    collapseAllBtn.addEventListener('click', () => {
        const contentContainers = document.querySelectorAll('.source-content-container');
        const arrows = document.querySelectorAll('.collapse-arrow');
        
        contentContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        arrows.forEach(arrow => {
            arrow.textContent = '▶';
        });
    });

    expandAllBtn.addEventListener('click', () => {
        const contentContainers = document.querySelectorAll('.source-content-container');
        const arrows = document.querySelectorAll('.collapse-arrow');
        
        contentContainers.forEach(container => {
            container.style.display = 'block';
        });
        
        arrows.forEach(arrow => {
            arrow.textContent = '▼';
        });
    });
});