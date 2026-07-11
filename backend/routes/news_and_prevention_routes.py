from flask import Blueprint, jsonify, request
from models.db import db
from models.user import User
from models.news_and_prevention import NewsAndPrevention
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import os

news_and_prevention_bp = Blueprint('news_and_prevention', __name__, url_prefix='/api/news_and_prevention')

UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@news_and_prevention_bp.route('/', methods=['GET'])
def get_all_news_and_prevention():
    news_and_prevention_list = NewsAndPrevention.query.all()
    if not news_and_prevention_list:
        return jsonify({'message': 'No news and prevention articles found'}), 404
    
    news_and_prevention_data = [news.to_dict() for news in news_and_prevention_list]
    return jsonify(news_and_prevention_data), 200

@news_and_prevention_bp.route('/<int:id_news_and_prevention>', methods=['GET'])
def get_news_and_prevention_by_id(id_news_and_prevention):
    news_and_prevention = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news_and_prevention:
        return jsonify({'message': 'News and prevention article not found'}), 404
    
    return jsonify(news_and_prevention.to_dict()), 200

@news_and_prevention_bp.route('/category/<string:category>', methods=['GET'])
def get_news_and_prevention_by_category(category):
    news_and_prevention_list = NewsAndPrevention.query.filter(NewsAndPrevention.category.ilike(f"%{category}%")).order_by(NewsAndPrevention.date.desc()).all()
    if not news_and_prevention_list:
        return jsonify({'message': 'No news and prevention articles found for the specified category'}), 404
    
    news_and_prevention_data = [news.to_dict() for news in news_and_prevention_list]
    return jsonify(news_and_prevention_data), 200

@news_and_prevention_bp.route('/', methods=['POST'])
def create_news_and_prevention():
    data = request.get_json()
    id_user = data.get('id_user')
    title = data.get('title')
    content = data.get('content')
    category = data.get('category')

    if not all([id_user, title, content, category]):
        return jsonify({'message': 'Missing required fields'}), 400
    
    author = User.query.get(id_user)
    if not author:
        return jsonify({'message': 'Author not found'}), 404
    
    try:
        new_news_and_prevention = NewsAndPrevention(
            id_user=id_user,
            title=title,
            content=content,
            category=category,
            photo=None
        )


        db.session.add(new_news_and_prevention)

        if 'photo' in request.files:
            photo = request.files['photo']
            if photo.filename != '':
                filename = secure_filename(photo.filename)
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                photo.save(file_path)
                new_news_and_prevention.photo = file_path

        db.session.commit()
        return jsonify(new_news_and_prevention.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error creating news and prevention article', 'error': str(e)}), 500
    
@news_and_prevention_bp.route('/<int:id_news_and_prevention>', methods=['PUT'])
def update_news_and_prevention(id_news_and_prevention):
    news_and_prevention = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news_and_prevention:
        return jsonify({'message': 'News and prevention article not found'}), 404
    
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    category = data.get('category')

    if title:
        news_and_prevention.title = title
    if content:
        news_and_prevention.content = content
    if category:
        news_and_prevention.category = category

    if 'photo' in request.files:
        photo = request.files['photo']
        if photo.filename != '':
            filename = secure_filename(photo.filename)
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            photo.save(file_path)
            news_and_prevention.photo = file_path

    try:
        db.session.commit()
        return jsonify(news_and_prevention.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error updating news and prevention article', 'error': str(e)}), 500
    
@news_and_prevention_bp.route('/<int:id_news_and_prevention>', methods=['DELETE'])
def delete_news_and_prevention(id_news_and_prevention):
    news_and_prevention = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news_and_prevention:
        return jsonify({'message': 'News and prevention article not found'}), 404
    
    try:
        db.session.delete(news_and_prevention)
        db.session.commit()
        return jsonify({'message': 'News and prevention article deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error deleting news and prevention article', 'error': str(e)}), 500
    
@news_and_prevention_bp.route('/<int:id_news_and_prevention>/toggle', methods=['PATCH'])
def toggle_news_and_prevention(id_news_and_prevention):
    try:
        news_and_prevention = NewsAndPrevention.query.get(id_news_and_prevention)
        if not news_and_prevention:
            return jsonify({'message': 'News and prevention article not found'}), 404
        
        news_and_prevention.is_active = not news_and_prevention.is_active
        db.session.commit()
        return jsonify({'message': 'News and prevention article status toggled successfully', 'is_active': news_and_prevention.is_active}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error toggling news and prevention article status', 'error': str(e)}), 500



