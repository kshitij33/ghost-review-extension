> 🌐 **Website**: [ghost-review-kappa.vercel.app](https://ghost-review-kappa.vercel.app/)

# GhostReview

> AI code review that remembers your mistakes so you don't repeat them.

**5 free reviews. No signup. No API key. Just install and click Review.**

## Try it in 30 seconds

1. Install the extension
2. Open any git repo with uncommitted changes
3. Click the 👻 ghost icon in your activity bar
4. Click **Review →**

That's it. Your first 5 reviews are free — no account, no API key, nothing to configure.

## Three personas, one diff

- **💀 Brutal Architect** — tears apart your architectural decisions
- **⚡ Startup Velocity** — separates blockers from bikeshedding
- **🔒 Security Paranoid** — finds vulnerabilities before your users do

## Track your patterns over time

Connect the dashboard to save your reviews. After 3+ reviews, run pattern analysis to see your recurring mistakes — security habits, maintainability issues, correctness gaps that show up again and again in your code.

## When you want more

- Add your own free Groq key for unlimited reviews
- Connect the [GhostReview dashboard](https://ghost-review-dashboard.vercel.app) for history and pattern tracking
- Both are optional. Try the free tier first.

## Privacy

- **Free tier:** your diff is sent to GhostReview servers to generate the review. Not stored against your account.
- **Groq key path:** reviews run entirely on your machine. Nothing sent to our servers.
- **Dashboard path:** diff and review content saved to your account.

## Extension Settings

| Setting | Description | Default |
|---|---|---|
| `ghostreview.groqApiKey` | Your Groq API key (optional) | `""` |
| `ghostreview.defaultPersona` | Default reviewer persona | `brutal` |

## Telemetry

GhostReview collects anonymous usage data to help improve the extension. No personal information, code, or review content is ever collected. Telemetry respects your VSCode telemetry settings. To disable: set `telemetry.telemetryLevel` to `"off"`.

## Release Notes

### 0.1.8
- Improved onboarding — free tier now clearly surfaced
- Fixed misleading error messages
- Better first-run experience

### 0.1.0
Initial release.
