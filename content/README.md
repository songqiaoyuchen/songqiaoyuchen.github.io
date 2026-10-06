# content

Blog articles as MDX: one folder per article, `content/<lowercase-hyphenated-slug>/index.mdx`, exporting
an `article` record (`lib/content/types.ts`). Folders whose names are not valid slugs (such as
`_placeholder`) are skipped. MDX components: `mdx-components.tsx` and `components/blog/`.

| Folder | Purpose |
| --- | --- |
| `_placeholder/` | Unpublished template article |
