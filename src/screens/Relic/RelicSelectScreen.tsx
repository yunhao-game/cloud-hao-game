import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RelicSelectScreenProps {
  currentLayer: number;
  maxLayer: number;
  onConfirm: () => void;
}

export const RelicSelectScreen: React.FC<RelicSelectScreenProps> = ({
  currentLayer,
  maxLayer,
  onConfirm,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎉 第 {currentLayer} 层通关！</Text>
        <Text style={styles.subtitle}>选择一件遗物作为奖励</Text>
      </View>

      {/* 遗物占位区域 */}
      <View style={styles.relicsContainer}>
        <View style={styles.relicCard}>
          <Text style={styles.relicIcon}>⬜</Text>
          <Text style={styles.relicName}>遗物占位</Text>
          <Text style={styles.relicDesc}>遗物系统开发中...</Text>
        </View>
        
        <View style={styles.relicCard}>
          <Text style={styles.relicIcon}>⬜</Text>
          <Text style={styles.relicName}>遗物占位</Text>
          <Text style={styles.relicDesc}>遗物系统开发中...</Text>
        </View>
        
        <View style={styles.relicCard}>
          <Text style={styles.relicIcon}>⬜</Text>
          <Text style={styles.relicName}>遗物占位</Text>
          <Text style={styles.relicDesc}>遗物系统开发中...</Text>
        </View>
      </View>

      {/* 进入下一层按钮 */}
      <TouchableOpacity 
        style={styles.confirmButton}
        onPress={onConfirm}
      >
        <Text style={styles.confirmButtonText}>
          {currentLayer >= maxLayer ? '🏆 游戏胜利！' : `进入第 ${currentLayer + 1} 层`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#ffd700',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
  },
  relicsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  relicCard: {
    width: SCREEN_WIDTH * 0.28,
    height: SCREEN_WIDTH * 0.4,
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4a4a6e',
  },
  relicIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  relicName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  relicDesc: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  confirmButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RelicSelectScreen;
