class ResponseParser {
    parseLLMResponse(response) {
        const lines = response.split('\n');
        const codeRequirements = [];
        const otherRequirements = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('+')) {
                codeRequirements.push(trimmed.substring(1).trim());
            } else if (trimmed.startsWith('-')) {
                otherRequirements.push(trimmed.substring(1).trim());
            }
        });

        return {
            code: codeRequirements,
            other: otherRequirements
        };
    }

    formatSectionForPrompt(section) {
        let content = '';
        
        if (section.title) {
            content += `Title: ${section.title}\n\n`;
        }
        
        if (section.source && section.source.length > 0) {
            section.source.forEach(sourceItem => {
                if (typeof sourceItem === 'string') {
                    content += sourceItem + '\n\n';
                } else if (Array.isArray(sourceItem)) {
                    content += 'Table data:\n';
                    
                    if (sourceItem.length > 0) {
                        const firstRow = sourceItem[0];
                        const fieldNames = Object.keys(firstRow);
                        
                        if (fieldNames.length === 2) {
                            const firstFieldName = fieldNames[0];
                            if (firstFieldName.startsWith('Сокр') || firstFieldName.startsWith('Терм')) {
                                sourceItem.forEach(row => {
                                    const firstValue = row[fieldNames[0]] || '';
                                    const secondValue = row[fieldNames[1]] || '';
                                    content += `${firstValue} - ${secondValue}\n`;
                                });
                            } else {
                                sourceItem.forEach(row => {
                                    Object.entries(row).forEach(([key, value]) => {
                                        content += `${key}: ${value}\n`;
                                    });
                                    content += '---\n';
                                });
                            }
                        } else {
                            sourceItem.forEach(row => {
                                Object.entries(row).forEach(([key, value]) => {
                                    content += `${key}: ${value}\n`;
                                });
                                content += '---\n';
                            });
                        }
                    }
                }
            });
        }
        
        return content.trim();
    }

    substitutePlaceholders(prompt, section, allSections) {
        let result = prompt;
        
        if (result.includes('{source}')) {
            const sourceContent = this.formatSectionForPrompt(section);
            result = result.replace('{source}', sourceContent);
        }
        
        const sourcePlaceholderRegex = /\{sources\.(\d+)\}/g;
        result = result.replace(sourcePlaceholderRegex, (match, index) => {
            const sectionIndex = parseInt(index);
            if (sectionIndex < allSections.length) {
                return this.formatSectionForPrompt(allSections[sectionIndex]);
            }
            return match;
        });
        
        if (result.includes('{code}')) {
            const codeContent = section.code ? section.code.join('\n') : '';
            result = result.replace('{code}', codeContent);
        }
        
        if (result.includes('{other}')) {
            const otherContent = section.other ? section.other.join('\n') : '';
            result = result.replace('{other}', otherContent);
        }
        
        if (result.includes('{section}')) {
            const sectionContent = this.formatSectionForPrompt(section);
            result = result.replace('{section}', sectionContent);
        }
        
        const sectionPlaceholderRegex = /\{sections\.(\d+)\}/g;
        result = result.replace(sectionPlaceholderRegex, (match, index) => {
            const sectionIndex = parseInt(index);
            if (sectionIndex < allSections.length) {
                return this.formatSectionForPrompt(allSections[sectionIndex]);
            }
            return match;
        });
        
        return result;
    }
}
