# DoReMingo

A cheerful browser game that trains the ear to recognise notes, grounded in functional ear training (Kodály-rooted, movable-do scale-degree recognition). Flamingo mascot, bright colours, no fail states.

## Language

**Mode**:
A top-level way to play, chosen from the home chooser. _Learn_ is the fixed Level
progression; _Warmup_ is a short, transient ear-tune; _Daily_ is the shared once-a-day puzzle.
_Avoid_: game type, screen

**Daily**:
A single shared puzzle generated from the calendar date — the same for every player that
day (a shared daily puzzle), built for spoiler-free score sharing. Competitive: one attempt per local
day, then the screen locks to a result view until the next local midnight. Independent of
Learn progress. Currently realised as the _Daily Melody_ game. See [ADR-0003].
_Avoid_: challenge, daily challenge

**Daily Melody**:
The Daily game: echo a hidden melody by Degree, with per-position feedback (right
Degree right spot / right Degree wrong spot / absent). You get fewer Guesses than the tune has
notes — length minus 2, floor 3 (a 5-note tune allows 3 Guesses; length capped at 7). A Guess
commits on its last note (no undo). A Degree shown
absent is locked out of the palette. The tune auto-replays after each Guess, plus one manual replay
per turn. A soft fail once the Guesses run out Reveals the tune rather than ending in a loss.
_Avoid_: dictation, transcription

**Guess**:
One submitted row in Daily Melody — a full-length sequence of Degrees, scored per position.
_Avoid_: attempt, try

**Reveal**:
On a Daily Melody soft fail, the hidden tune is played in full and named. A teaching beat (kin
to Resolution), not a punishment — the game keeps its no-fail spirit even where Daily lets you
miss. See [ADR-0003].
_Avoid_: answer, solution

**Warmup**:
A short, transient ear-calibration run. It starts on the home chord (Do-Mi-Sol) and
adds a note each time the player gets three Questions right in a row, climbing to the
major pentatonic (Do-Re-Mi-Sol-La) — never reaching Fa or Ti. Misses reset the streak
but never demote. It never persists and resets every time it is entered. See [ADR-0002].
_Avoid_: practice, drill

**Degree**:
A note's position within the current key (1–7, solfège Do–Ti; chromatic degrees like Fi/Te at later levels). The thing the player identifies in every question.
_Avoid_: note name, pitch class (those imply absolute pitch, which the game deliberately does not train)

**Cadence**:
A short chord progression (I-IV-V-I) played before a question to establish the key in the player's ear.
_Avoid_: intro chords, jingle

**Key**:
The tonal context a question lives in. Established by the Cadence; Degrees are relative to it. Early levels fix C major; later levels roam.

**Question**:
One quiz round: cadence (when due) + a played note; the player answers with a Degree.

**Level**:
A **Stage** in the fixed Learn progression. Each Level defines the degree pool, key pool, mode, and question style. Shape: tonic triad (Do-Mi-Sol) → add degrees one at a time → full diatonic → chromatic → minor → random keys → Sequences.

**Stage**:
The structural unit the quiz engine (Round) plays through to a cleared Bar: a degree pool, key (tonic), mode, cadence rule, and Bar rule (how correct/wrong answers move the Bar). A Level is a Stage in the fixed Learn progression; a Warmup stage is a transient Stage whose Bar rule is streak-based (a wrong answer resets the Bar to zero rather than draining it). The shared shape that lets Learn and Warmup drive the same engine — see [ADR-0002].
_Avoid_: calling a transient or non-progression Stage a "Level".

**Sequence**:
A Question whose answer is 2–3 Degrees in order (melodic-dictation lite). Late-game only.

**Resolution**:
The stepwise walk from the question's note up or down to Do, played after every answer (right or wrong). The methodology's core teaching device. Skippable by tap.

**Hand Sign**:
The Curwen/Kodály hand gesture for a Degree, shown as an icon on its answer button and in Meet-the-Note moments.

**Meet-the-Note**:
A short interactive intro shown when a Degree is first unlocked: hear it, tap it, hear its Resolution. The first-run tutorial is a chain of these plus "meet the Cadence".

**Bar**:
The level progress meter. Correct answers fill it (+1), wrong answers drain it slightly (−0.5, floor 0). Full bar clears the level. There is no fail state.

## Example dialogue

> **Dev:** When the player gets La wrong, do we replay the note?
> **Expert:** We play the Resolution — La walks down to Do — and show which Degree it really was. Then a similar Question re-enters the queue soon after.
> **Dev:** And the Cadence replays too?
> **Expert:** Only if the level says so. Early Levels re-establish the Key every Question; from the no-cadence Levels onward the player holds the Key in their head.
> **Dev:** So "C#" never appears in the UI?
> **Expert:** Never. The player answers in Degrees — Do, Re, Fi — not note names. If you're printing a note name, you've broken the methodology.

## Asset rendering quirk

The mascot/favicon SVGs come out of a vector editor (Boxy) using CSS
`transform-box: fill-box` + `transform-origin` (e.g. on the wing and beak). The
browser rotates those shapes about their own bounding-box centre; `rsvg-convert`
(and most non-browser rasterisers) ignore `transform-box`/`transform-origin` and
rotate about the SVG origin instead — so a PNG render comes out misaligned
(beak/wing detached) even though the SVG looks right in a browser.

When exporting an SVG to PNG (favicon → app icon), **bake those transforms into a
plain `translate(cx cy) matrix(...) translate(-cx -cy)` list** (cx,cy = the shape's
bbox centre, or the explicit px `transform-origin`) and drop the CSS `style`. Then
the raster matches the browser. Verify against a browser preview before shipping.

App Store note: the iOS app icon must be **opaque, square, no alpha, no rounded
corners** (Apple masks the corners). Render the favicon without its `rx`, then
`magick … -background "#ff5d8f" -alpha remove -alpha off` so the PNG has no alpha
channel.
