from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from datetime import datetime
from models.db import db
from models.stock_movement import StockMovement
from models.medical_product import MedicalProduct
from models.traceability import Traceability
from utils.role_required import role_required
from enums import RoleEnum

stock_movements_bp = Blueprint('stock_movements', __name__, url_prefix='/api/stock-movements')

TIPOS_VALIDOS=['Entrada','Salida','Desechado']

@stock_movements_bp.route('/', methods=['POST'])
@role_required(RoleEnum.NURSE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def create_stock_movement():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        product = MedicalProduct.query.get(data.get('id_product'))
        if not product:
            return jsonify({"msg": "Product not found"}), 404
        tipo=data.get('type_movement')
        if tipo not in TIPOS_VALIDOS:
            return jsonify({"msg": f"Invalid type_movement. Valid types are: {TIPOS_VALIDOS}"}), 400
        
        cantidad=data.get('quantity')
        if not isinstance(cantidad, int) or cantidad <= 0:
            return jsonify({"msg": "Invalid quantity. It must be a positive integer."}), 400

        if tipo in ['Salida', 'Desechado'] and cantidad > product.current_stock:
            return jsonify({
                "msg": f"Stock insuficiente. Disponible: {product.current_stock}, solicitado para {tipo.lower()}: {cantidad}"
            }), 400

        # id_nurse solo referencia la tabla `nurses`: si quien actúa es
        # Admin/Superadmin (no tiene fila ahí), el movimiento queda sin
        # atribución de enfermero en vez de romper la FK.
        claims = get_jwt()
        id_nurse_logueado = int(get_jwt_identity()) if claims.get('rol') == RoleEnum.NURSE.value else None

        new_movement = StockMovement(
            id_product=data.get('id_product'),
            id_nurse=id_nurse_logueado,
            type_movement=tipo,
            quantity=cantidad,
            date_time=datetime.fromisoformat(data.get('date_time')) if data.get('date_time') else datetime.utcnow()
        )
        db.session.add(new_movement)
        

        if tipo == 'Entrada':
            product.current_stock += cantidad

        elif tipo in ['Salida', 'Desechado']:
            product.current_stock = max(0, product.current_stock - cantidad)

        db.session.commit()

        return jsonify({"msg": "Stock movement created successfully", "stock_movement_id": new_movement.id_stock_movement, "current_stock": product.current_stock}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating stock movement", "error": str(e)}), 500


@stock_movements_bp.route('/', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_stock_movements():
    try:
        movements = StockMovement.query.all()
        return jsonify([m.to_dict() for m in movements]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching stock movements"}), 500


@stock_movements_bp.route('/<int:movement_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_stock_movement(movement_id):
    try:
        movement = StockMovement.query.get(movement_id)
        if not movement:
            return jsonify({"msg": "Stock movement not found"}), 404
        return jsonify(movement.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching stock movement"}), 500


@stock_movements_bp.route('/product/<int:product_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_stock_movements_by_product(product_id):
    try:
        movements = StockMovement.query.filter_by(id_product=product_id).all()
        return jsonify([m.to_dict() for m in movements]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching product stock movements"}), 500


@stock_movements_bp.route('/<int:movement_id>', methods=['PUT'])
@role_required(RoleEnum.NURSE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR) #solo permite editar date_time. si se edita despues de que se haya hecho un movimiento, no se actualiza el stock. Se podria hacer que si se edita la cantidad, se actualice el stock, pero eso es mas complejo y no lo implemento por ahora
def update_stock_movement(movement_id):
    try:
        movement = StockMovement.query.get(movement_id)
        if not movement:
            return jsonify({"msg": "Stock movement not found"}), 404

        id_nurse_logueado = int(get_jwt_identity())

        if movement.id_nurse != id_nurse_logueado:
            return jsonify({"msg": "Unauthorized. You can only edit your own stock movements."}), 403

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        
        if 'date_time' in data:
            movement.date_time = datetime.fromisoformat(data.get('date_time')) if data.get('date_time') else None

        db.session.commit()
        return jsonify({"msg": "Stock movement updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating stock movement", "error": str(e)}), 500


@stock_movements_bp.route('/<int:movement_id>', methods=['DELETE'])
@role_required(RoleEnum.NURSE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def delete_stock_movement(movement_id):
    try:
        movement = StockMovement.query.get(movement_id)
        if not movement:
            return jsonify({"msg": "Stock movement not found"}), 404

        id_nurse_logueado = int(get_jwt_identity())
        if movement.id_nurse != id_nurse_logueado:
            return jsonify({"msg": "Unauthorized. You can only delete your own stock movements."}), 403

        
        trazabilidad_vinculada = Traceability.query.filter_by(id_stock_movement=movement.id_stock_movement).first()
        if trazabilidad_vinculada:
            return jsonify({
                "msg": "Este movimiento pertenece a una trazabilidad. Borrá la trazabilidad (traceability_id: "
                       f"{trazabilidad_vinculada.id_traceability}) en su lugar, eso revierte el stock automáticamente."
            }), 400

        product = MedicalProduct.query.get(movement.id_product)
        if product:
            if movement.type_movement == 'Entrada':
                product.current_stock = max(0, product.current_stock - movement.quantity)
            elif movement.type_movement in ['Salida', 'Desechado']: 
                product.current_stock += movement.quantity

        db.session.delete(movement)
        db.session.commit()
        return jsonify({"msg": "Stock movement deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting stock movement", "error": str(e)}), 500
