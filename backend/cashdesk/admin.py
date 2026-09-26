from django.apps import apps
from django.contrib import admin

# Ancien module de caisse : tous ses modèles restent consultables.
for model in apps.get_app_config("cashdesk").get_models():
    admin.site.register(model)
