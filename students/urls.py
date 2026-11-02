from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, ClassRoomViewSet, ResultViewSet, dashboard, auth_check

router = DefaultRouter()
router.register("students", StudentViewSet, basename="student")
router.register("classes", ClassRoomViewSet, basename="classroom")
router.register("results", ResultViewSet, basename="result")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", dashboard, name="dashboard"),
    path("auth-check/", auth_check, name="auth-check"),
]
