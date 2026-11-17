## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Brand & design

Visual reference and original tokens live in `design-system-claude/`. The live site implements that brand with Tailwind v4 `@theme` tokens in `src/styles/global.css` — do not import the React design-system bundle into pages.

## Markup gotcha: spaces around inline links

In `.astro` templates, a line break between text and an inline element (`<a>`, `<strong>`, `<em>`) is not rendered as a space. Wrapped text like `by emailing` then a new line then `<a href=...>` comes out as "emailing<a>" with no gap, and the same happens after the closing `</a>`. Write the space explicitly with `{' '}` at the end of the line before the link and after its closing tag, or keep the text and link on one line. After editing prose with links, check the built HTML (`.vercel/output/static/<page>/index.html`) for glued text like `emailing<a` or `</a>or`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
