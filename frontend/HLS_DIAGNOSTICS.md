# HLS seek diagnostics

Open a lesson with `?hlsDebug=1` appended to its page URL (or `&hlsDebug=1`
if it already has a query string). Enable the browser console's Info messages
and filter for `[LingoPalm media]`. Reload after changing these parameters.

The `engine-selected` entry reports `hls.js`, `native-hls`, or `progressive`.
To compare hls.js with native HLS, use `?hlsDebug=1&hlsEngine=js` in a browser
where Hls.isSupported() is true. Otherwise the native fallback remains in use.
Normal page loads keep the original engine selection and emit no diagnostics.

Record playback from the start, then seek forward outside the buffered range,
backward, and within the buffered range. Note the spoken line and the displayed
subtitle at each mismatch. Compare a fresh load with sequential playback; hls.js
can learn corrected fragment timing as it buffers, so prior playback matters.

Logs include media/store time, active cue index, buffered ranges, seek events,
the first presented frame's media timestamp after a seek (where supported),
fragment loading/buffering/change events, PTS updates, and rendition switches.
They omit source URLs, manifest bodies, and network credentials. hls.js fragment
timestamps are processed timeline values, not necessarily raw TS packet PTS.

`currentTime - frag.start` is normally nonzero: playback may be inside a fragment.
A nonzero initial MPEG-TS timestamp is also normal. To inspect packaging, compare
successive segment video PTS boundaries and playlist cumulative EXTINF values
after subtracting the initial PTS. Treat timestamp discontinuities and audio/video
tracks separately. A single fixed subtitle offset cannot correct varying errors.

The player refreshes media time and invalidates its cached cue at `seeked` so
the cue lookup uses the settled seek time. This does not repair a malformed HLS
playlist or compensate for incorrect media timestamps.

Do not change production to MP4 or add a subtitle offset as a diagnostic fix.
First inspect/correct the HLS packaging or compare a known-good local HLS encode.
If generating comparison HLS, use the same original section and VTT and use
time-based forced keyframes (e.g. `-force_key_frames "expr:gte(t,n_forced*4)"`)
rather than assuming `-g 96` equals four seconds for every source frame rate.
Changing to fMP4 alone is not proof of a fix; validate seeking in the same browser.
