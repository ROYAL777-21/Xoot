# Xoot Gemini CLI extension — release candidate

This folder is a standalone Google Gemini CLI extension; it is NOT yet published.

Distribution requires a **separate public repository** with `gemini-extension.json` at its repository root, or a self-contained release archive. After Xoot's production MCP + OAuth connection works, publish ONLY this folder's approved contents to the public extension repository, set its GitHub topic `gemini-cli-extension`, and Gemini CLI's gallery crawler can index it after validation.

Users can then run `gemini extensions install <public-repo-url>`. Do not publish Xoot's private application repository or its backend/secrets.

Official guide: https://geminicli.com/docs/extensions/releasing/
