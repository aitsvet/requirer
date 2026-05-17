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
                        currentSection = { title: '', source: [] };
                    }
                    currentSection.source.push(currentParagraph.trim());
                    currentParagraph = '';
                }

                if (currentSection && (currentSection.source.length > 0 || currentSection.title)) {
                    sections.push(currentSection);
                }

                currentSection = { title: headingMatch[1], source: [] };
            } else {
                if (!currentSection) {
                    currentSection = { title: '', source: [] };
                }

                if (line.trim() === '') {
                    if (currentParagraph.trim() !== '') {
                        currentSection.source.push(currentParagraph.trim());
                        currentParagraph = '';
                    }
                } else {
                    currentParagraph = currentParagraph !== '' ? currentParagraph + '\n' + line : line;
                }
            }
        }

        if (currentParagraph.trim() !== '') {
            if (!currentSection) {
                currentSection = { title: '', source: [] };
            }
            currentSection.source.push(currentParagraph.trim());
        }

        if (currentSection && (currentSection.source.length > 0 || currentSection.title)) {
            sections.push(currentSection);
        }

        for (const section of sections) {
            const newSource = [];

            for (const para of section.source) {
                if (typeof para === 'string' && this.isTableInText(para)) {
                    const table = this.parseTableFromText(para);
                    newSource.push(table && table.length > 0 ? table : para);
                } else {
                    newSource.push(para);
                }
            }

            section.source = newSource;
        }

        this.sections = sections;
    }

    isTableInText(text) {
        const lines = text.trim().split('\n');
        return lines.some(line => /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line));
    }

    splitTableRow(line) {
        const parts = line.split('|');
        const start = parts[0].trim() === '' ? 1 : 0;
        const end = parts[parts.length - 1].trim() === '' ? parts.length - 1 : parts.length;
        return parts.slice(start, end).map(p => p.trim());
    }

    isSeparatorRow(line) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
        return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));
    }

    parseTableFromText(text) {
        const lines = text.trim().split('\n');
        let headerRow = -1;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('|')) {
                headerRow = i;
                break;
            }
        }

        if (headerRow === -1) return null;

        const headers = this.splitTableRow(lines[headerRow]);
        if (headers.length === 0) return null;

        let dataStartRow = headerRow + 1;
        if (dataStartRow < lines.length && this.isSeparatorRow(lines[dataStartRow])) {
            dataStartRow++;
        }

        const tableData = [];
        for (let i = dataStartRow; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.includes('|')) continue;

            const values = this.splitTableRow(line);
            if (values.length > 0) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ?? '';
                });
                tableData.push(row);
            }
        }

        return tableData.length > 0 ? tableData : null;
    }

    showError(message) {
        console.error('MarkdownParser Error:', message);
    }
}
