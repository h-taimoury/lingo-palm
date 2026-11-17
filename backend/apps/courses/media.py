import mimetypes
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes

from .models import Section
from .permissions import IsStaffOrPublishedReadOnly, visible_courses


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def section_for_viewer(request, section_id):
    sections = Section.objects.all()
    if not request.user.is_staff:
        sections = sections.filter(visible_courses(request.user, "course__"), is_published=True)
    return get_object_or_404(sections, pk=section_id)


@api_view(["GET", "HEAD"])
@permission_classes([IsStaffOrPublishedReadOnly])
def section_subtitle(request, section_id):
    subtitle = section_for_viewer(request, section_id).subtitle_file
    if not subtitle:
        raise Http404
    try:
        stream = subtitle.open("rb")
    except FileNotFoundError as exc:
        raise Http404 from exc
    return FileResponse(stream, content_type="text/vtt", headers={"Cache-Control": "private, no-store"})


def local_video(request, source):
    prefix = "/sample-courses/"
    path = urlsplit(source).path
    if not path.startswith(prefix):
        raise Http404
    root = (Path(settings.MEDIA_ROOT) / "sample-courses").resolve()
    file = (root / path.removeprefix(prefix)).resolve()
    if not file.is_relative_to(root) or file.suffix.lower() not in (".mp4", ".webm") or not file.is_file():
        raise Http404
    size = file.stat().st_size
    content_type = mimetypes.guess_type(file)[0]
    headers = {"Accept-Ranges": "bytes", "Cache-Control": "private, no-store"}
    range_header = request.headers.get("Range")
    if not range_header:
        return FileResponse(file.open("rb"), content_type=content_type, headers=headers)
    match = re.fullmatch(r"bytes=(\d{0,18})-(\d{0,18})", range_header)
    if not match or not any(match.groups()):
        return HttpResponse(status=416, headers={**headers, "Content-Range": f"bytes */{size}"})
    first, last = match.groups()
    start = int(first) if first else max(0, size - int(last))
    end = min(int(last), size - 1) if first and last else size - 1
    if start > end:
        return HttpResponse(status=416, headers={**headers, "Content-Range": f"bytes */{size}"})

    def chunks():
        with file.open("rb") as stream:
            stream.seek(start)
            remaining = end - start + 1
            while remaining and (chunk := stream.read(min(65536, remaining))):
                yield chunk
                remaining -= len(chunk)

    return StreamingHttpResponse(chunks(), status=206, content_type=content_type, headers={
        **headers, "Content-Range": f"bytes {start}-{end}/{size}", "Content-Length": end - start + 1,
    })


@api_view(["GET", "HEAD"])
@permission_classes([IsStaffOrPublishedReadOnly])
def section_video(request, section_id, asset=""):
    section = section_for_viewer(request, section_id)
    if settings.DEBUG:
        if asset:
            raise Http404
        return local_video(request, section.local_video_url)

    origin = settings.PRIVATE_VIDEO_ORIGIN.rstrip("/")
    scope = f"{origin}/sections/{section_id}/"
    if not origin or not section.hosted_video_url.startswith(scope):
        raise Http404
    entrypoint = not asset or asset == "_main.m3u8"
    key = section.hosted_video_url.removeprefix(scope) if entrypoint else asset
    if not re.fullmatch(r"[\w./-]+", key) or any(part in ("", ".", "..") for part in key.split("/")):
        raise Http404
    if entrypoint and "/" in key:
        raise Http404
    kind = Path(key).suffix.lower()
    content_type = {".mp4": "video/mp4", ".m4s": "video/iso.segment", ".ts": "video/mp2t",
                    ".aac": "audio/aac", ".m3u8": "application/vnd.apple.mpegurl"}.get(kind)
    if content_type is None:
        raise Http404
    headers = {}
    if settings.PRIVATE_VIDEO_TOKEN:
        headers["Authorization"] = f"Bearer {settings.PRIVATE_VIDEO_TOKEN}"
    if kind != ".m3u8" and "Range" in request.headers:
        headers["Range"] = request.headers["Range"]
    try:
        upstream = build_opener(NoRedirect).open(Request(scope + quote(key), headers=headers), timeout=15)
    except HTTPError as exc:
        exc.close()
        if exc.code == 404:
            raise Http404 from exc
        return HttpResponse(status=502)
    except (URLError, TimeoutError):
        return HttpResponse(status=502)
    headers = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}
    if kind == ".m3u8":
        with upstream:
            content = upstream.read(1024 * 1024 + 1)
        if len(content) > 1024 * 1024 or not content.startswith(b"#EXTM3U"):
            return HttpResponse(status=502)
        uris = re.findall(rb'URI="([^"]+)"|^([^\r\n#][^\r\n]*)', content, re.MULTILINE)
        if any(not re.fullmatch(rb"[\w.-]+(?:/[\w.-]+)*", path) or
               any(part in (b".", b"..") for part in path.split(b"/"))
               for path in (uri or line for uri, line in uris)):
            return HttpResponse(status=502)
        return HttpResponse(content, content_type=content_type, headers=headers)
    for name in ("Content-Length", "Content-Range", "Accept-Ranges"):
        if upstream.headers.get(name):
            headers[name] = upstream.headers[name]
    return FileResponse(upstream, status=upstream.status, content_type=content_type, headers=headers)
