from django.http import JsonResponse
from django.views.decorators.http import require_safe


@require_safe
def health(request):
    # No database query: polling must not keep Neon's free compute awake.
    return JsonResponse({"status": "ok"})
