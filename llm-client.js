class APIClient {
    constructor(configManager) {
        this.configManager = configManager;
    }

    async makeRequest(prompt, parameters) {
        const requestData = {
            model: this.configManager.getModel(),
            prompt: prompt,
            ...parameters
        };
        if (parameters.max_tokens) {
            const adjustedMaxTokens = this.calculateMaxTokens(prompt);
            requestData.max_tokens = adjustedMaxTokens;
        }
        const response = await fetch(this.configManager.getApiUrl() + '/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.configManager.getApiKey()}`
            },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }

    calculateInputTokens(prompt) {
        return Math.ceil(prompt.length / 4);
    }

    calculateMaxTokens(prompt) {
        const inputTokens = this.calculateInputTokens(prompt);
        const parameters = this.configManager.getParameters();
        const maxTokens = parameters.max_tokens;
        return Math.max(1, maxTokens - inputTokens);
    }
}
