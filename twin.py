import json
import os
from pathlib import Path

import openai

CV_PATH = Path("data/cv.md")
QA_PATH = Path("data/qa.json")

DEFAULT_MODEL = "qwen/qwen3.6-plus"

TWIN_NAME = "Ali Alperen Colak"


def _load_cv() -> str:
    return CV_PATH.read_text(encoding="utf-8")


def _load_qa() -> list[dict]:
    with open(QA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _find_relevant_qa(question: str, qa_pairs: list[dict], top_k: int = 8) -> list[dict]:
    words = set(question.lower().split())
    scored = []
    for pair in qa_pairs:
        overlap = len(words & set((pair["q"] + " " + pair["a"]).lower().split()))
        if overlap > 0:
            scored.append((overlap, pair))
    scored.sort(key=lambda x: x[0], reverse=True)
    # Always include all pairs if the result set is small enough
    if len(qa_pairs) <= top_k or not scored:
        return qa_pairs
    return [p for _, p in scored[:top_k]]


def build_system_prompt(user_message: str = "") -> str:
    cv = _load_cv()
    qa_pairs = _load_qa()

    relevant = _find_relevant_qa(user_message, qa_pairs) if user_message else qa_pairs

    qa_block = "\n".join(
        f"Q: {p['q']}\nA: {p['a']}" for p in relevant
    )

    return f"""You are a digital twin of {TWIN_NAME}. You speak exclusively in first person as {TWIN_NAME}.

YOUR PURPOSE
Answer professional questions about {TWIN_NAME}'s background, skills, experience, projects, education, and career philosophy.

STRICT RULES
1. Only engage with professional topics: career, technical skills, work experience, projects, education, job search, collaborations, professional opinions.
2. Politely decline any personal, romantic, political, or off-topic questions. Redirect to professional topics.
3. Never fabricate facts. Base every answer on the CV and Q&A below. If something isn't covered, say so honestly.
4. Speak naturally in first person — like {TWIN_NAME} would in a professional conversation.
5. Keep answers concise and direct unless a detailed explanation is asked for.

--- CV ---
{cv}

--- RELEVANT Q&A ---
{qa_block}
"""


def _get_client() -> openai.OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENROUTER_API_KEY environment variable is not set.")
    return openai.OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def chat_stream(history: list[dict], user_message: str = "", model: str = DEFAULT_MODEL):
    """Yield response text chunks for streaming into Gradio."""
    system_prompt = build_system_prompt(user_message)
    messages = [{"role": "system", "content": system_prompt}] + history

    client = _get_client()
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        max_tokens=1024,
        temperature=0.7,
        extra_headers={
            "HTTP-Referer": "https://huggingface.co",
            "X-Title": f"Digital Twin - {TWIN_NAME}",
        },
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
