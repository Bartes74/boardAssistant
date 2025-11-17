import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';

vi.mock('../../../hooks/useTopics', () => ({
  useTopics: () => ({
    data: [
      { id: 'topic-esg', title: 'Nowe regulacje ESG', topicStatus: 'growing', userScore: 1.2, pinned: false, hidden: false },
    ],
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useAssistant', () => ({
  useAssistantQuery: () => ({
    mutate: vi.fn(),
    data: {
      tldr: 'To jest podsumowanie tygodnia.',
      events: ['2025-11-17 – Aktualizacja regulacji'],
      articles: [],
      actions: [],
    },
  }),
}));

describe('DashboardPage', () => {
  it('renders TLDR and topics', () => {
    render(<DashboardPage />);
    expect(screen.getByText('TL;DR tygodnia')).toBeInTheDocument();
    expect(screen.getByText('Nowe regulacje ESG')).toBeInTheDocument();
  });
});
