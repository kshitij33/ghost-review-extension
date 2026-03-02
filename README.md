> 🌐 **Website**: [ghost-review-kappa.vercel.app](https://ghost-review-kappa.vercel.app/)

# GhostReview

> AI code review that sounds like a senior engineer, not a linter.

GhostReview reviews your git diff before your senior does. Pick a reviewer persona and get feedback that actually stings — not style suggestions.

## Features

- **💀 Brutal Architect** — tears apart your architectural decisions
- **⚡ Startup Velocity** — separates blockers from bikeshedding
- **🔒 Security Paranoid** — finds vulnerabilities before your users do

Reviews are streamed in real time, directly in your sidebar.

## Setup

1. Install the extension
2. Get a free Groq API key at [console.groq.com](https://console.groq.com)
3. Open VSCode Settings (`Ctrl+,`) and search **ghostreview**
4. Paste your Groq API key
5. Open a git repository, make some changes, and click **Review My Changes →**

## Usage

1. Open the GhostReview sidebar (👻 icon in the activity bar)
2. Select a reviewer persona
3. Choose diff scope (uncommitted changes or branch vs main)
4. Choose file scope (all files or current file)
5. Click **Review My Changes →**

The review streams in as it is generated. When complete, use the **Copy** button to grab the full review text.

## Requirements

- A git repository with uncommitted changes or commits ahead of main/master
- A free Groq API key ([console.groq.com](https://console.groq.com))

## Extension Settings

| Setting | Description | Default |
|---|---|---|
| `ghostreview.groqApiKey` | Your Groq API key | `""` |
| `ghostreview.defaultPersona` | Default reviewer persona | `brutal` |

## Release Notes

### 0.1.0

Initial release. Three reviewer personas, real-time streaming, git diff integration.
