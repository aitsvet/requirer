/* exported APIClient */
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

}
