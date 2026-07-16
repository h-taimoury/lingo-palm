from django.http import JsonResponse


def health_check(request):  # noqa: ANN001
    return JsonResponse({"status": "ok"})
