import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ==================== DOMAIN LAYER ====================

// Entité CharacterStat
class CharacterStat {
  constructor(char) {
    this.char = char;
    this.attempts = 0;
    this.errors = 0;
  }

  getErrorRate() {
    return this.attempts === 0 ? 0 : this.errors / this.attempts;
  }

  recordAttempt(isError) {
    this.attempts++;
    if (isError) this.errors++;
  }
}

// Interface AdaptiveStrategy
class AdaptiveStrategy {
  nextCharacter(stats) {
    throw new Error('Method not implemented');
  }
}

// Implémentation WeightedRandomStrategy
class WeightedRandomStrategy extends AdaptiveStrategy {
  nextCharacter(stats) {
    if (stats.length === 0) return null;

    // Calcul des poids
    const weights = stats.map(stat => {
      const errorRate = stat.getErrorRate();
      return errorRate + 0.1; // +0.1 pour éviter les poids nuls
    });

    // Somme totale des poids
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Tirage aléatoire pondéré
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < stats.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return stats[i].char;
      }
    }

    return stats[stats.length - 1].char;
  }
}

// ==================== APPLICATION LAYER ====================

// État global de l'application
class AppState {
  constructor(characters) {
    this.characters = characters.split('').map(char => new CharacterStat(char));
    this.currentChar = null;
    this.totalCorrect = 0;
    this.totalErrors = 0;
  }

  getCharacterStats() {
    return this.characters;
  }

  updateStats(char, isError) {
    const stat = this.characters.find(s => s.char === char);
    if (stat) {
      stat.recordAttempt(isError);
      if (isError) {
        this.totalErrors++;
      } else {
        this.totalCorrect++;
      }
    }
  }

  setCurrentChar(char) {
    this.currentChar = char;
  }

  getGlobalErrorRate() {
    const total = this.totalCorrect + this.totalErrors;
    return total === 0 ? 0 : (this.totalErrors / total * 100).toFixed(1);
  }
}

// Moteur adaptatif
class AdaptiveEngine {
  constructor(appState, strategy) {
    this.appState = appState;
    this.strategy = strategy;
  }

  getNextCharacter() {
    const stats = this.appState.getCharacterStats();
    const nextChar = this.strategy.nextCharacter(stats);
    this.appState.setCurrentChar(nextChar);
    return nextChar;
  }

  recordResult(char, isError) {
    this.appState.updateStats(char, isError);
  }
}

// ==================== UI LAYER (REACT) ====================

export default function AdaptiveKeyboardTrainer() {
  const [appState] = useState(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return new AppState(chars);
  });

  const [engine] = useState(() => {
    const strategy = new WeightedRandomStrategy();
    return new AdaptiveEngine(appState, strategy);
  });

  const [currentChar, setCurrentChar] = useState('');
  const [feedback, setFeedback] = useState('');
  const [stats, setStats] = useState({
    totalCorrect: 0,
    totalErrors: 0,
    errorRate: 0
  });
  const [chartData, setChartData] = useState([]);
  const [lastKey, setLastKey] = useState('');

  // Initialisation
  useEffect(() => {
    const nextChar = engine.getNextCharacter();
    setCurrentChar(nextChar);
  }, [engine]);

  // Mise à jour des statistiques pour le graphique
  const updateChartData = useCallback(() => {
    const data = appState.getCharacterStats()
      .filter(stat => stat.attempts > 0)
      .map(stat => ({
        char: stat.char,
        errorRate: (stat.getErrorRate() * 100).toFixed(1),
        attempts: stat.attempts
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);
    
    setChartData(data);
  }, [appState]);

  // Gestion des frappes clavier
  useEffect(() => {
    const handleKeyPress = (e) => {
      const key = e.key.toLowerCase();
      setLastKey(key);

      if (key === currentChar) {
        // Succès
        engine.recordResult(currentChar, false);
        setFeedback('✓ Correct');
        
        // Mise à jour des stats
        setStats({
          totalCorrect: appState.totalCorrect,
          totalErrors: appState.totalErrors,
          errorRate: appState.getGlobalErrorRate()
        });

        // Prochain caractère
        setTimeout(() => {
          const nextChar = engine.getNextCharacter();
          setCurrentChar(nextChar);
          setFeedback('');
          updateChartData();
        }, 200);
      } else if (key.length === 1 && key.match(/[a-z]/)) {
        // Erreur (seulement pour les lettres)
        engine.recordResult(currentChar, true);
        setFeedback('✗ Erreur');
        
        setStats({
          totalCorrect: appState.totalCorrect,
          totalErrors: appState.totalErrors,
          errorRate: appState.getGlobalErrorRate()
        });

        setTimeout(() => {
          setFeedback('');
          updateChartData();
        }, 500);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [currentChar, engine, appState, updateChartData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* En-tête */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Entraînement Adaptatif au Clavier
          </h1>
          <p className="text-purple-200">
            L'algorithme s'adapte à vos erreurs pour vous faire progresser
          </p>
        </div>

        {/* Zone de frappe principale */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border border-white/20">
          <div className="text-center space-y-8">
            <div className="text-sm text-purple-200 uppercase tracking-wider">
              Tapez ce caractère
            </div>
            
            <div className="relative">
              <div className="text-9xl font-bold text-white animate-pulse">
                {currentChar}
              </div>
              {feedback && (
                <div className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-2xl font-bold ${
                  feedback.includes('✓') ? 'text-green-400' : 'text-red-400'
                }`}>
                  {feedback}
                </div>
              )}
            </div>

            {lastKey && (
              <div className="text-purple-300 text-sm">
                Dernière touche : <span className="font-mono font-bold">{lastKey}</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-500/20 backdrop-blur-lg rounded-xl p-4 border border-green-500/30">
            <div className="text-green-300 text-sm uppercase tracking-wider mb-1">
              Correct
            </div>
            <div className="text-3xl font-bold text-white">
              {stats.totalCorrect}
            </div>
          </div>

          <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-500/30">
            <div className="text-red-300 text-sm uppercase tracking-wider mb-1">
              Erreurs
            </div>
            <div className="text-3xl font-bold text-white">
              {stats.totalErrors}
            </div>
          </div>

          <div className="bg-purple-500/20 backdrop-blur-lg rounded-xl p-4 border border-purple-500/30">
            <div className="text-purple-300 text-sm uppercase tracking-wider mb-1">
              Taux d'erreur
            </div>
            <div className="text-3xl font-bold text-white">
              {stats.errorRate}%
            </div>
          </div>
        </div>

        {/* Graphique des caractères difficiles */}
        {chartData.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">
              Top 10 - Caractères avec le plus d'erreurs
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="char" stroke="#e9d5ff" />
                <YAxis stroke="#e9d5ff" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="errorRate" fill="#a78bfa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-purple-200 text-sm">
          💡 L'algorithme propose plus souvent les caractères où vous faites des erreurs
        </div>
      </div>
    </div>
  );
}
