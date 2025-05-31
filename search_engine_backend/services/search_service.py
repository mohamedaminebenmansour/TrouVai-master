from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from .web_scraper import scrape_web
from .llm_answer import generate_answer_with_llm
from utils.message_filter import analyze_message

model = SentenceTransformer("all-MiniLM-L6-v2")
chat_memory = {}

def hybrid_search(query, user_id=None, top_k=5):
    analysis = analyze_message(query)

    response_prefix = ""
    if analysis["has_greeting"]:
        response_prefix += "Salut ! "
    if analysis["has_thanks"]:
        response_prefix += "Merci à toi ! "

    # Si pas de contenu technique, juste salutation/remarque
    if not analysis["is_technical"]:
        if response_prefix:
            return {"answer": response_prefix + "Comment puis-je t'aider ? 😊", "sources": []}
        else:
            return {"answer": "Je suis là pour t'aider ! Pose-moi ta question 😊", "sources": []}

    # Sinon, lancer recherche intelligente
    web_results = scrape_web(query)

    if not web_results:
        history = chat_memory.get(user_id, []) if user_id else []
        answer = generate_answer_with_llm([], query, history=history)
        return {
            "answer": response_prefix + answer,
            "sources": []
        }

    texts = [doc["text"] for doc in web_results]
    query_embedding = model.encode([query])
    doc_embeddings = model.encode(texts)
    similarities = cosine_similarity(query_embedding, doc_embeddings)[0]

    for i, doc in enumerate(web_results):
        doc["score"] = float(similarities[i])
        doc["source"] = "web"

    sorted_docs = sorted(web_results, key=lambda x: x["score"], reverse=True)[:top_k]
    history = chat_memory.get(user_id, []) if user_id else []
    answer = generate_answer_with_llm(sorted_docs, query, history=history)

    if user_id:
        chat_memory.setdefault(user_id, []).append({
            "user": query,
            "bot": answer
        })

    sources = []
    for doc in sorted_docs:
        url = doc.get("url")
        if url and url not in sources:
            sources.append(url)
        if len(sources) >= 4:
            break

    return {
        "answer": response_prefix + answer,
        "sources": sources
    }
