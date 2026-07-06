import os

from dotenv import load_dotenv

import google.generativeai as genai

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores.faiss import FAISS


# ==========================================
# LOAD ENV
# ==========================================

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel(
    "gemini-flash-latest"
)

# ==========================================
# EMBEDDINGS
# ==========================================

embedding = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)

# ==========================================
# COMPANY MAP
# ==========================================

COMPANIES = {
    "logisoft": "logisofttechinc_com",
    "chefgaa": "go_chefgaa_com",
    "eventbookingplus": "eventbookingplus_com",
    "ntrustly": "ntrustly_com",
}

# ==========================================
# DETECT COMPANY
# ==========================================

def detect_company(question):

    q = question.lower()

    for key, value in COMPANIES.items():

        if key in q:
            return value

    return None


# ==========================================
# LLM ANSWER
# ==========================================

def generate_answer(question, docs):

    context = "\n\n".join(
        d.page_content
        for d in docs
    )

    prompt = f"""
You are an AI assistant answering questions about company websites.

Use ONLY the provided context.

Rules:

- Give a direct answer.
- Maximum 120 words.
- Remove repeated information.
- Ignore:
  - menus
  - navigation
  - privacy policy
  - footer
  - cookies
  - legal text
- Do NOT mention sources, URLs, references, or where the information came from.
- If the answer is not available, say:
  "I could not find that information on the website."

Context:

{context}

Question:

{question}

Answer:
"""

    response = model.generate_content(prompt)

    return response.text.strip()


# ==========================================
# CHAT LOOP
# ==========================================

print("=" * 60)
print("Multi-Website RAG Chatbot")
print("Type 'exit' to quit.")
print("=" * 60)

while True:

    question = input("\nQuestion: ")

    if question.lower() == "exit":
        break

    company = detect_company(question)

    if company is None:

        print("\nPlease mention one of these companies:")
        print("- Logisoft")
        print("- Chefgaa")
        print("- EventBookingPlus")
        print("- Ntrustly")
        continue

    db = FAISS.load_local(
        f"vector_store/{company}",
        embedding,
        allow_dangerous_deserialization=True
    )

    docs = db.similarity_search(
        question,
        k=5
    )

    if not docs:

        print("\nNo relevant information found.")
        continue

    answer = generate_answer(
        question,
        docs
    )

    print("\nAnswer:\n")
    print(answer)