from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # permite que el front (otro puerto) le hable al back

@app.route("/api/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(debug=True, port=5000)