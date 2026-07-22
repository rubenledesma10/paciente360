from flask import Blueprint, request, jsonify
from datetime import datetime
from models.db import db
from models.stock_movement import StockMovement
from models.medical_product import MedicalProduct

stock_movements_bp = Blueprint('stock_movements', __name__, url_prefix='/api/stock-movements')


@stock_movements_bp.route('/', methods=['POST'])
def create_stock_movement():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if not MedicalProduct.query.get(data.get('id_product')):
            return jsonify({"msg": "Product not found"}), 404

        new_movement = StockMovement(
            id_product=data.get('id_product'),
            type_movement=data.get('type_movement'),
            quantity=data.get('quantity'),
            date_time=datetime.fromisoformat(data.get('date_time')) if data.get('date_time') else datetime.utcnow()
        )
        db.session.add(new_movement)
        db.session.commit()

        return jsonify({"msg": "Stock movement created successfully", "stock_movement_id": new_movement.id_stock_movement}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating stock movement", "error": str(e)}), 500


@stock_movements_bp.route('/', methods=['GET'])
def get_stock_movements():
    try:
        movements = StockMovement.query.all()
        return jsonify([m.to_dict() for m in movements]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching stock movements"}), 500


@stock_movements_bp.route('/<int:movement_id>', methods=['GET'])
def get_stock_movement(movement_id):
    try:
        movement = StockMovement.query.get(movement_id)
        if not movement:
            return jsonify({"msg": "Stock movement not found"}), 404
        return jsonify(movement.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching stock movement"}), 500


@stock_movements_bp.route('/product/<int:product_id>', methods=['GET'])
def get_stock_movements_by_product(product_id):
    try:
        movements = StockMovement.query.filter_by(id_product=product_id).all()
        return jsonify([m.to_dict() for m in movements]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching product stock movements"}), 500


@stock_movements_bp.route('/<int:movement_id>', methods=['PUT'])
def update_stock_movement(movement_id):
    try:
        movement = StockMovement.query.get(movement_id)
        if not movement:
            return jsonify({"msg": "Stock movement not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if 'id_product' in data:
            if not MedicalProduct.query.get(data.get('id_product')):
                return jsonify({"msg": "Product not found"}), 404
            movement.id_product = data.get('id_product')

        if 'type_movement' in data:
            movement.type_movement = data.get('type_movement')
        if 'quantity' in data:
            movement.quantity = data.get('quantity')
        if 'date_time' in data:
            movement.date_time = datetime.fromisoformat(data.get('date_time')) if data.get('date_time') else None

        db.session.commit()
        return jsonify({"msg": "Stock movement updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating stock movement", "error": str(e)}), 500


@stock_movements_bp.route('/<int:movement_id>', methods=['DELETE'])
def delete_stock_movement(movement_id):
    try:
        movement = StockMovement.query.get(movement_id)
        if not movement:
            return jsonify({"msg": "Stock movement not found"}), 404

        db.session.delete(movement)
        db.session.commit()
        return jsonify({"msg": "Stock movement deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting stock movement", "error": str(e)}), 500
