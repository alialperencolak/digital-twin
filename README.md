---
title: Digitaltwin
emoji: 🦀
colorFrom: blue
colorTo: yellow
sdk: gradio
sdk_version: 6.19.0
python_version: '3.13'
app_file: app.py
pinned: false
short_description: my simple digital twin
---

# Digital Twin — Ali Alperen Colak

An AI digital twin that answers **professional questions** based on a real CV and curated Q&A pairs.

## Setup (Hugging Face Spaces)

1. Fork / duplicate this Space.
2. Go to **Settings → Secrets** and add:
   - `OPENROUTER_API_KEY` — your key from [openrouter.ai](https://openrouter.ai)
3. The Space will restart and the twin will be live.

## Customize

| File | What to edit |
|------|-------------|
| `data/cv.md` | Your CV |
| `data/qa.json` | Your Q&A pairs in first-person voice |
| `twin.py` | Change `TWIN_NAME` and `DEFAULT_MODEL` at the top |
| `app.py` | Update `EXAMPLES` to match your own likely questions |

## Model

Default model: `anthropic/claude-3.5-haiku` via OpenRouter.
Change `DEFAULT_MODEL` in `twin.py` to any [OpenRouter model slug](https://openrouter.ai/models).

## Professional-only guardrail

The system prompt instructs the model to decline personal, political, or off-topic questions and redirect to professional ones. No secondary classifier — the LLM enforces it inline.
