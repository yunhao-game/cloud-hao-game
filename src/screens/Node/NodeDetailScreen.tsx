import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapNode, MapNodeType } from '../../types';
import { getNodeDisplayInfo } from '../../game/map';

interface NodeDetailScreenProps {
  node: MapNode;
  onComplete: () => void;
  gold: number;
}

export const NodeDetailScreen: React.FC<NodeDetailScreenProps> = ({
  node,
  onComplete,
  gold,
}) => {
  const info = getNodeDisplayInfo(node.type);

  // 获取节点功能描述
  const getNodeDescription = () => {
    switch (node.type) {
      case 'shop':
        return '🏪 购买强力英雄，提升你的队伍！';
      case 'campfire':
        return '🔥 休息并恢复状态';
      case 'event':
        return '❓ 神秘事件，可能有惊喜或挑战';
      case 'elite':
        return '👹👹 强大的精英敌人，击败后有丰厚奖励！';
      case 'boss':
        return '💀 最终Boss！击败它即可通关！';
      default:
        return '⚔️ 战斗开始！';
    }
  };

  // 获取节点奖励描述
  const getRewardDescription = () => {
    switch (node.type) {
      case 'shop':
        return '💰 花费金币购买英雄';
      case 'campfire':
        return '❤️ 恢复50%最大生命值';
      case 'event':
        return '🎁 随机获得10-30金币或道具';
      case 'elite':
        return '💰 胜利获得20金币';
      case 'boss':
        return '💰 胜利获得100金币';
      default:
        return '';
    }
  };

  // 获取按钮文本
  const getButtonText = () => {
    switch (node.type) {
      case 'shop':
        return '💰 进入商店';
      case 'campfire':
        return '🔥 休息恢复';
      case 'event':
        return '❓ 触发事件';
      case 'elite':
        return '⚔️ 战斗！';
      case 'boss':
        return '💀 挑战Boss！';
      default:
        return '开始';
    }
  };

  // 暂时用简单按钮替代实际功能
  const handleAction = () => {
    // 简单处理：直接完成任务
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.icon}>{info.icon}</Text>
        <Text style={styles.title}>{info.name}</Text>
      </View>

      {/* 内容 */}
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.description}>{getNodeDescription()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.rewardTitle}>📋 节点效果</Text>
          <Text style={styles.rewardText}>{getRewardDescription()}</Text>
        </View>

        {/* 金币显示 */}
        <View style={styles.goldContainer}>
          <Text style={styles.goldText}>💰 当前金币: {gold}</Text>
        </View>
      </View>

      {/* 按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: info.color }]}
          onPress={handleAction}
        >
          <Text style={styles.actionButtonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#16213e',
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  description: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  rewardTitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 10,
  },
  rewardText: {
    color: '#4ade80',
    fontSize: 16,
  },
  goldContainer: {
    alignItems: 'center',
    padding: 15,
  },
  goldText: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default NodeDetailScreen;