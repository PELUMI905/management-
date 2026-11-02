from datetime import date
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from .models import ClassRoom, Student, Result

class StudentManagementAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.room = ClassRoom.objects.create(name="JSS 1A", level="JSS 1", teacher_name="Mrs A")
        self.staff = get_user_model().objects.create_user(username="admin", password="TestPass123!", is_staff=True)
        self.student_data = {
            "first_name": "Ada", "last_name": "Okafor", "email": "ada@example.com",
            "gender": "F", "date_of_birth": "2010-04-15", "admission_number": "STU001",
            "classroom": self.room.id,
        }

    def test_create_student_requires_staff(self):
        response = self.client.post("/api/students/", self.student_data, format="json")
        self.assertEqual(response.status_code, 401)

    def test_staff_can_create_student(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post("/api/students/", self.student_data, format="json")
        self.assertEqual(response.status_code, 201)

    def test_duplicate_email_rejected(self):
        Student.objects.create(**{
            **self.student_data, "date_of_birth": date(2010, 4, 15), "classroom": self.room
        })
        self.client.force_authenticate(user=self.staff)
        data = {**self.student_data, "admission_number": "STU002"}
        response = self.client.post("/api/students/", data, format="json")
        self.assertEqual(response.status_code, 400)

    def test_result_calculates_total_and_grade(self):
        student = Student.objects.create(
            first_name="Ada", last_name="Okafor", email="ada@example.com", gender="F",
            date_of_birth=date(2010, 4, 15), admission_number="STU001", classroom=self.room
        )
        result = Result.objects.create(student=student, subject="Maths", term="First",
                                       session="2026/2027", ca_score=32, exam_score=48)
        self.assertEqual(result.total_score, 80)
        self.assertEqual(result.grade, "A")

    def test_dashboard_counts_database_records(self):
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_students"], 0)
