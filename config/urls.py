from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def home(request):
    return render(request, "index.html")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("students.urls")),
    path("", home, name="home"),
]
