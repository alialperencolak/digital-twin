import gradio as gr

from twin import TWIN_NAME, chat_stream

DESCRIPTION = f"""
## Ask {TWIN_NAME} anything — professionally.

This is an AI digital twin trained on {TWIN_NAME}'s CV and personal Q&A.
Ask about skills, experience, projects, education, or career philosophy.
Personal or off-topic questions will be politely declined.
""".strip()

EXAMPLES = [
    "What is your current role and what are you working on?",
    "What technologies do you know best?",
    "Tell me about your most impactful project.",
    "Are you open to new job opportunities?",
    "How do you approach solving complex technical problems?",
]


def respond(message: str, history: list[list[str]]):
    openai_history = []
    for human, assistant in history:
        openai_history.append({"role": "user", "content": human})
        if assistant:
            openai_history.append({"role": "assistant", "content": assistant})
    openai_history.append({"role": "user", "content": message})

    partial = ""
    for chunk in chat_stream(openai_history):
        partial += chunk
        yield partial


with gr.Blocks(title=f"Digital Twin — {TWIN_NAME}", theme=gr.themes.Soft()) as demo:
    gr.Markdown(f"# Digital Twin — {TWIN_NAME}")
    gr.Markdown(DESCRIPTION)

    chatbot = gr.ChatInterface(
        fn=respond,
        examples=EXAMPLES,
        cache_examples=False,
        chatbot=gr.Chatbot(height=480, show_label=False),
        textbox=gr.Textbox(
            placeholder="Ask a professional question…",
            container=False,
            scale=7,
        ),
        submit_btn="Send",
        retry_btn=None,
        undo_btn=None,
        clear_btn="Clear chat",
    )

    gr.Markdown(
        "_Powered by [OpenRouter](https://openrouter.ai) · "
        "Responses are AI-generated based on provided CV data._"
    )

if __name__ == "__main__":
    demo.launch()
