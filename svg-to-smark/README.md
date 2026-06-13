# svg-to-smark

A browser tool that converts SVG markup into [SomMark](https://github.com/Adam-Elmi/SomMark) syntax.

---

## Build

The layout is split into SomMark components under `components/`. After editing them, rebuild `index.html` with the SomMark CLI:

```bash
sommark --html components/layout.smark -o index.html ./
```

---

## Usage

Must be served over HTTP — `file://` will not work.

```bash
npx serve .
```

Then open `http://localhost:3000`.

### Paste SVG

Paste raw `<svg>` markup into the textarea and click **Convert**.

### Iconify icons

Click **Collections** to browse the Iconify library, or type `collection/icon-name` (e.g. `mdi/home`) in the input and click **Fetch**.

---

## License

MIT
