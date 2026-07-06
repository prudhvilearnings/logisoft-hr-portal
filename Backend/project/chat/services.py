from .models import ChatSession, ChatMessage
from django.core.exceptions import PermissionDenied
import os
import google.generativeai as genai
from accounts.models import Task
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores.faiss import FAISS

COMPANIES = {
    "logisoft": "logisofttechinc_com",
    "chefgaa": "go_chefgaa_com",
    "eventbookingplus": "eventbookingplus_com",
    "ntrustly": "ntrustly_com",
}

# Resolve paths dynamically (4 levels up from Backend/project/chat/services.py)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
VECTOR_STORE_DIR = os.path.join(BASE_DIR, "AI-Intergration-chatbot", "vector_store")

_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-mpnet-base-v2"
        )
    return _embeddings

def get_company_rag_response(company_key: str, question: str, api_key: str) -> str:
    try:
        company_folder = COMPANIES[company_key]
        embeddings = get_embeddings()
        db_path = os.path.join(VECTOR_STORE_DIR, company_folder)
        
        # Load local FAISS database
        db = FAISS.load_local(
            db_path,
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        docs = db.similarity_search(question, k=5)
        if not docs:
            return "I could not find that information on the website."
            
        context = "\n\n".join(d.page_content for d in docs)
        
        prompt = f"""You are an AI assistant answering questions about company websites.

Use ONLY the provided context.

Rules:
- Give a direct answer.
- Maximum 120 words.
- Remove repeated information.
- Ignore: menus, navigation, privacy policy, footer, cookies, legal text.
- If the answer is not available, say: "I could not find that information on the website."

Context:
{context}

Question:
{question}

Answer:"""

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content(prompt)
        
        shown = set()
        sources = []
        for doc in docs:
            url = doc.metadata.get("url", "")
            if url and url not in shown:
                sources.append(url)
                shown.add(url)
                
        answer_text = response.text.strip()
        if sources:
            sources_str = "\n\n**Sources:**\n" + "\n".join([f"- {s}" for s in sources])
            answer_text += sources_str
            
        return answer_text
    except Exception as e:
        return f"Error running website RAG search: {str(e)}"

def get_mock_ai_response(user_message: str, user) -> str:
    """
    Calls the Google Gemini API with system instructions and user database context.
    """
    # Robust dynamic key loader to handle environments and live edits
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Fallback 1: Parse .env dynamically (no server restart required)
    if not api_key:
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    for line in f:
                        if line.strip().startswith("GEMINI_API_KEY="):
                            api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                            break
        except Exception:
            pass

    # Fallback 2: Load directly from api_key.txt in the workspace root folder
    if not api_key:
        try:
            # Go up to the Logisoft-Chatbot directory
            workspace_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            possible_paths = [
                os.path.join(workspace_dir, "api_key.txt"),
                os.path.join(workspace_dir, "logisoft-hr-portal", "api_key.txt"),
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    with open(p, "r") as f:
                        val = f.read().strip().strip('"').strip("'")
                        if val:
                            api_key = val
                            break
        except Exception:
            pass

    # STRICT RULE: Immediately block out-of-subject queries locally to save API costs & enforce scope
    lower_msg = user_message.lower()
    hr_keywords = ["task", "assign", "team", "member", "role", "profile", "user", "manager", "lead", "employee", "hello", "hi", "help", "what is my", "who is", "work", "status"]
    
    # Detect if it's a company RAG query
    detected_company = None
    for key in COMPANIES:
        if key in lower_msg:
            detected_company = key
            break

    is_related = any(kw in lower_msg for kw in hr_keywords) or (detected_company is not None)
    
    if not is_related:
        return "I am only programmed to assist with Logisoft-HR portal topics and database details. Please ask a question related to your tasks or portal context."

    # If it is a company RAG query, bypass HR logic and run RAG search
    if detected_company:
        if not api_key:
            return "Gemini API Key is missing. Please configure GEMINI_API_KEY to run website RAG searches."
        return get_company_rag_response(detected_company, user_message, api_key)

    if not api_key:
        # If API key is missing but it's an HR query, provide fallback
        tasks = Task.objects.filter(assignee=user)
        task_list_str = "\n".join([f"- {t.title} (Status: {t.status})" for t in tasks]) if tasks.exists() else "None"
        team_name = user.team.name if user.team else "Unassigned"
        return (
            f"🤖 **[Offline Fallback Mode]**\n\n"
            f"Hello {user.username}! I am currently running in offline fallback mode because the configured API key has exceeded its quota or is not linked to a billing account.\n\n"
            f"**Your Profile Details:**\n"
            f"- Role: `{user.role}`\n"
            f"- Assigned Team: `{team_name}`\n"
            f"- Active Database Tasks:\n{task_list_str}\n\n"
            f"Once you link a billing account or update your API key in the `.env` file, live AI responses will automatically resume!"
        )

    # 1. Fetch relevant database context to inject into prompt
    tasks = Task.objects.filter(assignee=user)
    task_list_str = "\n".join([f"- {t.title} (Status: {t.status})" for t in tasks]) if tasks.exists() else "None"
    
    team_name = user.team.name if user.team else "Unassigned"
    
    # 2. Build system instructions
    system_instruction = (
        f"You are the Logisoft-HR AI assistant. You help employees and managers navigate tasks and details.\n"
        f"Currently conversing with user: {user.username} (Role: {user.role})\n"
        f"User Team: {team_name}\n"
        f"Assigned Tasks:\n{task_list_str}\n\n"
        f"Instructions:\n"
        f"- Be helpful, concise, and professional.\n"
        f"- If the user asks about their tasks, refer to the Assigned Tasks list provided above.\n"
        f"- Do not disclose data about other teams unless the user role is MANAGER.\n"
        f"- STRICT RULE: You must ONLY answer questions directly related to the Logisoft-HR portal, your tasks, your team, or company HR workflows.\n"
        f"- If the user asks anything out of the subject (for example: general knowledge, recipes, coding help, sports, current affairs, etc.), you must politely refuse by responding: 'I am only programmed to assist with Logisoft-HR portal topics and database details. Please ask a question related to your tasks or portal context.'"
    )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-flash-latest",
            system_instruction=system_instruction
        )
        response = model.generate_content(user_message)
        return response.text
    except Exception as e:
        # Graceful Local Fallback when API Quota is Exceeded
        is_quota_error = "429" in str(e) or "quota" in str(e).lower()
        fallback_msg = (
            f"🤖 **[Offline Fallback Mode]**\n\n"
            f"Hello {user.username}! I am currently running in offline fallback mode because the configured API key has exceeded its quota or is not linked to a billing account.\n\n"
            f"**Your Profile Details:**\n"
            f"- Role: `{user.role}`\n"
            f"- Assigned Team: `{team_name}`\n"
            f"- Active Database Tasks:\n{task_list_str}\n\n"
            f"Once you link a billing account or update your API key in the `.env` file, live AI responses will automatically resume!"
        )
        if is_quota_error:
            return fallback_msg
        return f"Error generating response from Gemini: {str(e)}"


def create_or_get_session(user, session_id=None, title=None) -> ChatSession:
    """
    Fetches an existing session owned by the user, or creates a new one.
    """
    if session_id:
        try:
            session = ChatSession.objects.get(id=session_id)
            # Ensure the user owns this session to append messages
            if session.user != user:
                raise PermissionDenied("You do not have access to this chat session.")
            return session
        except ChatSession.DoesNotExist:
            raise ValueError("Session with this ID does not exist.")
    
    # Create new session
    session_title = title if title else "Chat Session with AI"
    session = ChatSession.objects.create(user=user, title=session_title)
    return session


def save_message(session, sender, content) -> ChatMessage:
    """
    Saves a message to the database for the given session.
    """
    return ChatMessage.objects.create(
        session=session,
        sender=sender,
        content=content
    )
