from flask import jsonify


def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request"}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"error": "Unauthorized"}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(429)
    def too_many_requests(error):
        return jsonify({"error": "Too many requests"}), 429

    @app.errorhandler(500)
    def server_error(error):
        return jsonify({"error": "Internal server error"}), 500
