/* exported MarkdownParser */
class MarkdownParser {
    constructor() {
        this.sections = [];
    }

    async loadMarkdownFile() {
        try {
            const response = await fetch('sample.md');
            if (!response.ok) {
                throw new Error(`Failed to load markdown file: ${response.status}`);
            }
            const markdownText = await response.text();
            this.parseMarkdown(markdownText);
            return this.sections;
        } catch (error) {
            this.showError(`Error loading markdown file: ${error.message}`);
            return [];
        }
    }

    parseMarkdown(text) {
        const lines = text.split('\n');
        const sections = [];
        let currentSection = null;
        let currentParagraph = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const headingMatch = line.trim().match(/^#+\s+(.+)/);
            if (headingMatch) {
                if (currentParagraph.trim() !== '') {
                    if (!currentSection) {
                        currentSection = {
                            title: '',
                            source: []
                        };
                    }
                    currentSection.source.push(currentParagraph.trim());
                    currentParagraph = '';
                }

                if (currentSection && (currentSection.source.length > 0 || currentSection.title)) {
                    sections.push(currentSection);
                }

                currentSection = {
                    title: headingMatch[1],
                    source: []
                };
            } else {
                if (!currentSection) {
                    currentSection = {
                        title: '',
                        source: []
                    };
                }

                if (line.trim() === '') {
                    if (currentParagraph.trim() !== '') {
                        currentSection.source.push(currentParagraph.trim());
                        currentParagraph = '';
                    }
                } else {
                    if (currentParagraph !== '') {
                        currentParagraph += '\n' + line;
                    } else {
                        currentParagraph = line;
                    }
                }
            }
        }

        if (currentParagraph.trim() !== '') {
            if (!currentSection) {
                currentSection = {
                    title: '',
                    source: []
                };
            }
            currentSection.source.push(currentParagraph.trim());
        }

        if (currentSection && (currentSection.source.length > 0 || currentSection.title)) {
            sections.push(currentSection);
        }

        for (const section of sections) {
            const newSource = [];
            let i = 0;

            while (i < section.source.length) {
                const para = section.source[i];

                if (typeof para === 'string' && this.isTableInText(para)) {
                    const table = this.parseTableFromText(para);
                    if (table && table.length > 0) {
                        newSource.push(table);
                    } else {
                        newSource.push(para);
                    }
                } else {
                    newSource.push(para);
                }
                i++;
            }

            section.source = newSource;
        }

        this.sections = sections;
    }

    isTableInText(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return false;
        return lines.some(line => line.includes('|'));
    }

    parseTableFromText(text) {
        const lines = text.trim().split('\n');
        const tableData = [];
        let headerRow = -1;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('|')) {
                headerRow = i;
                break;
            }
        }

        if (headerRow === -1) return null;

        const headers = lines[headerRow].split('|')
            .map(h => h.trim())
            .filter(h => h !== '');

        let dataStartRow = headerRow + 1;
        if (dataStartRow < lines.length && lines[dataStartRow].includes('---')) {
            dataStartRow++;
        }

        for (let i = dataStartRow; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('|')) {
                const values = line.split('|')
                    .map(v => v.trim())
                    .filter(v => v !== '');

                if (values.length > 0) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });
                    tableData.push(row);
                }
            }
        }

        return tableData.length > 0 ? tableData : null;
    }

    showError(message) {
        console.error('MarkdownParser Error:', message);
    }
}
