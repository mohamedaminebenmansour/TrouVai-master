from flask import Blueprint, request, jsonify, current_app
from services.search_service import hybrid_search
from utils.message_filter import analyze_message
from extensions import db
from models.history_model import History, Conversation
import re
import json
from datetime import datetime, timedelta

chat_bp = Blueprint("chat", __name__)

def format_answer_for_readability(text):
    text = text.replace("\\n", "\n").replace("\r", "").strip()
    text = re.sub(r"(Je comprends mieux.*?exemples :) *\n*", r"\1\n\n", text, flags=re.IGNORECASE)
    lines = text.splitlines()
    numbered = []
    count = 1
    for line in lines:
        line = line.strip()
        if line.startswith("*"):
            content = line.lstrip("*").strip()
            numbered.append(f"{count}. {content}")
            count += 1
        else:
            numbered.append(line)
    text = "\n".join(numbered)
    text = re.sub(
        r"^Je comprends mieux.*?Voici quelques-uns des exemples :",
        "📊 **Taux de chômage les plus bas dans certains pays :**",
        text,
        flags=re.IGNORECASE
    )
    return text.strip()

@chat_bp.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Requête JSON manquante"}), 400

        query = data.get("query", "").strip()
        user_id = data.get("user_id")
        messages = data.get("messages", [])

        if not query:
            return jsonify({"error": "Le champ 'query' est requis"}), 400
        if not user_id or not isinstance(user_id, int):
            return jsonify({"error": "Le champ 'user_id' est requis et doit être un entier"}), 400

        current_app.logger.info(f"[Chat] Query: {query} | User ID: {user_id}")

        # Analyze the message
        try:
            analysis = analyze_message(query)
            greeting = analysis.get("greeting")
            is_technical = analysis.get("is_technical")
        except Exception as e:
            current_app.logger.error(f"Error in analyze_message: {str(e)}", exc_info=True)
            return jsonify({"error": "Erreur lors de l'analyse du message."}), 500

        
            # Technical processing via LLM + Web
        try:
            result = hybrid_search(query=query, user_id=user_id)
            formatted_answer = format_answer_for_readability(result["answer"])
            if greeting:
                formatted_answer = f"{greeting} ! 😊\n\n{formatted_answer}"
            response = {
                "answer": formatted_answer,
                "sources": result.get("sources", [])
                }
        except Exception as e:
            current_app.logger.error(f"Error in hybrid_search: {str(e)}", exc_info=True)
            return jsonify({"error": "Erreur dans la recherche hybride."}), 500

        # Update messages array
        messages.append({"role": "user", "content": query})
        messages.append({"role": "assistant", "content": response["answer"]})

        # Check if this is a new chat session
        try:
            latest_history = db.session.query(History).filter_by(user_id=user_id).order_by(History.created_at.desc()).first()
            is_new_chat = (
                not latest_history or
                datetime.utcnow() - latest_history.created_at > timedelta(minutes=5)
            )

            if is_new_chat:
                # Create new History and Conversation for the first query
                new_history = History(user_id=user_id, search_query=query)
                db.session.add(new_history)
                db.session.flush()  # Ensure history_id is available
                new_conversation = Conversation(
                    history_id=new_history.id,
                    messages=json.dumps(messages),
                    sources=json.dumps(response["sources"])
                )
                db.session.add(new_conversation)
            else:
                # Update existing Conversation with the latest messages and sources
                conversation = db.session.query(Conversation).filter_by(history_id=latest_history.id).first()
                if conversation:
                    existing_messages = json.loads(conversation.messages)
                    existing_sources = json.loads(conversation.sources) if conversation.sources else []
                    existing_messages.extend(messages)
                    conversation.messages = json.dumps(existing_messages)
                    conversation.sources = json.dumps(list(set(existing_sources + response["sources"])))  # Avoid duplicates
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Database error: {str(e)}", exc_info=True)
            return jsonify({"error": "Erreur lors de la gestion de l'historique ou de la conversation."}), 500

        return jsonify(response), 200

    except Exception as e:
        current_app.logger.error(f"Erreur dans /chat : {str(e)}", exc_info=True)
        return jsonify({"error": "Une erreur interne est survenue."}), 500