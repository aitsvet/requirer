/* exported LLMProcessor */
/* global ConfigManager, ResponseParser, Logger, APIClient, extractLLMText, updateCellContent */
class LLMProcessor {
    constructor() {
        this.configManager = new ConfigManager();
        this.apiClient = null;
        this.responseParser = new ResponseParser();
        this.logger = new Logger();
        this.sections = [];
    }

    async initialize() {
        if (!this.configManager.config) {
            const loaded = await this.configManager.loadConfig();
            if (!loaded) {
                return false;
            }
        }

        this.configManager.initialize();
        this.apiClient = new APIClient(this.configManager);
        return true;
    }

    async processSection(section, prompt, allSections = [], sectionIndex = null) {
        const startTime = Date.now();

        try {
            const fullPrompt = this.responseParser.substitutePlaceholders(prompt, section, allSections);
            const parameters = this.configManager.getParameters();

            const requestData = {
                url: this.configManager.getApiUrl() + '/completions',
                model: this.configManager.getModel(),
                prompt: fullPrompt,
                ...parameters
            };

            this.logger.logRequest(requestData, sectionIndex);

            const response = await this.apiClient.makeRequest(fullPrompt, parameters);
            const duration = Date.now() - startTime;

            this.logger.logResponse(response, sectionIndex, duration);

            const result = this.responseParser.parseLLMResponse(extractLLMText(response));

            if (sectionIndex !== null && allSections.length > 0) {
                if (!allSections[sectionIndex].code) allSections[sectionIndex].code = [];
                if (!allSections[sectionIndex].other) allSections[sectionIndex].other = [];

                allSections[sectionIndex].code = result.code;
                allSections[sectionIndex].other = result.other;

                this.updateJSONOutput(allSections);
            }

            return result;
        } catch (error) {
            console.error('Error processing section with LLM:', error);
            this.logger.logError(error, sectionIndex);
            throw error;
        }
    }

    getSectionsToSkip(prompt) {
        const sourcePlaceholderRegex = /\{sources\.(\d+)\}/g;
        const skipSections = new Set();
        let match;

        while ((match = sourcePlaceholderRegex.exec(prompt)) !== null) {
            skipSections.add(parseInt(match[1]));
        }

        return Array.from(skipSections);
    }

    async _processEligible(eligible, sections, prompt) {
        const concurrency = this.configManager.getConcurrency();
        const errors = [];

        for (let i = 0; i < eligible.length; i += concurrency) {
            const batch = eligible.slice(i, i + concurrency);
            const results = await Promise.allSettled(
                batch.map(({ section, index }) =>
                    this.processSection(section, prompt, sections, index)
                        .then(result => { this.updateTableRow(index, result); })
                )
            );
            results.forEach((r, bi) => {
                if (r.status === 'rejected') {
                    errors.push({ index: eligible[i + bi].index, message: r.reason?.message || String(r.reason) });
                }
            });
        }

        return errors;
    }

    async processAllSections(sections, prompt) {
        const sectionsToSkip = this.getSectionsToSkip(prompt);
        const eligible = sections
            .map((section, index) => ({ section, index }))
            .filter(({ section, index }) =>
                !sectionsToSkip.includes(index) && !this.hasNoSource(section));
        return this._processEligible(eligible, sections, prompt);
    }

    async processEmptySections(sections, prompt) {
        const sectionsToSkip = this.getSectionsToSkip(prompt);
        const eligible = sections
            .map((section, index) => ({ section, index }))
            .filter(({ section, index }) =>
                this.isSectionEmpty(section) && !sectionsToSkip.includes(index) && !this.hasNoSource(section));
        return this._processEligible(eligible, sections, prompt);
    }

    async processFromIndex(startIndex, sections, prompt) {
        const eligible = sections
            .slice(startIndex)
            .map((section, i) => ({ section, index: startIndex + i }))
            .filter(({ section }) => !this.hasNoSource(section));
        return this._processEligible(eligible, sections, prompt);
    }

    getConcurrency() {
        return this.configManager.getConcurrency();
    }

    isSectionEmpty(section) {
        const hasCode = section.code && section.code.length > 0 &&
                       !section.code.every(item =>
                           item === '(Код)' ||
                           item === 'Код' ||
                           item.trim() === '' ||
                           item === 'N/A' ||
                           item === 'None'
                       );

        const hasOther = section.other && section.other.length > 0 &&
                        !section.other.every(item =>
                            item === 'Текст' ||
                            item === 'Требования' ||
                            item.trim() === '' ||
                            item === 'N/A' ||
                            item === 'None'
                        );

        return !hasCode && !hasOther;
    }

    hasNoSource(section) {
        if (!section.source || section.source.length === 0) {
            return true;
        }

        return section.source.every(sourceItem => {
            if (typeof sourceItem === 'string') {
                return sourceItem.trim() === '';
            } else if (Array.isArray(sourceItem)) {
                return sourceItem.length === 0;
            }
            return true;
        });
    }

    updateTableRow(index, result) {
        const tbody = document.getElementById('sections-tbody');
        const row = tbody.children[index];

        if (row) {
            updateCellContent(row.children[2], result.code);
            updateCellContent(row.children[3], result.other);

            setTimeout(() => {
                if (window.updateTableColumnWidths) {
                    window.updateTableColumnWidths();
                }
            }, 0);
        }
    }

    updateJSONOutput(sections) {
        const jsonOutput = document.getElementById('json-output');
        jsonOutput.textContent = JSON.stringify(sections, null, 2);
    }

    clearLogs() {
        this.logger.clearLogs();
    }

    downloadLogs() {
        this.logger.downloadLogs();
    }
}
