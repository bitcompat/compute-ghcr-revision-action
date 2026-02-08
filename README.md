# Compute GHCR revision tag

GitHub Action to compute the next `-rN` tag for a GHCR container image, based on an app version and Debian codename.

**Inputs**
- `version` (required): App version like `1.2` or `1.2.3`.
- `debian_codename` (required): Debian codename like `bookworm`.
- `image_name` (optional): GHCR package name, defaults to repository name. Supports subpaths like `tools/myapp`.
- `major_only_tag` (optional): If `true`, include the plain major tag (e.g. `1`). Default `false`.
- `github_token` (optional): GitHub token, defaults to `github.token`.

**Outputs**
- `tag`: Full tag with revision (e.g. `1.2.3-bookworm-r7`).
- `base`: Base string used for revision (e.g. `1.2.3-bookworm`).
- `revision`: Next revision number (e.g. `7`).
- `tags`: All suggested tags (newline-separated).
- `tags_json`: All suggested tags as JSON array.

**Example**
```yaml
name: Build
on:
  push:
    tags:
      - 'v*'

jobs:
  compute-tag:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read
    steps:
      - uses: actions/checkout@v4
      - id: tag
        uses: bitcompat/compute-ghcr-revision-action@v1
        with:
          version: 1.2.3
          debian_codename: bookworm
          image_name: tools/myapp
          major_only_tag: true
      - run: echo "Tags: ${{ steps.tag.outputs.tags }}"
```
