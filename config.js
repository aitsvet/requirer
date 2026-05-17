/* exported escapeHtml, createTextContent, ConfigManager */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createTextContent(parent, text) {
    String(text).split('\n').forEach((part, i) => {
        if (i > 0) parent.appendChild(document.createElement('br'));
        parent.appendChild(document.createTextNode(part));
    });
}

class ConfigManager {
    constructor() {
        this.apiUrl = '';
        this.model = '';
        this.apiKey = '';
        this.promptTemplate = '';
        this.prompts = [];
        this.parameters = {};
        this.concurrency = 1;
        this.config = null;
        this.availableModels = [];
        this.modelSelect = null;
        this.promptSelect = null;
    }

    async loadConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            this.config = await response.json();
            this.apiUrl = this.config.api.url;
            this.model = this.config.api.model;
            this.apiKey = localStorage.getItem('requirer-api-key') || '';
            this.prompts = this.config.prompts || [];
            this.promptTemplate = '';
            this.parameters = this.config.parameters || {};
            this.concurrency = this.config.concurrency || 1;
            this.populateFormElements();
            return true;
        } catch (error) {
            console.error('Error loading config:', error);
            return false;
        }
    }

    populateFormElements() {
        const apiUrlInput = document.getElementById('api-url');
        const apiKeyInput = document.getElementById('api-key');
        const modelNameSelect = document.getElementById('model-name');
        const promptSelect = document.getElementById('prompt-select');
        const promptTextarea = document.getElementById('prompt-textarea');
        const parametersTextarea = document.getElementById('parameters-textarea');

        if (apiUrlInput) apiUrlInput.value = this.apiUrl;
        if (apiKeyInput) apiKeyInput.value = this.apiKey;
        if (modelNameSelect) {
            this.modelSelect = modelNameSelect;
            this.setupModelSelect();
        }
        if (promptSelect) {
            this.promptSelect = promptSelect;
            this.setupPromptSelect();
        }
        if (promptTextarea) {
            promptTextarea.value = this.promptTemplate;
            this.setTextareaHeight(promptTextarea);
        }
        if (parametersTextarea) {
            parametersTextarea.value = JSON.stringify(this.parameters, null, 2);
            this.setTextareaHeight(parametersTextarea);
        }
        this.setupEventListeners();
        if (this.apiUrl && this.apiKey) {
            this.fetchModels();
        }
    }

    setTextareaHeight(textarea) {
        const lines = textarea.value.split('\n').length + 1;
        const rows = Math.max(3, Math.min(lines, 50));
        textarea.rows = rows;
    }

    initialize() {
        if (!this.config) {
            return false;
        }

        this.apiUrl = document.getElementById('api-url').value;
        this.apiKey = document.getElementById('api-key').value;
        this.model = document.getElementById('model-name').value;

        const parametersTextarea = document.getElementById('parameters-textarea');
        if (parametersTextarea) {
            try {
                this.parameters = JSON.parse(parametersTextarea.value);
            } catch (error) {
                console.error('Error parsing parameters JSON:', error);
            }
        }

        return true;
    }

    getApiUrl() { return this.apiUrl; }
    getModel() { return this.model; }
    getApiKey() { return this.apiKey; }
    getParameters() { return this.parameters; }
    getConcurrency() { return this.concurrency; }

    setupEventListeners() {
        const apiUrlInput = document.getElementById('api-url');
        const apiKeyInput = document.getElementById('api-key');
        const promptSelect = document.getElementById('prompt-select');
        const promptTextarea = document.getElementById('prompt-textarea');

        if (apiUrlInput && apiKeyInput) {
            let fetchTimeout;
            const triggerFetch = () => {
                clearTimeout(fetchTimeout);
                fetchTimeout = setTimeout(() => this.fetchModels(), 1000);
            };

            apiUrlInput.addEventListener('input', triggerFetch);
            apiKeyInput.addEventListener('input', () => {
                localStorage.setItem('requirer-api-key', apiKeyInput.value);
                triggerFetch();
            });
        }

        if (promptSelect && promptTextarea) {
            promptSelect.addEventListener('change', (event) => {
                const selectedIndex = event.target.value;
                if (selectedIndex === '') {
                    promptTextarea.value = '';
                } else {
                    const promptIndex = parseInt(selectedIndex);
                    if (promptIndex >= 0 && promptIndex < this.prompts.length) {
                        promptTextarea.value = this.prompts[promptIndex].content;
                    }
                }
                this.setTextareaHeight(promptTextarea);
            });
        }
    }

    setupModelSelect() {
        if (!this.modelSelect) return;
        this.modelSelect.innerHTML = '<option value="">Loading models...</option>';
        if (this.model) {
            this.modelSelect.value = this.model;
        }
    }

    setupPromptSelect() {
        if (!this.promptSelect) return;
        this.promptSelect.innerHTML = '<option value="">Loading prompts...</option>';
        this.populatePromptSelect();
    }

    populatePromptSelect() {
        if (!this.promptSelect) return;
        if (!this.prompts.length) {
            this.promptSelect.innerHTML = '<option value="">No prompts available</option>';
            return;
        }

        this.promptSelect.innerHTML = '';

        const newPromptOption = document.createElement('option');
        newPromptOption.value = '';
        newPromptOption.textContent = 'New prompt template';
        this.promptSelect.appendChild(newPromptOption);

        this.prompts.forEach((prompt, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = prompt.name;
            this.promptSelect.appendChild(option);
        });

        this.promptSelect.value = '';
    }

    async fetchModels() {
        const apiUrl = document.getElementById('api-url').value;
        const apiKey = document.getElementById('api-key').value;

        if (!apiUrl || !apiKey) {
            this.modelSelect.innerHTML = '<option value="">Enter API URL and Key first</option>';
            return;
        }

        let modelsUrl;
        try {
            const url = new URL(apiUrl);
            modelsUrl = `${url.origin}/v1/models`;
        } catch (e) {
            this.modelSelect.innerHTML = `<option value="">Invalid URL: ${e.message}</option>`;
            return;
        }

        this.modelSelect.innerHTML = '<option value="">Loading models...</option>';

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.availableModels = data.data || [];

            this.populateModelSelect();
            this.validateConfigModel();

        } catch (error) {
            console.error('Error fetching models:', error);
            this.modelSelect.innerHTML = `<option value="">Error: ${error.message}</option>`;
        }
    }

    populateModelSelect() {
        if (!this.modelSelect || !this.availableModels.length) {
            this.modelSelect.innerHTML = '<option value="">No models available</option>';
            return;
        }
        this.modelSelect.innerHTML = '';
        this.availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            this.modelSelect.appendChild(option);
        });
        if (!this.modelSelect.value && this.availableModels.length > 0) {
            this.modelSelect.value = this.availableModels[0].id;
            this.model = this.availableModels[0].id;
        }
    }

    validateConfigModel() {
        if (!this.model || !this.availableModels.length) return;

        const modelExists = this.availableModels.some(model => model.id === this.model);

        if (!modelExists) {
            console.warn(`Model "${this.model}" from config.json is not available in the models list`);
            const warningDiv = document.createElement('div');
            warningDiv.className = 'warning';
            warningDiv.textContent = `Warning: Model "${this.model}" from config.json is not available. Please select a different model.`;
            const modelRow = this.modelSelect.closest('.config-row');
            if (modelRow && !modelRow.querySelector('.warning')) {
                modelRow.appendChild(warningDiv);
            }
        }
    }
}
