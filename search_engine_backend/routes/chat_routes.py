from flask import Blueprint, request, jsonify, current_app
from services.search_service import hybrid_search
from utils.message_filter import analyze_message
from extensions import db
from models.history_model import History, Conversation
from utils.auth_utils import token_required
import re
import json
from datetime import datetime, timedelta
from services.llm_answer import generate_answer_with_llm

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
        model = data.get("model", "llama3")

        # Check for JWT token to determine if user is authenticated
        auth_header = request.headers.get('Authorization')
        current_user = None
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                from utils.auth_utils import decode_jwt
                user_id_from_token = decode_jwt(token)
                from models.user_model import User
                current_user = User.query.filter_by(id=user_id_from_token).first()
                if not current_user:
                    current_app.logger.warning(f"Invalid token: no user found for ID {user_id_from_token}")
                    return jsonify({"error": "Token invalide"}), 401
            except Exception as e:
                current_app.logger.warning(f"Token validation failed: {str(e)}")
                # Continue as unauthenticated if token is invalid
                pass

        # Define available models based on authentication status
        allowed_models = ["llama2", "gemma", "llama3", "mistral"] if current_user else ["llama3", "mistral"]

        # Validate model
        if model not in allowed_models:
            return jsonify({"error": f"Modèle non supporté. Choisissez parmi : {', '.join(allowed_models)}"}), 400

        if not query:
            return jsonify({"error": "Le champ 'query' est requis"}), 400

        # Validate user_id only if provided and user is authenticated
        if current_user and user_id:
            if not isinstance(user_id, int) or user_id != current_user.id:
                return jsonify({"error": "Le champ 'user_id' doit être un entier et correspondre à l'utilisateur connecté"}), 400

        current_app.logger.info(f"[Chat] Query: {query} | User ID: {user_id or 'unauthenticated'} | Model: {model}")

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
            result = hybrid_search(query=query, user_id=user_id if current_user else None, model=model)
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

        # Save history and conversation only for authenticated users
        if current_user and user_id:
            try:
                latest_history = db.session.query(History).filter_by(user_id=user_id).order_by(History.created_at.desc()).first()
                is_new_chat = (
                    not latest_history or
                    datetime.utcnow() - latest_history.created_at > timedelta(minutes=5)
                )

                if is_new_chat:
                    new_history = History(user_id=user_id, search_query=query)
                    db.session.add(new_history)
                    db.session.flush()
                    new_conversation = Conversation(
                        history_id=new_history.id,
                        messages=json.dumps(messages),
                        sources=json.dumps(response["sources"])
                    )
                    db.session.add(new_conversation)
                else:
                    conversation = db.session.query(Conversation).filter_by(history_id=latest_history.id).first()
                    if conversation:
                        existing_messages = json.loads(conversation.messages)
                        existing_sources = json.loads(conversation.sources) if conversation.sources else []
                        existing_messages.extend(messages)
                        conversation.messages = json.dumps(existing_messages)
                        conversation.sources = json.dumps(list(set(existing_sources + response["sources"])))
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Database error: {str(e)}", exc_info=True)
                return jsonify({"error": "Erreur lors de la gestion de l'historique ou de la conversation."}), 500

        return jsonify(response), 200

    except Exception as e:
        current_app.logger.error(f"Erreur dans /chat : {str(e)}", exc_info=True)
        return jsonify({"error": "Une erreur interne est survenue."}), 500