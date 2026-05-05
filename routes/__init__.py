from .parking import router as parking_router
from .reports import router as reports_router
from .system import router as system_router
from .admin import router as admin_router
from .user import router as user_router

# Los exponemos para que main.py pueda importarlos fácilmente
parking = parking_router
reports = reports_router
system = system_router
admin = admin_router
user = user_router
