export type NavRoute = 
  | 'home'
  | 'research'
  | 'deep-research'
  | 'library'
  | 'uploads'
  | 'settings-providers';

export type ResearchMode = 'quick' | 'web' | 'deep';

export interface ResearchModeOption {
  id: ResearchMode;
  label: string;
  description: string;
  iconName: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'OpenRouter';
  tag?: string;
}

export interface RecentResearchItem {
  id: string;
  title: string;
  category?: string;
  timestamp: string;
  citationsCount: number;
  mode: ResearchMode;
}
