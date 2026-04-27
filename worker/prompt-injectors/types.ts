/**
 * Type definitions for the prompt injection system
 * Inspired by agentbase.me's extensible prompt architecture
 */

/**
 * Context provided to prompt injectors
 */
export interface PromptInjectorContext {
  /** User ID for fetching user-specific data */
  userId: string;

  /** Current character ID (e.g., 'iris', 'karl', 'mila') */
  activeCharacterId: string;

  /** Active quest ID if in quest mode */
  activeQuestId?: string;

  /** Current region */
  currentRegion: string;

  /** Session state for additional context */
  sessionState?: {
    active_character: string;
    active_quest?: string;
    current_region: string;
    active_voice_id: string;
  };

  /** Additional context data */
  [key: string]: any;
}

/**
 * Result returned by a prompt injector
 */
export interface PromptInjectorResult {
  /** The prompt content to inject */
  content: string;

  /** Priority for ordering (0-1, higher = earlier in prompt) */
  priority: number;

  /** Optional title for the section */
  title?: string;

  /** Whether this section is required (if false, can be omitted if empty) */
  required?: boolean;

  /** Optional tool filter to gate which tools are available */
  toolFilter?: {
    /** Allowlist — only these tools available */
    allow?: string[];
    /** Denylist — these tools removed */
    deny?: string[];
  };
}

/**
 * Configuration for prompt injection
 */
export interface PromptInjectionConfig {
  /** List of injector IDs to enable (if undefined, all enabled by default) */
  enabledInjectors?: string[];

  /** List of injector IDs to disable */
  disabledInjectors?: string[];

  /** Whether to include section titles in output */
  includeTitles?: boolean;
}

/**
 * Base interface for prompt injectors
 */
export interface PromptInjector {
  /** Unique identifier for this injector */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Description of what this injector does */
  readonly description: string;

  /** Whether this injector is enabled by default */
  readonly enabledByDefault: boolean;

  /**
   * Check if this injector can run with the given context
   * @param context The prompt injector context
   * @returns true if this injector can run
   */
  canInject?(context: PromptInjectorContext): boolean | Promise<boolean>;

  /**
   * Inject prompt content
   * @param context The prompt injector context
   * @returns The prompt result, or null to skip injection
   */
  inject(context: PromptInjectorContext): Promise<PromptInjectorResult | null>;
}
