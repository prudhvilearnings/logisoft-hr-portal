from transformers import pipeline
from retriever import get_context

generator = pipeline(
    "text2text-generation",
    model="google/flan-t5-base"
)

print("Multi-Website RAG Chatbot Ready")
print("Type exit to quit")

while True:

    question = input("\nQuestion: ")

    if question.lower() in [
        "exit",
        "quit"
    ]:
        break

    context, sources = get_context(
        question
    )

    prompt = f"""
Context:
{context}

Question:
{question}

Answer:
"""

    result = generator(
        prompt,
        max_new_tokens=200
    )

    answer = result[0]["generated_text"]

    print("\nAnswer:")
    print(answer)

    print("\nSources:")
    for source in sources:
        print("-", source)