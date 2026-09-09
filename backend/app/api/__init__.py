from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.events import router as events_router
from app.api.reports import router as reports_router
from app.api.admin import router as admin_router
from app.api.analytics import router as analytics_router
from app.api.demo import router as demo_router
from app.api.websocket import router as ws_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(events_router)
api_router.include_router(reports_router)
api_router.include_router(admin_router)
api_router.include_router(analytics_router)
api_router.include_router(demo_router)

__all__ = ["api_router", "ws_router"]
