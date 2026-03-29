import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { GameMap, MapNode } from '../../types';
import { getAvailableNodes, getNodeDisplayInfo } from '../../game/map';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 安全的垂直分层地图
interface MapScreenProps {
  gameMap: GameMap;
  currentLayer?: number;  // 当前地图层数（1-4）
  onNodeSelect: (node: MapNode) => void;
  onBack: () => void;
  onGoHome: () => void;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  gameMap,
  currentLayer = 1,
  onNodeSelect,
  onBack,
  onGoHome,
}) => {
  const [map, setMap] = useState<GameMap>(gameMap);

  // 同步外部gameMap变化
  useEffect(() => {
    if (gameMap && gameMap.floors && gameMap.floors.length > 0) {
      setMap(gameMap);
    }
  }, [gameMap]);

  // 安全获取可点击的节点
  const getSafeAvailableNodes = (): MapNode[] => {
    try {
      if (!map || !map.floors || map.floors.length === 0) return [];
      return getAvailableNodes(map);
    } catch (e) {
      console.log('getAvailableNodes error:', e);
      return [];
    }
  };

  const availableNodes = getSafeAvailableNodes();

  // 安全检查节点是否可点击
  const isNodeAvailable = (nodeId: string): boolean => {
    try {
      return availableNodes.some(n => n && n.id === nodeId);
    } catch (e) {
      return false;
    }
  };

  // 安全检查节点是否已清除
  const isNodeCleared = (nodeId: string): boolean => {
    try {
      if (!map || !map.floors) return false;
      for (const floor of map.floors) {
        if (!floor || !floor.nodes) continue;
        const node = floor.nodes.find(n => n && n.id === nodeId);
        if (node) return node.cleared || false;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // 安全检查是否是当前节点
  const isCurrentNode = (nodeId: string): boolean => {
    try {
      return map.currentNodeId === nodeId;
    } catch (e) {
      return false;
    }
  };

  // 处理节点点击
  const handleNodePress = (node: MapNode) => {
    if (!node || !node.id) return;
    if (!isNodeAvailable(node.id)) return;
    onNodeSelect(node);
  };

  // 安全的节点位置计算
  const calculateNodePositions = (): { [key: string]: { x: number, y: number } } => {
    const positions: { [key: string]: { x: number, y: number } } = {};
    
    try {
      if (!map || !map.floors || map.floors.length === 0) {
        return positions;
      }
      
      const totalFloors = map.floors.length;
      const floorHeight = 100;
      
      // 计算Y坐标
      const floorY: number[] = [];
      for (let i = 0; i < totalFloors; i++) {
        floorY.push((totalFloors - 1 - i) * floorHeight + 60);
      }
      
      // 从上到下计算每层节点位置
      for (let floorIndex = 0; floorIndex < totalFloors; floorIndex++) {
        const floor = map.floors[floorIndex];
        if (!floor || !floor.nodes || floor.nodes.length === 0) continue;
        
        const nodeCount = floor.nodes.length;
        const layerPositions: number[] = [];
        
        if (floorIndex === 0) {
          // 第一层：居中
          if (nodeCount === 1) {
            layerPositions.push(SCREEN_WIDTH / 2);
          } else {
            const margin = 60;
            const available = SCREEN_WIDTH - margin * 2;
            for (let i = 0; i < nodeCount; i++) {
              layerPositions.push(margin + (available / (nodeCount - 1)) * i);
            }
          }
        } else {
          // 后续层：均匀分布
          const margin = 60;
          const available = SCREEN_WIDTH - margin * 2;
          for (let i = 0; i < nodeCount; i++) {
            layerPositions.push(margin + (available / (nodeCount + 1)) * (i + 1));
          }
        }
        
        // 保存位置
        for (let i = 0; i < floor.nodes.length; i++) {
          const node = floor.nodes[i];
          if (node && node.id) {
            positions[node.id] = { 
              x: layerPositions[i] || SCREEN_WIDTH / 2, 
              y: floorY[floorIndex] 
            };
          }
        }
      }
    } catch (e) {
      console.log('calculateNodePositions error:', e);
    }
    
    return positions;
  };

  // 安全获取节点位置
  const nodePositions = React.useMemo(() => {
    return calculateNodePositions();
  }, [map.floors]);

  // 计算地图内容高度
  const mapContentHeight = map && map.floors ? map.floors.length * 100 + 120 : 500;

  // 渲染连线
  const renderConnections = () => {
    const lines: React.JSX.Element[] = [];
    
    try {
      if (!map || !map.floors || map.floors.length === 0) return lines;
      
      for (let floorIndex = 0; floorIndex < map.floors.length - 1; floorIndex++) {
        const currentFloor = map.floors[floorIndex];
        if (!currentFloor || !currentFloor.connections || !currentFloor.nodes) continue;
        
        for (const conn of currentFloor.connections) {
          if (!conn || !conn.from || !conn.to) continue;
          
          const fromPos = nodePositions[conn.from];
          const toPos = nodePositions[conn.to];
          
          if (!fromPos || !toPos) continue;
          
          const fromCleared = isNodeCleared(conn.from);
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          
          // 统一白色显示连接线
          const lineColor = fromCleared ? '#4ade80' : '#FFFFFF';
          
          lines.push(
            <View
              key={`${conn.from}-${conn.to}`}
              style={[
                styles.connectionLine,
                {
                  left: fromPos.x,
                  top: fromPos.y,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                  backgroundColor: lineColor,
                },
              ]}
            />
          );
        }
      }
    } catch (e) {
      console.log('renderConnections error:', e);
    }
    
    return lines;
  };

  // 渲染单个节点
  const renderNode = (node: MapNode, floorIndex: number) => {
    if (!node || !node.id || !node.type) return null;
    
    const canClick = isNodeAvailable(node.id);
    const isCleared = isNodeCleared(node.id);
    const isCurrent = isCurrentNode(node.id);
    const info = getNodeDisplayInfo(node.type);
    const position = nodePositions[node.id];
    
    if (!position) return null;

    let backgroundColor = info.color;
    let opacity = 1;
    
    if (isCleared) {
      backgroundColor = '#333';
      opacity = 0.8;
    } else if (!canClick) {
      opacity = 0.3;
    }

    return (
      <TouchableOpacity
        key={node.id}
        style={[
          styles.node,
          {
            left: position.x - 15,
            top: position.y - 15,
            backgroundColor,
            opacity,
            borderColor: isCurrent ? '#fff' : isCleared ? '#4ade80' : '#444',
            borderWidth: isCurrent ? 2 : 1,
          },
        ]}
        onPress={() => handleNodePress(node)}
        disabled={!canClick}
      >
        <Text style={styles.nodeIcon}>{info.icon}</Text>
        {isCleared && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // 渲染层级标签
  const renderFloorLabels = () => {
    const labels: React.JSX.Element[] = [];
    
    try {
      if (!map || !map.floors) return labels;
      
      for (let floorIndex = 0; floorIndex < map.floors.length; floorIndex++) {
        const floor = map.floors[floorIndex];
        if (!floor) continue;
        
        const floorHeight = 100;
        const totalFloors = map.floors.length;
        const y = (totalFloors - 1 - floorIndex) * floorHeight + 60;
        
        labels.push(
          <View
            key={`label-${floorIndex}`}
            style={[styles.floorLabel, { left: 10, top: y - 5 }]}
          >
            <Text style={styles.floorLabelText}>
              {floor.isBossFloor ? 'BOSS' : `${floor.floorNumber}层`}
            </Text>
          </View>
        );
      }
    } catch (e) {
      console.log('renderFloorLabels error:', e);
    }
    
    return labels;
  };

  return (
    <View style={styles.container}>
      {/* 顶部信息 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoHome}>
          <Text style={styles.backText}>← 退出</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🗺️ 第 {currentLayer} 张地图</Text>
        <Text style={styles.goldText}>💰{map?.gold || 0}</Text>
      </View>

      {/* 图例 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}><Text style={styles.legendIcon}>👹</Text><Text style={styles.legendText}>战斗</Text></View>
        <View style={styles.legendItem}><Text style={styles.legendIcon}>🏪</Text><Text style={styles.legendText}>商店</Text></View>
        <View style={styles.legendItem}><Text style={styles.legendIcon}>🔥</Text><Text style={styles.legendText}>篝火</Text></View>
        <View style={styles.legendItem}><Text style={styles.legendIcon}>❓</Text><Text style={styles.legendText}>事件</Text></View>
        <View style={styles.legendItem}><Text style={styles.legendIcon}>💀</Text><Text style={styles.legendText}>Boss</Text></View>
      </View>

      {/* 地图区域 */}
      <ScrollView 
        style={styles.mapScroll}
        contentContainerStyle={[styles.mapContent, { minHeight: mapContentHeight }]}
      >
        <View style={styles.treeContainer}>
          {renderFloorLabels()}
          {renderConnections()}
          {map && map.floors && map.floors.map((floor, floorIndex) => 
            floor && floor.nodes && floor.nodes.map(node => renderNode(node, floorIndex))
          )}
        </View>
      </ScrollView>

      {/* 提示 */}
      <View style={styles.hint}>
        <Text style={styles.hintText}>
          {availableNodes.length > 0 ? '👆 点击可选择的节点继续前进' : '完成当前节点后继续'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a15' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#1a1a2e' },
  backText: { color: '#e94560', fontSize: 16, fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  goldText: { color: '#ffd700', fontSize: 18, fontWeight: 'bold' },
  legend: { flexDirection: 'row', justifyContent: 'center', padding: 10, backgroundColor: '#1a1a2e', gap: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendIcon: { fontSize: 14 },
  legendText: { color: '#aaa', fontSize: 12 },
  mapScroll: { flex: 1 },
  mapContent: { minHeight: 500 },
  treeContainer: { position: 'relative', minHeight: 500 },
  floorLabel: { position: 'absolute', width: 50, height: 25, justifyContent: 'center' },
  floorLabelText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  node: { position: 'absolute', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' },
  nodeIcon: { fontSize: 14 },
  checkmark: { position: 'absolute', top: -8, right: -8, backgroundColor: '#4ade80', borderRadius: 8, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
  checkmarkText: { color: '#000', fontSize: 8, fontWeight: 'bold' },
  connectionLine: { position: 'absolute', height: 1.5, borderRadius: 1, transformOrigin: 'left center' },
  hint: { padding: 15, backgroundColor: '#1a1a2e' },
  hintText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
});

export default MapScreen;