let llmProcessor = null;

document.addEventListener('DOMContentLoaded', async () => {
    llmProcessor = new LLMProcessor();
    await llmProcessor.initialize();
    
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const downloadLogsBtn = document.getElementById('download-logs-btn');
    
    clearLogsBtn.addEventListener('click', () => {
        llmProcessor.clearLogs();
    });
    
    downloadLogsBtn.addEventListener('click', () => {
        llmProcessor.downloadLogs();
    });
    
    const downloadMdBtn = document.getElementById('download-md-btn');
    downloadMdBtn.addEventListener('click', () => {
        downloadMarkdownFile();
    });
    
    const uploadMdBtn = document.getElementById('upload-md-btn');
    const uploadMdInput = document.getElementById('upload-md-input');
    uploadMdBtn.addEventListener('click', () => {
        uploadMdInput.click();
    });
    
    uploadMdInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadMarkdownFile(file);
        }
    });
    
    const uploadJsonBtn = document.getElementById('upload-json-btn');
    const uploadJsonInput = document.getElementById('upload-json-input');
    uploadJsonBtn.addEventListener('click', () => {
        uploadJsonInput.click();
    });
    
    uploadJsonInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadJsonFile(file);
        }
    });
});

async function processSection(index, button = null) {
    if (!llmProcessor) {
        llmProcessor = new LLMProcessor();
    }
    
    if (!await llmProcessor.initialize()) return;
    
    const prompt = document.getElementById('prompt-textarea').value;
    if (!prompt.trim()) {
        alert('Please enter a prompt');
        return;
    }
    
    const sections = window.parsedSections || [];
    if (index >= sections.length) {
        alert('Invalid section index');
        return;
    }
    
    if (button) {
        button.disabled = true;
        button.textContent = 'Running...';
    }
    
    try {
        const result = await llmProcessor.processSection(sections[index], prompt, sections, index);
        llmProcessor.updateTableRow(index, result);
    } catch (error) {
        alert(`Error processing section: ${error.message}`);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Rerun';
        }
    }
}

async function processSectionAndBelow(startIndex, button = null) {
    if (!llmProcessor) {
        llmProcessor = new LLMProcessor();
    }
    
    if (!await llmProcessor.initialize()) return;
    
    const prompt = document.getElementById('prompt-textarea').value;
    if (!prompt.trim()) {
        alert('Please enter a prompt');
        return;
    }
    
    const sections = window.parsedSections || [];
    if (startIndex >= sections.length) {
        alert('Invalid section index');
        return;
    }
    
    if (button) {
        button.disabled = true;
        button.textContent = 'Processing...';
    }
    
    try {
        // Process all sections from startIndex to the end
        for (let i = startIndex; i < sections.length; i++) {
            const result = await llmProcessor.processSection(sections[i], prompt, sections, i);
            llmProcessor.updateTableRow(i, result);
        }
        llmProcessor.updateJSONOutput(sections);
    } catch (error) {
        alert(`Error processing sections: ${error.message}`);
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = 'Run this<br>and below';
        }
    }
}

function downloadMarkdownFile() {
    const sections = window.parsedSections || [];
    if (sections.length === 0) {
        alert('No sections to download');
        return;
    }
    
    let markdownContent = '';
    
    sections.forEach(section => {
        if (section.title && section.title.trim() !== '') {
            markdownContent += `# ${section.title}\n\n`;
        }
        
        if (section.source && section.source.length > 0) {
            section.source.forEach(paragraph => {
                if (typeof paragraph === 'string') {
                    markdownContent += paragraph + '\n\n';
                } else if (Array.isArray(paragraph)) {
                    if (paragraph.length > 0) {
                        const headers = Object.keys(paragraph[0]);
                        markdownContent += '| ' + headers.join(' | ') + ' |\n';
                        markdownContent += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                        
                        paragraph.forEach(row => {
                            const values = headers.map(header => row[header] || '');
                            markdownContent += '| ' + values.join(' | ') + ' |\n';
                        });
                        markdownContent += '\n';
                    }
                }
            });
        }
    });
    
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirer.md';
    a.click();
    URL.revokeObjectURL(url);
}

async function uploadMarkdownFile(file) {
    try {
        const text = await file.text();
        const parser = new MarkdownParser();
        parser.parseMarkdown(text);
        const sections = parser.sections;
        
        window.parsedSections = sections;
        
        const jsonOutput = document.getElementById('json-output');
        jsonOutput.textContent = JSON.stringify(sections, null, 2);
        
        rerenderTable(sections);
        
        alert('Markdown file uploaded and parsed successfully');
    } catch (error) {
        alert(`Error uploading markdown file: ${error.message}`);
    }
}

async function uploadJsonFile(file) {
    try {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        
        const currentSections = window.parsedSections || [];
        
        console.log('=== JSON Upload Diff Analysis ===');
        console.log('Uploaded JSON sections:', jsonData.length);
        console.log('Current sections:', currentSections.length);
        
        console.log('Uploaded JSON structure preview:');
        if (jsonData.length > 0) {
            console.log('First section keys:', Object.keys(jsonData[0]));
            console.log('First section sample:', jsonData[0]);
        }
        
        if (jsonData.length !== currentSections.length) {
            console.error('❌ Section count mismatch:', {
                uploaded: jsonData.length,
                current: currentSections.length,
                difference: jsonData.length - currentSections.length
            });
            alert(`JSON file has different number of sections than current data. Upload stopped.\n\nUploaded: ${jsonData.length} sections\nCurrent: ${currentSections.length} sections`);
            return;
        }
        
        console.log('✅ Section count matches, proceeding with content validation...');
        
        let validationErrors = [];
        let diffSummary = {
            sectionsWithDifferences: 0,
            totalCodeItems: 0,
            totalOtherItems: 0,
            codeChanges: [],
            otherChanges: []
        };
        
        for (let i = 0; i < jsonData.length; i++) {
            const currentSection = currentSections[i];
            const jsonSection = jsonData[i];
            
            console.log(`\n--- Validating Section ${i + 1} ---`);
            console.log('Current section structure:', {
                hasSource: 'source' in currentSection,
                hasCode: 'code' in currentSection,
                hasOther: 'other' in currentSection,
                hasTitle: 'title' in currentSection
            });
            console.log('Uploaded section structure:', {
                hasSource: 'source' in jsonSection,
                hasCode: 'code' in jsonSection,
                hasOther: 'other' in jsonSection,
                hasTitle: 'title' in jsonSection
            });
            
            if (!('source' in jsonSection)) {
                console.warn(`⚠️ Section ${i + 1} in uploaded JSON does not have 'source' property`);
                console.log('Uploaded section keys:', Object.keys(jsonSection));
                console.log('Uploaded section:', jsonSection);
            }
            
            const currentSource = currentSection.source || [];
            const uploadedSource = jsonSection.source || [];
            
            console.log('Current source:', currentSource);
            console.log('Uploaded source:', uploadedSource);
            
            if (JSON.stringify(currentSource) !== JSON.stringify(uploadedSource)) {
                console.error(`❌ Section ${i + 1} source content mismatch`);
                console.error('Current source:', JSON.stringify(currentSource, null, 2));
                console.error('Uploaded source:', JSON.stringify(uploadedSource, null, 2));
                validationErrors.push(`Section ${i + 1} source content does not match uploaded JSON`);
            } else {
                console.log(`✅ Section ${i + 1} source content matches`);
            }
            
            const currentCode = currentSection.code || [];
            const uploadedCode = jsonSection.code || [];
            const currentOther = currentSection.other || [];
            const uploadedOther = jsonSection.other || [];
            
            if (JSON.stringify(currentCode) !== JSON.stringify(uploadedCode)) {
                diffSummary.sectionsWithDifferences++;
                diffSummary.codeChanges.push({
                    section: i + 1,
                    current: currentCode,
                    uploaded: uploadedCode
                });
                console.log(`📝 Section ${i + 1} code changes detected:`, {
                    current: currentCode,
                    uploaded: uploadedCode
                });
            }
            
            if (JSON.stringify(currentOther) !== JSON.stringify(uploadedOther)) {
                diffSummary.sectionsWithDifferences++;
                diffSummary.otherChanges.push({
                    section: i + 1,
                    current: currentOther,
                    uploaded: uploadedOther
                });
                console.log(`📝 Section ${i + 1} other changes detected:`, {
                    current: currentOther,
                    uploaded: uploadedOther
                });
            }
            
            diffSummary.totalCodeItems += uploadedCode.length;
            diffSummary.totalOtherItems += uploadedOther.length;
        }
        
        if (validationErrors.length > 0) {
            console.error('❌ Validation failed with errors:', validationErrors);
            alert(`Upload stopped due to validation errors:\n\n${validationErrors.join('\n')}`);
            return;
        }
        
        console.log('\n=== Diff Summary ===');
        console.log(`Sections with differences: ${diffSummary.sectionsWithDifferences}`);
        console.log(`Total code items to be updated: ${diffSummary.totalCodeItems}`);
        console.log(`Total other items to be updated: ${diffSummary.totalOtherItems}`);
        console.log('Code changes:', diffSummary.codeChanges);
        console.log('Other changes:', diffSummary.otherChanges);
        
        console.log('\n=== Applying Changes ===');
        for (let i = 0; i < jsonData.length; i++) {
            const currentSection = currentSections[i];
            const jsonSection = jsonData[i];
            
            const oldCode = [...(currentSection.code || [])];
            const oldOther = [...(currentSection.other || [])];
            
            currentSection.code = jsonSection.code || [];
            currentSection.other = jsonSection.other || [];
            
            console.log(`Section ${i + 1} updated:`, {
                code: { from: oldCode, to: currentSection.code },
                other: { from: oldOther, to: currentSection.other }
            });
        }
        
        window.parsedSections = currentSections;
        
        const jsonOutput = document.getElementById('json-output');
        jsonOutput.textContent = JSON.stringify(currentSections, null, 2);
        
        rerenderTable(currentSections);
        
        console.log('✅ JSON file uploaded and validated successfully');
        console.log('=== End of Diff Analysis ===\n');
        
        alert(`JSON file uploaded and validated successfully!\n\nUpdated ${diffSummary.sectionsWithDifferences} sections with ${diffSummary.totalCodeItems} code items and ${diffSummary.totalOtherItems} other items.`);
    } catch (error) {
        console.error('❌ Error uploading JSON file:', error);
        alert(`Error uploading JSON file: ${error.message}`);
    }
}

function rerenderTable(sections) {
    const table = document.getElementById('sections-table');
    const tbody = document.getElementById('sections-tbody');
    
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
                                td.innerHTML = (row[header] || '').replace(/\n/g, '<br>');
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
                        textEl.innerHTML = item.replace(/\n/g, '<br>');
                        textEl.style.marginBottom = '10px';
                        contentContainer.appendChild(textEl);
                    }
                });
            } else {
                const text = section.source.join('\n\n');
                const textEl = document.createElement('div');
                textEl.innerHTML = text.replace(/\n/g, '<br>');
                textEl.style.marginBottom = '10px';
                contentContainer.appendChild(textEl);
            }
        }

        sourceCell.appendChild(contentContainer);

        const codeCell = document.createElement('td');
        if (section.code && section.code.length > 0) {
            const codeContent = section.code.map(item => `<div>${item}</div>`).join('');
            codeCell.innerHTML = codeContent;
        }

        const otherCell = document.createElement('td');
        if (section.other && section.other.length > 0) {
            const otherContent = section.other.map(item => `<div>${item}</div>`).join('');
            otherCell.innerHTML = otherContent;
        }

        const actionCell = document.createElement('td');
        const runButton = document.createElement('button');
        runButton.textContent = 'Rerun';
        runButton.className = 'run-btn';
        runButton.addEventListener('click', () => {
            processSection(index, runButton);
        });
        actionCell.appendChild(runButton);

        const runThisAndBelowButton = document.createElement('button');
        runThisAndBelowButton.innerHTML = 'Run this<br>and below';
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
    
    setTimeout(() => {
        if (window.updateTableColumnWidths) {
            window.updateTableColumnWidths();
        }
    }, 0);
}
