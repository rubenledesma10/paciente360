from flask_sqlalchemy import SQLAlchemy
from models.db import db
from datetime import datetime


class NewsAndPrevention(db.Model):
    __tablename__ = 'news_and_prevention'
    id_news_and_prevention = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(db.Integer, db.ForeignKey('users.id_user'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    photo = db.Column(db.String(255), nullable=True)
    date = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())

    author = db.relationship('User', back_populates='news_and_prevention')
