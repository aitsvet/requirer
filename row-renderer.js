/* exported createSectionRow, updateCellContent */
/* global processSection, processSectionAndBelow, createTextContent */

function createSourceTable(data) {
    const tableEl = document.createElement('table');
    tableEl.className = 'source-table';

    const headers = Object.keys(data[0]);
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    tableEl.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            createTextContent(td, row[header] || '');
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    tableEl.appendChild(tbody);

    return tableEl;
}

function updateCellContent(cell, items) {
    cell.innerHTML = '';
    if (items && items.length > 0) {
        items.forEach(item => {
            const div = document.createElement('div');
            div.textContent = item;
            cell.appendChild(div);
        });
    }
}

function createSectionRow(section, index) {
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

        const arrow = document.createElement('span');
        arrow.className = 'collapse-arrow';
        arrow.textContent = '▶';

        const titleText = document.createElement('span');
        titleText.textContent = section.title;

        titleEl.appendChild(arrow);
        titleEl.appendChild(titleText);

        titleEl.addEventListener('click', () => {
            const isCollapsed = contentContainer.style.display === 'none';
            contentContainer.style.display = isCollapsed ? 'block' : 'none';
            arrow.textContent = isCollapsed ? '▼' : '▶';
        });

        sourceCell.appendChild(titleEl);
    }

    if (Array.isArray(section.source) && section.source.length > 0) {
        const hasTables = section.source.some(
            item => Array.isArray(item) && item.length > 0 && typeof item[0] === 'object'
        );

        if (hasTables) {
            section.source.forEach(item => {
                if (Array.isArray(item) && item.length > 0 && typeof item[0] === 'object') {
                    contentContainer.appendChild(createSourceTable(item));
                } else if (typeof item === 'string') {
                    const textEl = document.createElement('div');
                    textEl.className = 'source-text';
                    createTextContent(textEl, item);
                    contentContainer.appendChild(textEl);
                }
            });
        } else {
            const textEl = document.createElement('div');
            textEl.className = 'source-text';
            createTextContent(textEl, section.source.join('\n\n'));
            contentContainer.appendChild(textEl);
        }
    }

    sourceCell.appendChild(contentContainer);

    const codeCell = document.createElement('td');
    updateCellContent(codeCell, section.code);

    const otherCell = document.createElement('td');
    updateCellContent(otherCell, section.other);

    const actionCell = document.createElement('td');

    const runButton = document.createElement('button');
    runButton.textContent = 'Rerun';
    runButton.className = 'run-btn';
    runButton.addEventListener('click', () => processSection(index, runButton));
    actionCell.appendChild(runButton);

    const runBelowButton = document.createElement('button');
    runBelowButton.className = 'run-btn run-btn-below';
    runBelowButton.appendChild(document.createTextNode('Run this'));
    runBelowButton.appendChild(document.createElement('br'));
    runBelowButton.appendChild(document.createTextNode('and below'));
    runBelowButton.addEventListener('click', () => processSectionAndBelow(index, runBelowButton));
    actionCell.appendChild(runBelowButton);

    row.appendChild(actionCell);
    row.appendChild(sourceCell);
    row.appendChild(codeCell);
    row.appendChild(otherCell);

    return row;
}
