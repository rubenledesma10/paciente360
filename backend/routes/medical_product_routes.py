from flask import Blueprint, request, jsonify
from datetime import date
from models.db import db
from models.medical_product import MedicalProduct

medical_products_bp = Blueprint('medical_products', __name__, url_prefix='/api/medical-products')


@medical_products_bp.route('/', methods=['POST'])
def create_medical_product():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        expiration_date = date.fromisoformat(data.get('expiration_date')) if data.get('expiration_date') else None

        if expiration_date and expiration_date < date.today():
                return jsonify({"msg": "La fecha de vencimiento no puede ser anterior a hoy"}), 400

        existing_product = MedicalProduct.query.filter_by(
            name_product=data.get('name_product'),
            expiration_date=expiration_date,
            batch_number=data.get('batch_number'),
            current_stock=data.get('current_stock', 0),
            minimum_stock_level=data.get('minimum_stock_level', 0),
            type_product=data.get('type_product')
        ).first()

        if existing_product:
            return jsonify({"msg": "Medical product already exists"}), 400

        new_product = MedicalProduct(
            name_product=data.get('name_product'),
            expiration_date=expiration_date,
            batch_number=data.get('batch_number'),
            current_stock=data.get('current_stock', 0),
            minimum_stock_level=data.get('minimum_stock_level', 0),
            type_product=data.get('type_product')
        )
        db.session.add(new_product)
        db.session.commit()

        return jsonify({"msg": "Medical product created successfully", "product_id": new_product.id_product}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating medical product", "error": str(e)}), 500


@medical_products_bp.route('/', methods=['GET'])
def get_medical_products():
    try:
        products = MedicalProduct.query.all()
        return jsonify([p.to_dict() for p in products]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching medical products"}), 500


@medical_products_bp.route('/<int:product_id>', methods=['GET'])
def get_medical_product(product_id):
    try:
        product = MedicalProduct.query.get(product_id)
        if not product:
            return jsonify({"msg": "Medical product not found"}), 404
        return jsonify(product.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching medical product"}), 500


@medical_products_bp.route('/<int:product_id>', methods=['PUT'])
def update_medical_product(product_id):
    try:
        product = MedicalProduct.query.get(product_id)
        if not product:
            return jsonify({"msg": "Medical product not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if 'name_product' in data:
            product.name_product = data.get('name_product')
        if 'expiration_date' in data:
            nueva_fecha = date.fromisoformat(data.get('expiration_date')) if data.get('expiration_date') else None
            if nueva_fecha and nueva_fecha < date.today():
                return jsonify({"msg": "La fecha de vencimiento no puede ser anterior a hoy"}), 400
            product.expiration_date = nueva_fecha
        if 'batch_number' in data:
            product.batch_number = data.get('batch_number')
        if 'current_stock' in data:
            product.current_stock = data.get('current_stock')
        if 'minimum_stock_level' in data:
            product.minimum_stock_level = data.get('minimum_stock_level')
        if 'type_product' in data:
            product.type_product = data.get('type_product')

        db.session.commit()
        return jsonify({"msg": "Medical product updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating medical product", "error": str(e)}), 500


@medical_products_bp.route('/<int:product_id>', methods=['DELETE'])
def delete_medical_product(product_id):
    try:
        product = MedicalProduct.query.get(product_id)
        if not product:
            return jsonify({"msg": "Medical product not found"}), 404

        db.session.delete(product)
        db.session.commit()
        return jsonify({"msg": "Medical product deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting medical product", "error": str(e)}), 500


@medical_products_bp.route('/search', methods=['GET'])
def search_medical_products():
    try:
        query = request.args.get('query', '')
        products = MedicalProduct.query.filter(
            (MedicalProduct.name_product.ilike(f'%{query}%')) |
            (MedicalProduct.type_product.ilike(f'%{query}%')) |
            (MedicalProduct.batch_number.ilike(f'%{query}%'))
        ).all()
        return jsonify([p.to_dict() for p in products]), 200
    except Exception as e:
        return jsonify({"msg": "Error searching medical products"}), 500
