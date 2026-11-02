from django.contrib import admin
from .models import ClassRoom, Student, Result

@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ("name", "level", "teacher_name")
    search_fields = ("name", "level", "teacher_name")

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("admission_number", "first_name", "last_name", "classroom", "gender", "date_registered")
    list_filter = ("classroom", "gender")
    search_fields = ("first_name", "last_name", "admission_number", "email")

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "term", "session", "total_score", "grade")
    list_filter = ("subject", "term", "session")
