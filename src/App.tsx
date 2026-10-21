import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { ResearchPage } from './pages/ResearchPage';
import { DeepResearchPage } from './pages/DeepResearchPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { LibraryPage } from './pages/LibraryPage';
import { UploadsPage } from './pages/UploadsPage';
import { NavRoute, ResearchMode } from './types/navigation';
import { conversationService } from './services/conversation/conversationService';

function AppContent() {
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('home');
  const [activeResearchId, setActiveResearchId] = useState<string>('');
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>('');

  useEffect(() => {
    async function loadActive() {
      const activeId = await conversationService.getActiveConversationId();
      if (activeId) {
        setActiveResearchId(activeId);
        const convo = await conversationService.get(activeId);
        if (convo) {
          setCurrentQuery(convo.initialQuery || convo.title);
          setCurrentModel(convo.modelId);
        }
      }
    }
    loadActive();
  }, []);

  const handleStartResearch = async (query: string, mode: ResearchMode, model: string) => {
    setCurrentQuery(query);
    setCurrentModel(model);
    try {
      const created = await conversationService.create(query, mode, model);
      setActiveResearchId(created.id);
      if (mode === 'deep') {
        setCurrentRoute('deep-research');
      } else {
        setCurrentRoute('research');
      }
    } catch {
      if (mode === 'deep') {
        setCurrentRoute('deep-research');
      } else {
        setCurrentRoute('research');
      }
    }
  };

  const handleOpenResearchItem = async (id: string) => {
    setActiveResearchId(id);
    await conversationService.setActiveConversationId(id);
    const convo = await conversationService.get(id);
    if (convo) {
      setCurrentQuery(convo.initialQuery || convo.title);
      setCurrentModel(convo.modelId);
      if (convo.mode === 'deep') {
        setCurrentRoute('deep-research');
      } else {
        setCurrentRoute('research');
      }
    } else {
      setCurrentRoute('research');
    }
  };

  return (
    <AppShell
      currentRoute={currentRoute}
      onRouteChange={(route) => setCurrentRoute(route)}
      onOpenResearchItem={handleOpenResearchItem}
      onExecuteSearch={(query, mode) =>
        handleStartResearch(query, mode, currentModel || 'gemini-2.5-flash')
      }
    >
      {currentRoute === 'home' && (
        <HomePage
          onStartResearch={handleStartResearch}
          onNavigate={(route) => setCurrentRoute(route)}
          onOpenItem={handleOpenResearchItem}
        />
      )}

      {currentRoute === 'research' && (
        <ResearchPage
          conversationId={activeResearchId}
          initialQuery={currentQuery}
          initialModel={currentModel}
          onNavigate={(route) => setCurrentRoute(route)}
          onNewSearch={(q) => setCurrentQuery(q)}
          onConversationChange={(id) => setActiveResearchId(id)}
        />
      )}

      {currentRoute === 'deep-research' && (
        <DeepResearchPage
          initialQuery={currentQuery}
          initialModel={currentModel}
        />
      )}

      {currentRoute === 'settings-providers' && <ProvidersPage />}

      {currentRoute === 'library' && (
        <LibraryPage onOpenItem={handleOpenResearchItem} />
      )}

      {currentRoute === 'uploads' && <UploadsPage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
        <Analytics />
      </AuthProvider>
    </ThemeProvider>
  );
}
