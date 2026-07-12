# Servidor local de VarMan Crew.
# Igual que "python -m http.server" pero le dice al navegador que NO guarde
# versiones viejas en cache. Asi, cada vez que se cambie la app, con un F5
# normal ya se ve lo ultimo (no hace falta Ctrl+Shift+R).
import http.server
import socketserver
import os

PORT = 8000

os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print("VarMan Crew en http://localhost:8000  (sin cache)")
    print("No cierres esta ventana mientras uses la app.")
    httpd.serve_forever()
