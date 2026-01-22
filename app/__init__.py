import os
from flask import Flask
from flask_cors import CORS

def create_app():
    # テンプレートフォルダとスタティックフォルダを明示的に指定
    template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../templates'))
    static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../static'))
    
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    CORS(app)
    
    from . import routes
    app.register_blueprint(routes.bp)
    app.secret_key = os.environ.get('FLASK_SECRET', 'dev-secret')

    return app

