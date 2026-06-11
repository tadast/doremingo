# DoReMingo

A cheerful browser game that trains the ear to recognise notes, grounded in functional ear training (Kodály-rooted, movable-do scale-degree recognition). Flamingo mascot, bright colours, no fail states.

## Language

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
A stage in the fixed progression. Each level defines the degree pool, key pool, mode, and question style. Shape: tonic triad (Do-Mi-Sol) → add degrees one at a time → full diatonic → chromatic → minor → random keys → Sequences.

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
