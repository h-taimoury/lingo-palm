from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .bulk_mappings import (
    export_review, import_mappings, lookup_entries, plan_import,
    subtitle_context, validate_suggestions,
)
from .models import Section


class BulkMappingsView(APIView):
    permission_classes = (IsAdminUser,)

    def handle_exception(self, exc):
        # Give the existing frontend error component an actionable message even
        # when DRF's nested list serializer reports per-suggestion errors.
        if isinstance(exc, ValidationError):
            messages = []

            def collect(value, prefix=""):
                if isinstance(value, dict):
                    for key, child in value.items():
                        collect(child, f"{prefix}{key}: ")
                elif isinstance(value, list):
                    for index, child in enumerate(value):
                        collect(child, f"{prefix}Item {index + 1}: " if isinstance(child, dict) else prefix)
                else:
                    messages.append(f"{prefix}{value}")

            collect(exc.detail)
            exc.detail = {"detail": "\n".join(messages[:20])}
        return super().handle_exception(exc)

    def get(self, request, section_id, operation):
        section = get_object_or_404(Section, pk=section_id)
        if operation != "context":
            raise ValidationError("Use POST for this operation.")
        return Response(subtitle_context(section))

    def post(self, request, section_id, operation):
        section = get_object_or_404(Section, pk=section_id)
        if not isinstance(request.data, dict):
            raise ValidationError("Expected a JSON object.")
        if operation == "validate":
            suggestions, context = validate_suggestions(section, request.data.get("suggestions"))
            return Response({"suggestions": suggestions, "subtitle_sha256": context["subtitle_sha256"]})
        if operation == "lookup":
            return Response({"entries": lookup_entries(request.data.get("dictionary_word"), request)})
        if operation == "export":
            return Response(export_review(section, request.data, request))
        if operation == "preview":
            return Response(plan_import(section, request.data))
        if operation == "import":
            return Response(import_mappings(section, request.data))
        raise ValidationError("Unknown bulk mappings operation.")
