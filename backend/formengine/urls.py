from rest_framework.routers import DefaultRouter

from .views import FormInstanceViewSet

router = DefaultRouter()
router.register("", FormInstanceViewSet, basename="forminstance")
urlpatterns = router.urls
