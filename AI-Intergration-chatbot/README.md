# AI Integration Chatbot

A Retrieval-Augmented Generation (RAG) chatbot developed for the Logisoft HR Portal. The chatbot extracts information from multiple company websites, creates a searchable knowledge base, and answers user questions using semantic search and a Large Language Model (LLM).

---

# Features

- Multi-website knowledge base
- Automatic website crawling
- Markdown document generation
- Intelligent document chunking
- FAISS vector database
- HuggingFace embeddings
- Company-specific retrieval
- LLM-powered answer generation
- Source URL references
- Easy integration with Django backend
- Scalable architecture

---

# Project Structure

```
AI-Intergration-chatbot/
│
├── scraper.py
├── ingest.py
├── retriever.py
├── requirements.txt
├── README.md
├── .env.example
│
├── data/
│
├── vector_store/
│
└── logs/
```

---

# Technology Stack

## Language

- Python 3.11+

## Libraries

- LangChain
- FAISS
- Sentence Transformers
- HuggingFace Embeddings
- BeautifulSoup
- Requests
- Playwright
- Google Gemini API
- Python Dotenv

---

# Workflow

```
Website URLs
      │
      ▼
Website Scraper
      │
      ▼
Markdown Files
      │
      ▼
Document Cleaning
      │
      ▼
Chunking
      │
      ▼
Embeddings
      │
      ▼
FAISS Vector Database
      │
      ▼
Retriever
      │
      ▼
Gemini LLM
      │
      ▼
Final Answer
```

---

# Supported Websites

- Logisoft Technologies
- Chefgaa
- Ntrustly
- EventBookingPlus

Each website has its own vector database to improve retrieval accuracy.

---

# Installation

Clone the repository

```bash
git clone https://github.com/prudhvilearnings/logisoft-hr-portal.git
```

Navigate to the chatbot folder

```bash
cd AI-Intergration-chatbot
```

Create a virtual environment

Windows

```bash
python -m venv venv
```

Activate

```bash
venv\Scripts\activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

---

# Environment Variables

Create a `.env` file.

```
GEMINI_API_KEY=YOUR_API_KEY
```

---

# Generate Markdown Files

Run

```bash
python scraper.py
```

Output

```
data/

logisofttechinc_com.md

go_chefgaa_com.md

ntrustly_com.md

eventbookingplus_com.md
```

---

# Build Vector Database

Run

```bash
python ingest.py
```

Output

```
vector_store/

logisofttechinc_com/

go_chefgaa_com/

ntrustly_com/

eventbookingplus_com/
```

---

# Run Chatbot

```bash
python retriever.py
```

Example

```
Question:
What is Chefgaa?

Answer:
Chefgaa is a restaurant management platform that helps restaurants streamline operations through online ordering, POS integration, catering management, customized websites, payment processing, and customer engagement tools.
```

---

# Architecture

```
                  User Question
                        │
                        ▼
               Company Detection
                        │
                        ▼
          Load Company Vector Store
                        │
                        ▼
           Semantic Similarity Search
                        │
                        ▼
             Retrieve Top K Chunks
                        │
                        ▼
                Gemini LLM Prompt
                        │
                        ▼
                 Generated Answer
                        │
                        ▼
                Display Source URLs
```

---

# Retrieval Pipeline

1. Detect company name from the question.
2. Load the corresponding FAISS vector database.
3. Retrieve the most relevant document chunks.
4. Send retrieved context to the Gemini LLM.
5. Generate a concise answer.
6. Display source page URLs.

---

# Folder Description

| Folder | Description |
|----------|-------------|
| data | Scraped markdown files |
| vector_store | FAISS vector databases |
| logs | Execution logs |
| scraper.py | Website crawler |
| ingest.py | Creates embeddings and vector databases |
| retriever.py | Retrieves answers from the vector database |

---

# Dependencies

```
requests
beautifulsoup4
lxml
playwright

langchain
langchain-community
langchain-core
langchain-huggingface
langchain-text-splitters

sentence-transformers
faiss-cpu

google-generativeai

python-dotenv
```

Install

```bash
pip install -r requirements.txt
```

---

# Future Improvements

- Django REST API integration
- React chatbot interface
- Conversation memory
- Streaming responses
- Hybrid keyword + vector search
- PDF knowledge base support
- Database-backed document storage
- Admin dashboard
- Automatic website re-indexing
- User authentication
- Feedback and rating system

---

# Author

**Kuntala Sai Akhil Teja**

AI Integration Chatbot

Retrieval-Augmented Generation (RAG)

Python | LangChain | FAISS | HuggingFace | Gemini | Playwright

---

# License

This project is developed for the **Logisoft HR Portal** and is intended for internal use unless otherwise specified.