# DoReMingo 🦩

A cheerful browser game that trains your ear to recognise notes — no musical education required.

**Play it: <https://www.codeme.lt/doremingo/>**

Grounded in functional ear training (Kodály movable-do tradition): a cadence establishes the key, you identify the scale degree (Do, Re, Mi…), and every answer ends with the note walking home to Do. Twelve levels from the tonic triad to chromatic colour notes, minor mode, random keys and short melodies. Progress saves in your browser.

Share a level directly: <https://www.codeme.lt/doremingo/#/level/5> · tutorial: <https://www.codeme.lt/doremingo/#/tutorial>

## Development

No build step, no dependencies — vanilla HTML/CSS/JS with native ES modules. Serve the repo root with any static server:

```sh
ruby -rwebrick -e's=WEBrick::HTTPServer.new(:Port => 5555, :DocumentRoot => Dir.pwd).start'
```

Tests (theory core and quiz engine) run on Node's built-in runner:

```sh
node --test 'test/**/*.test.mjs'
```

Domain language lives in [CONTEXT.md](CONTEXT.md); the methodology decision is recorded in [docs/adr/0001](docs/adr/0001-functional-ear-training-not-intervals-or-absolute-pitch.md).

## Credits

Piano samples from the [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm (CC-BY 3.0), via the [Tone.js audio collection](https://tonejs.github.io/audio/salamander/).
