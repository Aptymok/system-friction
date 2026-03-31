import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-prod')
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
    GROQ_MODEL = 'llama-3.3-70b-versatile'
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///instance/friction.db')
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'