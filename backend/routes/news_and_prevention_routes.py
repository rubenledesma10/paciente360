from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from models.db import db
from models.user import User
from models.news_and_prevention import NewsAndPrevention
from utils.role_required import role_required
from enums import RoleEnum
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import os
import uuid

news_and_prevention_bp = Blueprint('news_and_prevention', __name__, url_prefix='/api/news_and_prevention')

# Carpeta fisica donde se guardan las imagenes
UPLOAD_FOLDER = os.path.join('static', 'uploads')
# Prefijo con el que el navegador pide la imagen (Flask sirve /static/ solo)
UPLOAD_URL_PREFIX = '/static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def read_text_fields():
    if request.content_type and 'multipart/form-data' in request.content_type:
        return {
            'id_user': request.form.get('id_user'),
            'title': request.form.get('title'),
            'content': request.form.get('content'),
            'category': request.form.get('category')
        }
    return request.get_json(silent=True) or {}


def is_allowed_photo(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_photo(photo):
    """Guarda la imagen y devuelve la URL con la que el front la pide.

    Le antepone un uuid al nombre para que dos noticias con una imagen
    llamada igual no se pisen entre si.
    Devuelve None si el archivo no es una imagen valida.
    """
    if not photo or photo.filename == '':
        return None
    if not is_allowed_photo(photo.filename):
        return None

    safe_name = secure_filename(photo.filename)
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    photo.save(os.path.join(UPLOAD_FOLDER, unique_name))
    # Siempre con barras normales: os.path.join en Windows genera '\' y rompe la URL
    return f"{UPLOAD_URL_PREFIX}/{unique_name}"


def delete_photo_file(photo_url):
    """Borra del disco la imagen anterior para no dejar archivos huerfanos."""
    if not photo_url:
        return
    filename = os.path.basename(photo_url)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            # Si no se puede borrar no vale la pena romper la operacion principal
            pass


# ---------- rutas publicas ----------

@news_and_prevention_bp.route('/', methods=['GET'])
def get_all_news_and_prevention():
    news_and_prevention_list = (
        NewsAndPrevention.query
        .order_by(NewsAndPrevention.date.desc())
        .all()
    )
    # Una lista vacia no es un error: se devuelve 200 con [] para que el
    # front muestre "no hay noticias" en vez de un cartel de error.
    return jsonify([news.to_dict() for news in news_and_prevention_list]), 200


@news_and_prevention_bp.route('/<int:id_news_and_prevention>', methods=['GET'])
def get_news_and_prevention_by_id(id_news_and_prevention):
    news_and_prevention = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news_and_prevention:
        return jsonify({'message': 'News and prevention article not found'}), 404

    return jsonify(news_and_prevention.to_dict()), 200


@news_and_prevention_bp.route('/category/<string:category>', methods=['GET'])
def get_news_and_prevention_by_category(category):
    news_and_prevention_list = (
        NewsAndPrevention.query
        .filter(NewsAndPrevention.category.ilike(f"%{category}%"))
        .order_by(NewsAndPrevention.date.desc())
        .all()
    )
    return jsonify([news.to_dict() for news in news_and_prevention_list]), 200


# ---------- rutas privadas (administrativo) ----------

@news_and_prevention_bp.route('/', methods=['POST'])
@role_required(RoleEnum.ADMINISTRATIVE)
def create_news_and_prevention():
    data = read_text_fields()
    title = data.get('title')
    content = data.get('content')
    category = data.get('category')

    if not all([title, content, category]):
        return jsonify({'message': 'Missing required fields'}), 400

    photo = request.files.get('photo')
    if photo and photo.filename != '' and not is_allowed_photo(photo.filename):
        return jsonify({
            'message': 'Formato de imagen no permitido. Se aceptan: '
                       + ', '.join(sorted(ALLOWED_EXTENSIONS))
        }), 400

    id_user_logueado = int(get_jwt_identity())

    try:
        new_news_and_prevention = NewsAndPrevention(
            id_user=id_user_logueado,
            title=title,
            content=content,
            category=category,
            photo=save_photo(photo)
        )

        db.session.add(new_news_and_prevention)
        db.session.commit()
        return jsonify(new_news_and_prevention.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error creating news and prevention article', 'error': str(e)}), 500


@news_and_prevention_bp.route('/<int:id_news_and_prevention>', methods=['PUT'])
@role_required(RoleEnum.ADMINISTRATIVE)
def update_news_and_prevention(id_news_and_prevention):
    news_and_prevention = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news_and_prevention:
        return jsonify({'message': 'News and prevention article not found'}), 404

    data = read_text_fields()
    title = data.get('title')
    content = data.get('content')
    category = data.get('category')

    photo = request.files.get('photo')
    if photo and photo.filename != '' and not is_allowed_photo(photo.filename):
        return jsonify({
            'message': 'Formato de imagen no permitido. Se aceptan: '
                       + ', '.join(sorted(ALLOWED_EXTENSIONS))
        }), 400

    if title:
        news_and_prevention.title = title
    if content:
        news_and_prevention.content = content
    if category:
        news_and_prevention.category = category

    new_photo_url = save_photo(photo)
    if new_photo_url:
        # Se borra la imagen vieja recien cuando la nueva se guardo bien
        delete_photo_file(news_and_prevention.photo)
        news_and_prevention.photo = new_photo_url

    try:
        db.session.commit()
        return jsonify(news_and_prevention.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error updating news and prevention article', 'error': str(e)}), 500


@news_and_prevention_bp.route('/<int:id_news_and_prevention>', methods=['DELETE'])
@role_required(RoleEnum.ADMINISTRATIVE)
def delete_news_and_prevention(id_news_and_prevention):
    news_and_prevention = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news_and_prevention:
        return jsonify({'message': 'News and prevention article not found'}), 404

    photo_url = news_and_prevention.photo
    try:
        db.session.delete(news_and_prevention)
        db.session.commit()
        # La imagen se borra despues del commit: si falla el borrado en base,
        # no queremos haber perdido el archivo.
        delete_photo_file(photo_url)
        return jsonify({'message': 'News and prevention article deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error deleting news and prevention article', 'error': str(e)}), 500


# NOTA: se quito la ruta /toggle. Usaba news_and_prevention.is_active, una
# columna que no existe en el modelo, asi que reventaba con AttributeError
# apenas se la llamaba. Ademas estaba sin @role_required.
# Si hace falta publicar/despublicar noticias, primero hay que agregar la
# columna is_active al modelo y recien ahi volver a exponer el endpoint.