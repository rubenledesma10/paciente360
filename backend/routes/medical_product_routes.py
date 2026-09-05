from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from datetime import date, timedelta
from models.db import db
from models.medical_product import MedicalProduct, DIAS_PARA_POR_VENCER
from models.stock_movement import StockMovement
from utils.role_required import role_required
from enums import RoleEnum

medical_products_bp = Blueprint('medical_products', __name__, url_prefix='/api/medical-products')

DIAS_REPORTE_POR_VENCEER = 60


def _id_nurse_actor():
    """Id del nurse logueado, o None si quien actúa no es un Nurse.

    StockMovement.id_nurse solo acepta FKs a la tabla `nurses`, así que para
    Admin/Superadmin (que no tienen fila ahí) el movimiento se registra sin
    atribución de enfermero.
    """
    claims = get_jwt()
    return int(get_jwt_identity()) if claims.get('rol') == RoleEnum.NURSE.value else None


def _dar_de_baja(producto, id_nurse):
    """Da de baja un producto puntual (is_active=False).

    Si tiene stock remanente, registra un StockMovement 'Desechado' por esa
    cantidad para dejar constancia del descarte (con id_nurse=None si quien
    actúa no es un Nurse). No borra ninguna fila: mantiene intacto el
    historial de movimientos/trazabilidad.
    """
    if producto.current_stock > 0:
        db.session.add(StockMovement(
            id_product=producto.id_product,
            id_nurse=id_nurse,
            type_movement='Desechado',
            quantity=producto.current_stock,
        ))
        producto.current_stock = 0

    producto.is_active = False


def _archivar_vencidos_y_sin_stock():
    """Recorre los productos activos y da de baja los vencidos o sin stock."""
    id_nurse = _id_nurse_actor()

    hoy = date.today()
    productos = MedicalProduct.query.filter_by(is_active=True).all()
    hubo_cambios = False

    for producto in productos:
        vencido = bool(producto.expiration_date and producto.expiration_date < hoy)
        if vencido or producto.current_stock == 0:
            _dar_de_baja(producto, id_nurse)
            hubo_cambios = True

    if hubo_cambios:
        db.session.commit()

@medical_products_bp.route('/', methods=['POST'])
@role_required(RoleEnum.NURSE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def create_medical_product():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        expiration_date = date.fromisoformat(data.get('expiration_date')) if data.get('expiration_date') else None

        if expiration_date and expiration_date < date.today():
                return jsonify({"msg": "La fecha de vencimiento no puede ser anterior a hoy"}), 400

        batch_number = data.get('batch_number')
        if batch_number:
            lote_existente = MedicalProduct.query.filter_by(batch_number=batch_number).first()
            if lote_existente:
                return jsonify({"msg": "El número de lote ya existe"}), 400

        existing_product = MedicalProduct.query.filter_by(
            name_product=data.get('name_product'),
            expiration_date=expiration_date,
            batch_number=data.get('batch_number'),
            current_stock=data.get('current_stock', 0),
            minimum_stock_level=data.get('minimum_stock_level', 0),
            type_product=data.get('type_product'),
            is_active=True
        ).first()

        if existing_product:
            return jsonify({"msg": "Medical product already exists"}), 400

        current_stock_inicial=data.get('current_stock', 0)

        new_product = MedicalProduct(
            name_product=data.get('name_product'),
            expiration_date=expiration_date,
            batch_number=data.get('batch_number'),
            current_stock=current_stock_inicial,
            minimum_stock_level=data.get('minimum_stock_level', 0),
            type_product=data.get('type_product')
        )
        db.session.add(new_product)
        db.session.flush() #para tener el new_product.id_product antes del commit

        if current_stock_inicial > 0:
            movimiento_inicial = StockMovement(
                id_product=new_product.id_product,
                id_nurse=_id_nurse_actor(),
                type_movement='Entrada',
                quantity=current_stock_inicial,
            )
            db.session.add(movimiento_inicial)
        db.session.commit()

        return jsonify({"msg": "Medical product created successfully", "product_id": new_product.id_product}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Error creating medical product {e}", "error": str(e)}), 500


@medical_products_bp.route('/', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_medical_products():
    try:
        _archivar_vencidos_y_sin_stock()
        products = MedicalProduct.query.filter_by(is_active=True).all()
        return jsonify([p.to_dict() for p in products]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching medical products"}), 500


@medical_products_bp.route('/<int:product_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_medical_product(product_id):
    try:
        product = MedicalProduct.query.get(product_id)
        if not product:
            return jsonify({"msg": "Medical product not found"}), 404
        return jsonify(product.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching medical product"}), 500

@medical_products_bp.route('/expiring-soon', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_expiring_soon():

    try:
        hoy = date.today()
        limite = hoy + timedelta(days=DIAS_REPORTE_POR_VENCEER)
 
        productos = (
            MedicalProduct.query
            .filter(
                MedicalProduct.expiration_date != None,
                MedicalProduct.expiration_date >= hoy,
                MedicalProduct.expiration_date <= limite,
            )
            .order_by(MedicalProduct.expiration_date.asc())
            .all()
        )
 
        if not productos:
            return jsonify({
                "msg": "No hay productos por vencer en los próximos 2 meses",
                "products": []
            }), 200
 
        return jsonify({
            "msg": f"Hay {len(productos)} producto(s) por vencer en los próximos 2 meses",
            "products": [p.to_dict() for p in productos]
        }), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching expiring products", "error": str(e)}), 500

@medical_products_bp.route('/<int:product_id>/discard', methods=['PATCH'])
@role_required(RoleEnum.NURSE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def discard_medical_product(product_id):
    try:
        producto = MedicalProduct.query.get(product_id)
        if not producto or not producto.is_active:
            return jsonify({"msg": "Medical product not found"}), 404

        hoy = date.today()
        vencido = bool(producto.expiration_date and producto.expiration_date < hoy)
        por_vencer = bool(
            producto.expiration_date
            and not vencido
            and (producto.expiration_date - hoy).days <= DIAS_PARA_POR_VENCER
        )
        if not (vencido or por_vencer):
            return jsonify({"msg": "Solo se pueden dar de baja productos vencidos o por vencer"}), 400

        _dar_de_baja(producto, _id_nurse_actor())
        db.session.commit()

        return jsonify(producto.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error discarding medical product", "error": str(e)}), 500


@medical_products_bp.route('/<int:product_id>', methods=['PUT'])
@role_required(RoleEnum.NURSE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def update_medical_product(product_id):
    try:
        product = MedicalProduct.query.get(product_id)
        if not product:
            return jsonify({"msg": "Medical product not found"}), 404
 
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400
 
        data = request.get_json()

        if 'batch_number' in data:
            return jsonify({"msg": "El numero de lote no puede editarse. Si lo cargaste mal, elimina el producto y volvelo a crear."}), 400
        if 'current_stock' in data:
            return jsonify({"msg": "El stock no puede editarse directamente. Usa un movimiento de stock (Entrada/Salida) o una trazabilidad."}), 400
 
        if 'name_product' in data:
            product.name_product = data.get('name_product')
        if 'expiration_date' in data:
            nueva_fecha = date.fromisoformat(data.get('expiration_date')) if data.get('expiration_date') else None
            if nueva_fecha and nueva_fecha < date.today():
                return jsonify({"msg": "La fecha de vencimiento no puede ser anterior a hoy"}), 400
            product.expiration_date = nueva_fecha
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
@role_required(RoleEnum.NURSE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
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
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def search_medical_products():
    try:
        query = request.args.get('query', '')
        products = MedicalProduct.query.filter(
            MedicalProduct.is_active == True,
            (MedicalProduct.name_product.ilike(f'%{query}%')) |
            (MedicalProduct.type_product.ilike(f'%{query}%')) |
            (MedicalProduct.batch_number.ilike(f'%{query}%'))
        ).all()
        return jsonify([p.to_dict() for p in products]), 200
    except Exception as e:
        return jsonify({"msg": "Error searching medical products"}), 500
