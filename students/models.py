from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class ClassRoom(models.Model):
    name = models.CharField(max_length=80, unique=True)
    level = models.CharField(max_length=40)
    teacher_name = models.CharField(max_length=120)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Classroom"
        verbose_name_plural = "Classrooms"

    def __str__(self):
        return self.name


class Student(models.Model):
    GENDER_CHOICES = [
        ("M", "Male"), ("F", "Female"), ("P", "Prefer not to say"),
    ]
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default="P")
    date_of_birth = models.DateField()
    admission_number = models.CharField(max_length=30, unique=True)
    classroom = models.ForeignKey(ClassRoom, on_delete=models.PROTECT, related_name="students")
    date_registered = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_registered"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Result(models.Model):
    TERM_CHOICES = [("First", "First"), ("Second", "Second"), ("Third", "Third")]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="results")
    subject = models.CharField(max_length=100)
    term = models.CharField(max_length=10, choices=TERM_CHOICES)
    session = models.CharField(max_length=9, help_text="Example: 2026/2027")
    ca_score = models.PositiveSmallIntegerField(validators=[MinValueValidator(0), MaxValueValidator(40)])
    exam_score = models.PositiveSmallIntegerField(validators=[MinValueValidator(0), MaxValueValidator(60)])
    total_score = models.PositiveSmallIntegerField(default=0, editable=False)
    grade = models.CharField(max_length=1, default="F", editable=False)

    class Meta:
        ordering = ["student__last_name", "subject"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "subject", "term", "session"],
                name="unique_student_subject_term_session",
            )
        ]

    def save(self, *args, **kwargs):
        self.total_score = int(self.ca_score or 0) + int(self.exam_score or 0)
        score = self.total_score
        self.grade = (
            "A" if score >= 70 else "B" if score >= 60 else
            "C" if score >= 50 else "D" if score >= 45 else
            "E" if score >= 40 else "F"
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} - {self.subject} ({self.total_score})"
