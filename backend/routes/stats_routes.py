from datetime import date, timedelta
from calendar import monthrange
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from models.db import db
from models.medical_appointment import MedicalAppointment
from models.traceability import Traceability
from models.medical_product import MedicalProduct
from utils.role_required import role_required
from enums import RoleEnum, AppointmentStatusEnum

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')


def _parse_date_range():
    """Rango de fechas desde query params, default: mes actual completo.

    Devuelve (date_from, date_to) o lanza ValueError si el formato es invalido.
    """
    today = date.today()
    default_from = today.replace(day=1)
    default_to = today.replace(day=monthrange(today.year, today.month)[1])

    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')

    date_from = date.fromisoformat(date_from_str) if date_from_str else default_from
    date_to = date.fromisoformat(date_to_str) if date_to_str else default_to
    return date_from, date_to


@stats_bp.route('/attended-patients-count', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_attended_patients_count():
    try:
        date_from, date_to = _parse_date_range()
    except ValueError:
        return jsonify({"msg": "Fecha invalida. Formato esperado YYYY-MM-DD"}), 400

    try:
        query = db.session.query(func.count(func.distinct(MedicalAppointment.id_patient))).filter(
            MedicalAppointment.status == AppointmentStatusEnum.ATENDIDO,
            MedicalAppointment.date.between(date_from, date_to),
        )
        id_doctor = request.args.get('id_doctor', type=int)
        if id_doctor:
            query = query.filter(MedicalAppointment.id_doctor == id_doctor)

        total = query.scalar() or 0
        return jsonify({"total": total, "date_from": date_from.isoformat(), "date_to": date_to.isoformat()}), 200
    except Exception as e:
        return jsonify({"msg": "Error al calcular pacientes atendidos", "error": str(e)}), 500


@stats_bp.route('/diseases', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_diseases_report():
    try:
        date_from, date_to = _parse_date_range()
    except ValueError:
        return jsonify({"msg": "Fecha invalida. Formato esperado YYYY-MM-DD"}), 400

    try:
        query = db.session.query(
            MedicalAppointment.disease_type,
            func.count(MedicalAppointment.id_medical_appointment),
        ).filter(
            MedicalAppointment.status == AppointmentStatusEnum.ATENDIDO,
            MedicalAppointment.date.between(date_from, date_to),
        )
        id_doctor = request.args.get('id_doctor', type=int)
        if id_doctor:
            query = query.filter(MedicalAppointment.id_doctor == id_doctor)

        rows = query.group_by(MedicalAppointment.disease_type).all()

        result = [
            {
                "disease_type": disease_type.value if disease_type else None,
                "label": disease_type.value if disease_type else "Sin diagnóstico cargado",
                "count": count,
            }
            for disease_type, count in rows
        ]
        result.sort(key=lambda r: r["count"], reverse=True)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": "Error al calcular el reporte de enfermedades", "error": str(e)}), 500


@stats_bp.route('/supply-consumption', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_supply_consumption_report():
    try:
        date_from, date_to = _parse_date_range()
    except ValueError:
        return jsonify({"msg": "Fecha invalida. Formato esperado YYYY-MM-DD"}), 400

    try:
        rows = (
            db.session.query(
                MedicalProduct.type_product,
                func.sum(Traceability.quantity),
            )
            .join(Traceability, Traceability.id_product == MedicalProduct.id_product)
            .filter(func.date(Traceability.date_of_use).between(date_from, date_to))
            .group_by(MedicalProduct.type_product)
            .all()
        )

        result = [
            {
                "type_product": type_product or "Sin categoría",
                "total_quantity": int(total_quantity or 0),
            }
            for type_product, total_quantity in rows
        ]
        result.sort(key=lambda r: r["total_quantity"], reverse=True)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": "Error al calcular el consumo de insumos", "error": str(e)}), 500


@stats_bp.route('/absenteeism', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_absenteeism_report():
    try:
        date_from, date_to = _parse_date_range()
    except ValueError:
        return jsonify({"msg": "Fecha invalida. Formato esperado YYYY-MM-DD"}), 400

    try:
        query = db.session.query(
            MedicalAppointment.status,
            func.count(MedicalAppointment.id_medical_appointment),
        ).filter(MedicalAppointment.date.between(date_from, date_to))

        id_doctor = request.args.get('id_doctor', type=int)
        if id_doctor:
            query = query.filter(MedicalAppointment.id_doctor == id_doctor)

        rows = query.group_by(MedicalAppointment.status).all()

        counts = {status.value: 0 for status in AppointmentStatusEnum}
        for status, count in rows:
            counts[status.value] = count

        total = sum(counts.values())
        cancelados = counts.get(AppointmentStatusEnum.CANCELADO.value, 0)
        absenteeism_rate = round((cancelados / total * 100), 1) if total else 0

        return jsonify({
            "total": total,
            "reservado": counts.get(AppointmentStatusEnum.RESERVADO.value, 0),
            "en_espera": counts.get(AppointmentStatusEnum.EN_ESPERA.value, 0),
            "atendido": counts.get(AppointmentStatusEnum.ATENDIDO.value, 0),
            "cancelado": cancelados,
            "absenteeism_rate": absenteeism_rate,
        }), 200
    except Exception as e:
        return jsonify({"msg": "Error al calcular el ausentismo", "error": str(e)}), 500


@stats_bp.route('/attended-trend', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_attended_trend():
    try:
        date_from, date_to = _parse_date_range()
    except ValueError:
        return jsonify({"msg": "Fecha invalida. Formato esperado YYYY-MM-DD"}), 400

    if (date_to - date_from).days > 366:
        return jsonify({"msg": "El rango de fechas no puede superar un año"}), 400

    try:
        query = db.session.query(
            MedicalAppointment.date,
            func.count(func.distinct(MedicalAppointment.id_patient)),
        ).filter(
            MedicalAppointment.status == AppointmentStatusEnum.ATENDIDO,
            MedicalAppointment.date.between(date_from, date_to),
        )
        id_doctor = request.args.get('id_doctor', type=int)
        if id_doctor:
            query = query.filter(MedicalAppointment.id_doctor == id_doctor)

        rows = query.group_by(MedicalAppointment.date).all()
        counts_by_day = {d: count for d, count in rows}

        result = []
        current = date_from
        while current <= date_to:
            result.append({"date": current.isoformat(), "count": counts_by_day.get(current, 0)})
            current += timedelta(days=1)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": "Error al calcular la tendencia de atenciones", "error": str(e)}), 500


@stats_bp.route('/expiring-products', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_expiring_products():
    try:
        products = MedicalProduct.query.filter(MedicalProduct.is_active == True).all()  # noqa: E712

        all_dicts = [p.to_dict() for p in products]
        result = [p for p in all_dicts if p['vencido'] or p['por_vencer']]
        result.sort(key=lambda p: (not p['vencido'], p['expiration_date'] or ''))
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": "Error al obtener productos por vencer", "error": str(e)}), 500


@stats_bp.route('/low-stock', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_low_stock_products():
    try:
        products = MedicalProduct.query.filter(
            MedicalProduct.is_active == True,  # noqa: E712
            MedicalProduct.current_stock <= MedicalProduct.minimum_stock_level,
        ).order_by(MedicalProduct.current_stock.asc()).all()

        result = [
            {
                "id_product": p.id_product,
                "name_product": p.name_product,
                "type_product": p.type_product,
                "current_stock": p.current_stock,
                "minimum_stock_level": p.minimum_stock_level,
            }
            for p in products
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": "Error al obtener insumos con stock bajo", "error": str(e)}), 500
