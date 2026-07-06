import re
import shutil

from pathlib import Path
from collections import Counter

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import (
    HuggingFaceEmbeddings
)
from langchain_community.vectorstores import (
    FAISS
)

DATA = "data"
VECTOR = "vector_store"

if Path(VECTOR).exists():
    shutil.rmtree(VECTOR)

documents = []

for file in Path(DATA).glob(
    "*.md"
):

    text = file.read_text(
        encoding="utf-8"
    )

    pages = re.split(
        r"={20,}",
        text
    )

    for page in pages:

        page = page.strip()

        if len(page) < 300:
            continue

        url_match = re.search(
            r"URL:\s*(.*)",
            page
        )

        title_match = re.search(
            r"TITLE:\s*(.*)",
            page
        )

        url = (
            url_match.group(1)
            if url_match
            else ""
        )

        title = (
            title_match.group(1)
            if title_match
            else ""
        )

        page = re.sub(
            r"URL:.*",
            "",
            page
        )

        page = re.sub(
            r"TITLE:.*",
            "",
            page
        )

        page = page.strip()

        documents.append(
            Document(
                page_content=page,
                metadata={
                    "company":
                        file.stem,
                    "source":
                        file.name,
                    "url":
                        url,
                    "title":
                        title
                }
            )
        )

print(
    f"Pages Loaded: "
    f"{len(documents)}"
)

splitter = (
    RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=150,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
            ""
        ]
    )
)

chunks = (
    splitter
    .split_documents(
        documents
    )
)

print(
    f"Chunks: "
    f"{len(chunks)}"
)

counter = Counter()

for c in chunks:
    counter[
        c.metadata[
            "company"
        ]
    ] += 1

print(
    "\nChunks Per Company"
)

for k, v in counter.items():
    print(
        k,
        "->",
        v
    )

embedding = (
    HuggingFaceEmbeddings(
        model_name=
        "sentence-transformers/all-mpnet-base-v2"
    )
)

Path(VECTOR).mkdir(
    exist_ok=True
)

companies = set(
    c.metadata[
        "company"
    ]
    for c in chunks
)

for company in companies:

    docs = [
        c
        for c in chunks
        if c.metadata[
            "company"
        ]
        == company
    ]

    db = (
        FAISS
        .from_documents(
            docs,
            embedding
        )
    )

    db.save_local(
        f"{VECTOR}/{company}"
    )

print(
    "\nVector stores created."
)