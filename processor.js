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
            
            const requestParameters = {
                ...parameters
            };
            
            const requestData = {
                url: this.configManager.getApiUrl() + '/completions',
                model: this.configManager.getModel(),
                prompt: fullPrompt,
                ...requestParameters
            };

            this.logger.logRequest(requestData, sectionIndex);

            const response = await this.apiClient.makeRequest(fullPrompt, requestParameters);
            const duration = Date.now() - startTime;
            
            this.logger.logResponse(response, sectionIndex, duration);
            
            const result = this.responseParser.parseLLMResponse(response.choices[0].text);
            
            if (sectionIndex !== null && allSections.length > 0) {
                if (!allSections[sectionIndex].code) allSections[sectionIndex].code = [];
                if (!allSections[sectionIndex].other) allSections[sectionIndex].other = [];
                
                allSections[sectionIndex].code = result.code;
                allSections[sectionIndex].other = result.other;
                
                this.updateJSONOutput(allSections);
            }
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
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

    async processAllSections(sections, prompt) {
        const results = [];
        const sectionsToSkip = this.getSectionsToSkip(prompt);
        
        for (let i = 0; i < sections.length; i++) {
            if (sectionsToSkip.includes(i)) {
                continue;
            }
            
            if (this.hasNoSource(sections[i])) {
                continue;
            }
            
            try {
                const result = await this.processSection(sections[i], prompt, sections, i);
                results.push({
                    index: i,
                    result: result,
                    success: true
                });
                
                this.updateTableRow(i, result);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                results.push({
                    index: i,
                    error: error.message,
                    success: false
                });
            }
        }
        
        return results;
    }

    async processEmptySections(sections, prompt) {
        const emptySections = sections.map((section, index) => ({ section, index }))
            .filter(({ section }) => this.isSectionEmpty(section));
        
        const sectionsToSkip = this.getSectionsToSkip(prompt);
        const results = [];
        
        for (const { section, index } of emptySections) {
            if (sectionsToSkip.includes(index)) {
                continue;
            }
            
            if (this.hasNoSource(section)) {
                continue;
            }
            
            try {
                const result = await this.processSection(section, prompt, sections, index);
                results.push({
                    index: index,
                    result: result,
                    success: true
                });
                
                this.updateTableRow(index, result);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                results.push({
                    index: index,
                    error: error.message,
                    success: false
                });
            }
        }
        
        return results;
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
            const codeCell = row.children[2];
            const otherCell = row.children[3];
            
            if (result.code && result.code.length > 0) {
                const newCodeContent = result.code.map(item => `<div>${escapeHtml(item)}</div>`).join('');
                codeCell.innerHTML = newCodeContent;
            } else {
                codeCell.innerHTML = '';
            }

            if (result.other && result.other.length > 0) {
                const newOtherContent = result.other.map(item => `<div>${escapeHtml(item)}</div>`).join('');
                otherCell.innerHTML = newOtherContent;
            } else {
                otherCell.innerHTML = '';
            }
            
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
