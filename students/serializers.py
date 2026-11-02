from rest_framework import serializers
from .models import ClassRoom, Student, Result

class ClassRoomSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ClassRoom
        fields = ["id", "name", "level", "teacher_name", "description", "student_count"]


class StudentSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "first_name", "last_name", "email", "phone_number", "gender",
            "date_of_birth", "admission_number", "classroom", "classroom_name", "date_registered",
        ]
        read_only_fields = ["id", "date_registered", "classroom_name"]


class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student", read_only=True)
    class_name = serializers.CharField(source="student.classroom.name", read_only=True)

    class Meta:
        model = Result
        fields = [
            "id", "student", "student_name", "class_name", "subject", "term",
            "session", "ca_score", "exam_score", "total_score", "grade",
        ]
        read_only_fields = ["id", "total_score", "grade", "student_name", "class_name"]

    def validate(self, attrs):
        ca = attrs.get("ca_score", getattr(self.instance, "ca_score", None))
        exam = attrs.get("exam_score", getattr(self.instance, "exam_score", None))
        if ca is not None and not 0 <= ca <= 40:
            raise serializers.ValidationError({"ca_score": "CA score must be between 0 and 40."})
        if exam is not None and not 0 <= exam <= 60:
            raise serializers.ValidationError({"exam_score": "Exam score must be between 0 and 60."})
        student = attrs.get("student", getattr(self.instance, "student", None))
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        term = attrs.get("term", getattr(self.instance, "term", None))
        session = attrs.get("session", getattr(self.instance, "session", None))
        if student and subject and term and session:
            duplicate = Result.objects.filter(student=student, subject__iexact=subject, term=term, session=session)
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError("This student already has a result for this subject, term and session.")
        return attrs
