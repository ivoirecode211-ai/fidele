from django.contrib import admin

from .models import CleaningTask, HygieneAudit, HygieneProduct, WasteCollection

admin.site.register(CleaningTask)
admin.site.register(HygieneProduct)
admin.site.register(WasteCollection)
admin.site.register(HygieneAudit)
