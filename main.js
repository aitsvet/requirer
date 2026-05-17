/* exported processSection, processSectionAndBelow */
/* global LLMProcessor, MarkdownParser, createSectionRow */
let llmProcessor = null;

document.addEventListener('DOMContentLoaded', async () => {
    llmProcessor = new LLMProcessor();
    await llmProcessor.initialize();

    document.getElementById('clear-logs-btn').addEventListener('click', () => {
        llmProcessor.clearLogs();
    });

    document.getElementById('download-logs-btn').addEventListener('click', () => {
        llmProcessor.downloadLogs();
    });

    document.getElementById('download-md-btn').addEventListener('click', () => {
        downloadMarkdownFile();
    });

    const uploadMdInput = document.getElementById('upload-md-input');
    document.getElementById('upload-md-btn').addEventListener('click', () => {
        uploadMdInput.click();
    });
    uploadMdInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) uploadMarkdownFile(file);
    });

    const uploadJsonInput = document.getElementById('upload-json-input');
    document.getElementById('upload-json-btn').addEventListener('click', () => {
        uploadJsonInput.click();
    });
    uploadJsonInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) uploadJsonFile(file);
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
        const errors = await llmProcessor.processFromIndex(startIndex, sections, prompt);
        llmProcessor.updateJSONOutput(sections);
        if (errors.length > 0) {
            alert(`${errors.length} section(s) failed:\n${errors.map(e => `Section ${e.index + 1}: ${e.message}`).join('\n')}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = '';
            button.appendChild(document.createTextNode('Run this'));
            button.appendChild(document.createElement('br'));
            button.appendChild(document.createTextNode('and below'));
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

        if (jsonData.length !== currentSections.length) {
            alert(`JSON file has different number of sections than current data. Upload stopped.\n\nUploaded: ${jsonData.length} sections\nCurrent: ${currentSections.length} sections`);
            return;
        }

        const validationErrors = [];
        let sectionsUpdated = 0;

        for (let i = 0; i < jsonData.length; i++) {
            const currentSection = currentSections[i];
            const jsonSection = jsonData[i];

            const currentSource = currentSection.source || [];
            const uploadedSource = jsonSection.source || [];

            if (JSON.stringify(currentSource) !== JSON.stringify(uploadedSource)) {
                validationErrors.push(`Section ${i + 1} source content does not match uploaded JSON`);
            }
        }

        if (validationErrors.length > 0) {
            alert(`Upload stopped due to validation errors:\n\n${validationErrors.join('\n')}`);
            return;
        }

        for (let i = 0; i < jsonData.length; i++) {
            const currentSection = currentSections[i];
            const jsonSection = jsonData[i];
            const hadChanges =
                JSON.stringify(currentSection.code) !== JSON.stringify(jsonSection.code) ||
                JSON.stringify(currentSection.other) !== JSON.stringify(jsonSection.other);
            if (hadChanges) {
                currentSection.code = jsonSection.code || [];
                currentSection.other = jsonSection.other || [];
                sectionsUpdated++;
            }
        }

        window.parsedSections = currentSections;

        const jsonOutput = document.getElementById('json-output');
        jsonOutput.textContent = JSON.stringify(currentSections, null, 2);

        rerenderTable(currentSections);

        alert(`JSON uploaded successfully. ${sectionsUpdated} section(s) updated.`);
    } catch (error) {
        alert(`Error uploading JSON file: ${error.message}`);
    }
}

function rerenderTable(sections) {
    const tbody = document.getElementById('sections-tbody');
    tbody.innerHTML = '';

    sections.forEach((section, index) => {
        tbody.appendChild(createSectionRow(section, index));
    });

    setTimeout(() => {
        if (window.updateTableColumnWidths) {
            window.updateTableColumnWidths();
        }
    }, 0);
}
