from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import ClassRoom, Student, Result
from .serializers import ClassRoomSerializer, StudentSerializer, ResultSerializer
from .permissions import ReadOnlyOrStaffWrite

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related("classroom").all()
    serializer_class = StudentSerializer
    permission_classes = [ReadOnlyOrStaffWrite]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["classroom", "gender"]
    search_fields = ["first_name", "last_name", "admission_number", "email"]
    ordering_fields = ["first_name", "last_name", "date_registered"]

    @action(detail=True, methods=["get"], url_path="results", permission_classes=[AllowAny])
    def student_results(self, request, pk=None):
        student = self.get_object()
        qs = student.results.select_related("student", "student__classroom").all()
        return Response(ResultSerializer(qs, many=True).data)


class ClassRoomViewSet(viewsets.ModelViewSet):
    queryset = ClassRoom.objects.annotate(student_count=Count("students")).all()
    serializer_class = ClassRoomSerializer
    permission_classes = [ReadOnlyOrStaffWrite]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "level", "teacher_name"]

    def destroy(self, request, *args, **kwargs):
        classroom = self.get_object()
        if classroom.students.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "This class cannot be deleted while students are assigned to it."})
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"], url_path="students", permission_classes=[AllowAny])
    def classroom_students(self, request, pk=None):
        classroom = self.get_object()
        qs = classroom.students.select_related("classroom").all()
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(StudentSerializer(page, many=True).data)
        return Response(StudentSerializer(qs, many=True).data)


class ResultViewSet(viewsets.ModelViewSet):
    queryset = Result.objects.select_related("student", "student__classroom").all()
    serializer_class = ResultSerializer
    permission_classes = [ReadOnlyOrStaffWrite]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["student", "student__classroom", "subject", "term", "session"]
    search_fields = ["subject", "student__first_name", "student__last_name", "student__admission_number"]
    ordering_fields = ["total_score", "subject", "session"]

@api_view(["GET"])
@permission_classes([AllowAny])
def dashboard(request):
    classes = ClassRoom.objects.annotate(student_count=Count("students")).order_by("name")
    recent = Student.objects.select_related("classroom").order_by("-date_registered")[:5]
    average = Result.objects.aggregate(value=Avg("total_score"))["value"]
    return Response({
        "total_students": Student.objects.count(),
        "total_classes": ClassRoom.objects.count(),
        "total_results": Result.objects.count(),
        "average_score": round(float(average), 2) if average is not None else 0,
        "students_per_class": [
            {"class_name": room.name, "student_count": room.student_count} for room in classes
        ],
        "recent_students": StudentSerializer(recent, many=True).data,
    })


@api_view(["GET"])
def auth_check(request):
    """Confirm that the supplied credentials belong to a staff user."""
    from rest_framework.permissions import IsAdminUser
    # The decorator below handles the normal API permissions; this view is
    # explicitly staff-only via the function attribute assigned here.
    return Response({"authenticated": True, "username": request.user.username, "is_staff": request.user.is_staff})

auth_check.cls.permission_classes = [__import__("rest_framework.permissions", fromlist=["IsAdminUser"]).IsAdminUser]
