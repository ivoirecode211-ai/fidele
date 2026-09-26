from django.contrib import admin

from .models import LabExam, LabRequest

admin.site.register(LabExam)
admin.site.register(LabRequest)
