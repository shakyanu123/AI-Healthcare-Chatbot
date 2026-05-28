from flask import Flask, render_template, jsonify, request
from src.helper import download_hugging_face_embeddings
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from src.prompt import *
import os
import re
from typing import List

app = Flask(__name__)

load_dotenv()

PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
os.environ["GROQ_API_KEY"] = GROQ_API_KEY

embeddings = download_hugging_face_embeddings()

index_name = "healthbot"

docsearch = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)

retriever = docsearch.as_retriever(
    search_type="mmr",  # mmr = Maximal Marginal Relevance
    search_kwargs={"k": 3, "fetch_k": 10, "lambda_mult": 0.5}
)

llm = ChatGroq(
    model="llama-3.3-70b-versatile",  # Fast and free model
    temperature=0.4,
    max_tokens=500,
    api_key=GROQ_API_KEY
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}")
])

rag_chain = (
    {"context": retriever, "input": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)


SECTION_ORDER: List[str] = [
    "Definition",
    "Symptoms",
    "Prevention",
    "Medical Suggestions",
]


def detect_requested_sections(message: str) -> List[str]:
    """Return the sections explicitly requested in the user message."""
    lowered = message.lower()
    requested = []
    keywords = {
        "definition": "Definition",
        "symptom": "Symptoms",
        "prevention": "Prevention",
        "medical suggestion": "Medical Suggestions",
        "suggestion": "Medical Suggestions",
    }

    for keyword, section in keywords.items():
        if keyword in lowered and section not in requested:
            requested.append(section)
    return requested


def format_response(text: str, requested_sections: List[str]) -> str:
    """
    Normalize output so only populated sections are returned.
    If the user requests specific sections, limit to those.
    """
    extracted = {}
    for title in SECTION_ORDER:
        pattern = rf"\*\*{title}\*\*\s*(.*?)(?=\n\*\*|$)"
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        content = match.group(1).strip() if match else ""
        if content:
            extracted[title] = content

    if requested_sections:
        ordered_sections = [s for s in SECTION_ORDER if s in requested_sections]
    else:
        ordered_sections = SECTION_ORDER

    parts = [
        f"**{title}**\n{extracted[title].strip()}\n"
        for title in ordered_sections
        if title in extracted
    ]

    return "\n".join(parts).strip() + ("\n" if parts else "")


@app.route("/")
def index():
    return render_template('index.html')


@app.route("/get", methods=["GET", "POST"])
def chat():
    try:
        msg = request.form["msg"]
        print(f"Input: {msg}")
        
        # Fixed: response is a string, not a dictionary
        response = rag_chain.invoke(msg)
        print(f"Response: {response}")
        
        requested_sections = detect_requested_sections(msg)
        formatted_response = format_response(str(response), requested_sections)
        return formatted_response
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return f"Error: {str(e)}", 500


if __name__ == '__main__':
    # Use port 8080 as shown in your terminal
    app.run(host="0.0.0.0", port=8080, debug=True)