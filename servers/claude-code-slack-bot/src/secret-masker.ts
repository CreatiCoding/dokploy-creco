const SECRET_ENV_KEYWORDS = ['TOKEN', 'SECRET', 'KEY', 'PASSWORD', 'CREDENTIAL', 'API_KEY'];

const SECRET_PATTERNS: RegExp[] = [
  /xoxb-[A-Za-z0-9\-]+/g,          // Slack bot token
  /xapp-[A-Za-z0-9\-]+/g,          // Slack app token
  /xoxp-[A-Za-z0-9\-]+/g,          // Slack user token
  /xoxs-[A-Za-z0-9\-]+/g,          // Slack session token
  /sk-ant-[A-Za-z0-9\-]+/g,        // Anthropic API key (longer prefix first)
  /sk-[A-Za-z0-9]{20,}/g,          // OpenAI/Anthropic API key
  /ghp_[A-Za-z0-9]{36,}/g,         // GitHub PAT
  /ghs_[A-Za-z0-9]{36,}/g,         // GitHub App token
  /gho_[A-Za-z0-9]{36,}/g,         // GitHub OAuth token
  /github_pat_[A-Za-z0-9_]{20,}/g, // GitHub fine-grained PAT
  /glpat-[A-Za-z0-9\-]{20,}/g,     // GitLab PAT
  /Bearer\s+[A-Za-z0-9._\-]{20,}/g, // Bearer token
  /Basic\s+[A-Za-z0-9+/=]{20,}/g,  // Basic auth
];

function maskValue(value: string): string {
  if (value.length < 8) return '***';

  // Find a natural prefix (up to first separator or first 4 chars)
  const separatorMatch = value.match(/^([a-zA-Z_\-]+[-_])/);
  const prefix = separatorMatch ? separatorMatch[1] : value.substring(0, 4);
  const suffix = value.substring(value.length - 4);

  return `${prefix}...${suffix}`;
}

export class SecretMasker {
  private knownSecrets: Array<{ value: string; masked: string }> = [];

  constructor() {
    this.collectEnvSecrets();
  }

  private collectEnvSecrets() {
    for (const [key, value] of Object.entries(process.env)) {
      if (!value || value.length < 8) continue;

      const isSecret = SECRET_ENV_KEYWORDS.some(keyword =>
        key.toUpperCase().includes(keyword)
      );

      if (isSecret) {
        this.knownSecrets.push({
          value,
          masked: maskValue(value),
        });
      }
    }

    // Sort by length descending to match longer secrets first
    this.knownSecrets.sort((a, b) => b.value.length - a.value.length);
  }

  maskText(text: string): string {
    if (!text) return text;

    let masked = text;

    // 1. Replace known env var secret values (longer first)
    for (const secret of this.knownSecrets) {
      if (masked.includes(secret.value)) {
        masked = masked.split(secret.value).join(secret.masked);
      }
    }

    // 2. Apply pattern-based detection for remaining secrets
    for (const pattern of SECRET_PATTERNS) {
      // Reset lastIndex for global regexps
      pattern.lastIndex = 0;
      masked = masked.replace(pattern, (match) => maskValue(match));
    }

    return masked;
  }
}
