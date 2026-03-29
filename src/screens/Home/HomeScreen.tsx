import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { heroes } from '../../data/heroes';

interface HomeScreenProps {
  onStartGame: () => void;
  onViewHeroes: () => void;
  onContinueGame: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartGame,
  onViewHeroes,
  onContinueGame,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 标题 */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>☁️🦊</Text>
          <Text style={styles.titleText}>云和皓的第一个游戏</Text>
          <Text style={styles.subtitle}>自走棋爬塔</Text>
        </View>

        {/* 英雄展示 */}
        <View style={styles.heroPreview}>
          <Text style={styles.sectionTitle}>可用英雄 ({heroes.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.heroRow}>
              {heroes.slice(0, 8).map((hero) => (
                <View key={hero.id} style={styles.heroCard}>
                  <Text style={styles.heroEmoji}>
                    {hero.faction === 'fire' && '🔥'}
                    {hero.faction === 'water' && '❄️'}
                    {hero.faction === 'wood' && '🌿'}
                    {hero.faction === 'earth' && '⚔️'}
                    {hero.faction === 'wind' && '🌪️'}
                    {hero.faction === 'arcane' && '🔮'}
                    {hero.faction === 'light' && '🛡️'}
                    {hero.faction === 'dark' && '🌑'}
                    {hero.faction === 'thunder' && '⚡'}
                    {hero.faction === 'dragon' && '🐉'}
                    {hero.faction === 'ranger' && '🏹'}
                    {hero.faction === 'mage' && '🧙'}
                    {hero.faction === 'undead' && '💀'}
                    {hero.faction === 'sea' && '🌊'}
                    {hero.faction === 'mountain' && '🏔️'}
                  </Text>
                  <Text style={styles.heroName}>{hero.name}</Text>
                  <Text style={styles.heroCost}>💰{hero.cost}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 按钮 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.startButton} onPress={onStartGame}>
            <Text style={styles.startButtonText}>开始新游戏</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onContinueGame}>
            <Text style={styles.secondaryButtonText}>继续游戏</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onViewHeroes}>
            <Text style={styles.secondaryButtonText}>查看所有英雄</Text>
          </TouchableOpacity>
        </View>

        {/* 版权 */}
        <Text style={styles.footer}>Made with ❤️ by 云 & 皓</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 60,
    marginBottom: 10,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
    marginTop: 5,
  },
  heroPreview: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: 80,
  },
  heroEmoji: {
    fontSize: 28,
  },
  heroName: {
    fontSize: 10,
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
  },
  heroCost: {
    fontSize: 10,
    color: '#ffd700',
    marginTop: 2,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  footer: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 'auto',
  },
});

export default HomeScreen;
