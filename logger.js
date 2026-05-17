/* exported Logger */
/* global createTextContent, extractLLMText */
class Logger {
    constructor() {
        this.logs = [];
    }

    logRequest(requestData, sectionIndex = null) {
        const promptTokenCount = Math.ceil(requestData.prompt.length / 4);

        const logEntry = {
            type: 'request',
            timestamp: new Date().toISOString(),
            sectionIndex: sectionIndex,
            data: {
                url: requestData.url,
                model: requestData.model,
                prompt: requestData.prompt,
                promptTokens: promptTokenCount,
                parameters: this.extractParameters(requestData)
            }
        };
        this.logs.push(logEntry);
        this.displayLog(logEntry);
    }

    extractParameters(requestData) {
        const parameters = {};
        const excludeKeys = ['url', 'model', 'prompt'];

        for (const [key, value] of Object.entries(requestData)) {
            if (!excludeKeys.includes(key)) {
                parameters[key] = value;
            }
        }

        return parameters;
    }

    logResponse(responseData, sectionIndex = null, duration = null) {
        const content = extractLLMText(responseData);

        const logEntry = {
            type: 'response',
            timestamp: new Date().toISOString(),
            sectionIndex: sectionIndex,
            duration: duration,
            data: {
                content: content,
                usage: responseData.usage,
                model: responseData.model
            }
        };
        this.logs.push(logEntry);
        this.displayLog(logEntry);
    }

    logError(error, sectionIndex = null) {
        const logEntry = {
            type: 'error',
            timestamp: new Date().toISOString(),
            sectionIndex: sectionIndex,
            data: {
                message: error.message,
                stack: error.stack
            }
        };
        this.logs.push(logEntry);
        this.displayLog(logEntry);
    }

    formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = ((ms % 60000) / 1000).toFixed(1);
            return `${minutes}m ${seconds}s`;
        }
    }

    displayLog(logEntry) {
        const logsOutput = document.getElementById('logs-output');
        if (!logsOutput) return;

        const logElement = document.createElement('div');
        logElement.className = `log-entry ${logEntry.type}`;

        const timestamp = new Date(logEntry.timestamp).toLocaleString();
        const sectionInfo = logEntry.sectionIndex !== null ? ` (Section ${logEntry.sectionIndex + 1})` : '';
        const durationInfo = logEntry.duration ? ` (${this.formatDuration(logEntry.duration)})` : '';

        let content = '';
        let meta = '';

        if (logEntry.type === 'request') {
            content = `REQUEST${sectionInfo}:\n${logEntry.data.prompt}`;
            const paramsStr = Object.entries(logEntry.data.parameters)
                .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                .join(' | ');
            meta = `model: ${logEntry.data.model} | prompt tokens: ${logEntry.data.promptTokens} | ${paramsStr}`;
        } else if (logEntry.type === 'response') {
            content = `RESPONSE${sectionInfo}:\n${logEntry.data.content}`;
            meta = `Model: ${logEntry.data.model} | Tokens: ${logEntry.data.usage?.total_tokens || 'N/A'}${durationInfo}`;
        } else if (logEntry.type === 'error') {
            content = `ERROR${sectionInfo}:\n${logEntry.data.message}`;
            meta = `Stack: ${logEntry.data.stack}`;
        }

        const tsDiv = document.createElement('div');
        tsDiv.className = 'log-timestamp';
        tsDiv.textContent = timestamp;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'log-content';
        createTextContent(contentDiv, content);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'log-meta';
        createTextContent(metaDiv, meta);

        logElement.appendChild(tsDiv);
        logElement.appendChild(contentDiv);
        logElement.appendChild(metaDiv);

        logsOutput.appendChild(logElement);
        logsOutput.scrollTop = logsOutput.scrollHeight;
    }

    clearLogs() {
        this.logs = [];
        const logsOutput = document.getElementById('logs-output');
        if (logsOutput) {
            logsOutput.innerHTML = '';
        }
    }

    downloadLogs() {
        const logsData = {
            timestamp: new Date().toISOString(),
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `llm-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
