# Requirer

A zero-dependency browser tool that processes Markdown documents section-by-section through any OpenAI-compatible LLM and extracts structured requirements.

## How it works

1. Load a Markdown file — each `#` heading becomes a section shown in a table row.
2. Configure an LLM endpoint and write a prompt using placeholders.
3. Click **Rerun** (single section) or **Run this and below** to send each section's text to the LLM.
4. The LLM response is parsed: lines starting with `+` go to the **Code** column, lines starting with `-` go to the **Other** column.
5. Export the result as JSON or Markdown.

No build step. No server-side code. Runs entirely in the browser from a static file server.

## Quick start

```sh
python3 -m http.server 3000
```

Open `http://localhost:3000` in your browser.

## Configuration

Edit `config.json` before starting the server:

```json
{
  "api": {
    "url": "http://localhost:11434/v1",
    "model": "qwen3:30b"
  },
  "concurrency": 1,
  "parameters": {
    "max_tokens": 30000,
    "temperature": 0.1,
    "top_p": 0.7,
    "frequency_penalty": 2.0,
    "stop": ["== END =="]
  },
  "prompts": [
    { "name": "My prompt", "content": "Analyze: {source}" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `api.url` | Base URL of any OpenAI-compatible API (Ollama, LM Studio, OpenAI, etc.) |
| `api.model` | Default model name; overridable from the UI |
| `concurrency` | How many sections to process in parallel (default `1` = sequential) |
| `parameters` | Any extra fields forwarded to the `/completions` endpoint (temperature, stops, etc.) |
| `prompts` | Named prompt templates selectable from the UI |

**API key** is never stored in `config.json`. Enter it in the UI once — it persists in browser `localStorage`.

## Prompt placeholders

| Placeholder | Expands to |
|------------|------------|
| `{source}` | The current section's full text |
| `{code}` | The current section's previously extracted code requirements |
| `{other}` | The current section's previously extracted other requirements |
| `{sources.N}` | Full text of section N (0-indexed) — useful for passing a glossary |
| `{sections.N}` | Alias for `{sources.N}` |

## LLM response format

The LLM should output one requirement per line, prefixed with `+` or `-`:

```
+ The system must validate user input on the server side
+ The API must return HTTP 400 for malformed requests
- All endpoints must be documented in the API specification
- The team must conduct a security review before release
```

Lines not starting with `+` or `-` are ignored.

## Markdown format

Any Markdown file works. Each `#`-level heading (any depth) starts a new section. Tables are parsed and rendered inline. Content before the first heading is grouped as an untitled section.

```markdown
# Section title

Paragraph text becomes the source content sent to the LLM.

| Column A | Column B |
|----------|----------|
| value    | value    |

Multiple paragraphs are supported.
```

## UI controls

| Control | Action |
|---------|--------|
| **Rerun** | Send this section to the LLM and update its row |
| **Run this and below** | Process this section and all sections below it |
| **Collapse / Expand All** | Toggle visibility of source content in all rows |
| **Download JSON** | Export all sections with extracted requirements as JSON |
| **Download MD** | Export sections back to Markdown (without requirements) |
| **Upload MD** | Replace the current document with a new Markdown file |
| **Upload JSON** | Merge code/other columns from a JSON file (sources must match) |

## JSON output format

```json
[
  {
    "title": "Section title",
    "source": ["paragraph text", [{"Col A": "val", "Col B": "val"}]],
    "code": ["The system must ...", "The API must ..."],
    "other": ["The team must ..."]
  }
]
```

`source` items are either strings (paragraphs) or arrays of objects (tables).

## Development

Run the test suite (requires Node.js):

```sh
npm test        # Playwright end-to-end tests
npm run lint    # ESLint
```

Tests start their own HTTP server on port 3001 automatically.

The JSONPath utility (`jsonpath.py`) filters exported JSON files from the command line:

```sh
python3 -m venv venv && venv/bin/pip install jsonpath-ng
python3 jsonpath.py '$[*].code[*]' requirer.json
```

## License

MIT
