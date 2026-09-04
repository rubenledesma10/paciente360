from flask import Blueprint, jsonify, request
from models.news_and_prevention import NewsAndPrevention
from utils.ai_service import (
    explicar_simple,
    conversar_sobre_noticia,
    AIServiceError,
)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


@ai_bp.route('/news/<int:id_news_and_prevention>/simplify', methods=['POST'])
def simplify_news(id_news_and_prevention):
    """Explica una noticia en lenguaje simple.

    Es publico porque las noticias tambien lo son.

    El texto se toma de la base a partir del id, NUNCA del cuerpo del pedido:
    asi nadie puede mandar texto arbitrario para gastar la cuota de la API
    ni para hacerle decir cualquier cosa al modelo.
    """
    news = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news:
        return jsonify({"msg": "Noticia no encontrada"}), 404

    try:
        texto = explicar_simple(news.title, news.content)
        return jsonify({
            "id_news_and_prevention": news.id_news_and_prevention,
            "simplified": texto
        }), 200
    except AIServiceError as e:
        return jsonify({"msg": str(e)}), 503
    except Exception as e:
        print(f"[ai_routes] Error inesperado en simplify: {e}")
        return jsonify({"msg": "No se pudo generar la explicacion."}), 500


@ai_bp.route('/news/<int:id_news_and_prevention>/chat', methods=['POST'])
def chat_about_news(id_news_and_prevention):
    """Conversacion sobre una noticia.

    Body: { "question": "...", "history": [ {"role": "user"|"assistant", "text": "..."}, ... ] }

    El historial lo manda el front en cada pedido: el backend no guarda
    estado de la conversacion, asi que no hace falta sesion ni base para esto.
    """
    news = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news:
        return jsonify({"msg": "Noticia no encontrada"}), 404

    if not request.is_json:
        return jsonify({"msg": "Falta el JSON en la peticion"}), 400

    data = request.get_json()
    pregunta = (data.get('question') or '').strip()
    historial = data.get('history') or []

    if not pregunta:
        return jsonify({"msg": "Escribi tu pregunta."}), 400
    if not isinstance(historial, list):
        return jsonify({"msg": "El historial tiene un formato invalido."}), 400

    try:
        respuesta = conversar_sobre_noticia(news.title, news.content, pregunta, historial)
        return jsonify({
            "id_news_and_prevention": news.id_news_and_prevention,
            "answer": respuesta
        }), 200
    except AIServiceError as e:
        return jsonify({"msg": str(e)}), 503
    except Exception as e:
        print(f"[ai_routes] Error inesperado en chat: {e}")
        return jsonify({"msg": "No se pudo responder la pregunta."}), 500