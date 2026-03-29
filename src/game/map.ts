import { 
  GameMap, 
  MapFloor, 
  MapNode, 
  MapConnection, 
  MapNodeType,
  Hero 
} from '../types';
import { heroes } from '../data/heroes';

// 生成唯一ID
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 节点类型分布（按层）
const getNodeTypeForFloor = (floorIndex: number, totalFloors: number): MapNodeType => {
  // 第一层固定是战斗节点
  if (floorIndex === 0) return 'monster';
  // 最后一层固定是Boss
  if (floorIndex === totalFloors - 1) return 'boss';
  // 倒数第二层固定是篝火（让玩家休整后打Boss）
  if (floorIndex === totalFloors - 2) return 'campfire';
  
  // 中间层随机
  const rand = Math.random();
  if (rand < 0.50) return 'monster';      // 50% 普通怪
  if (rand < 0.65) return 'elite';         // 15% 精英
  if (rand < 0.75) return 'shop';          // 10% 商店
  if (rand < 0.88) return 'campfire';      // 13% 篝火
  return 'event';                          // 12% 事件
};

// =============================================================================
// 旧版地图生成（注释掉，保留参考）
// =============================================================================
// 生成完整地图（10层）
/*
export const generateMap = (): GameMap => {
  const totalFloors = 10;
  const floors: MapFloor[] = [];
  
  // 第一层：1个节点（战斗）
  // 中间层：3-5个节点
  // 最后一层：1个节点（Boss）
  
  for (let i = 0; i < totalFloors; i++) {
    let nodeCount: number;
    let isBossFloor = false;
    
    if (i === 0) {
      nodeCount = 1;  // 起始层1个节点
    } else if (i === totalFloors - 1) {
      nodeCount = 1;  // Boss层1个节点
      isBossFloor = true;
    } else {
      nodeCount = 3 + Math.floor(Math.random() * 3);  // 3-5个节点
    }
    
    // 创建节点
    const nodes: MapNode[] = [];
    const spacing = 100 / (nodeCount + 1);
    
    for (let j = 0; j < nodeCount; j++) {
      const type = isBossFloor ? 'boss' : getNodeTypeForFloor(i, totalFloors);
      nodes.push({
        id: generateId(),
        type,
        position: {
          x: spacing * (j + 1),
          y: i
        },
        visited: false,
        cleared: false,
      });
    }
    
    floors.push({
      floorNumber: i + 1,
      nodes,
      connections: [],
      isBossFloor,
    });
  }
  
  // 创建层间连接（无交叉、无断头路版本）
  for (let i = 0; i < floors.length - 1; i++) {
    const currentFloor = floors[i];
    const nextFloor = floors[i + 1];
    
    // 按x坐标排序节点
    const currentSorted = [...currentFloor.nodes].sort((a, b) => a.position.x - b.position.x);
    const nextSorted = [...nextFloor.nodes].sort((a, b) => a.position.x - b.position.x);
    
    // 记录每个下一层节点被连接的次数
    const connectionCount: Map<string, number> = new Map();
    nextSorted.forEach(n => connectionCount.set(n.id, 0));
    
    // 记录当前层每个节点连接到的下一层节点索引范围
    const nodeConnectRange: { minIdx: number; maxIdx: number }[] = [];
    
    // 对当前层每个节点生成连接
    for (let j = 0; j < currentSorted.length; j++) {
      // 找到左边节点连接的最右位置
      let startIdx = 0;
      if (j > 0 && nodeConnectRange.length > 0) {
        // 从左边节点的最右连接位置开始
        startIdx = nodeConnectRange[j - 1].maxIdx;
      }
      
      // 随机决定连接几个节点（1-3个，但不超过剩余节点数）
      const maxConnect = Math.min(3, nextSorted.length - startIdx);
      const connectCount = Math.max(1, Math.floor(Math.random() * maxConnect) + 1);
      
      // 连续连接节点（不跳过）
      const endIdx = Math.min(startIdx + connectCount, nextSorted.length) - 1;
      
      nodeConnectRange.push({ minIdx: startIdx, maxIdx: endIdx });
    }
    
    // 根据连接范围生成实际连接（白色 = 正常生成）
    const connections: MapConnection[] = [];
    for (let j = 0; j < currentSorted.length; j++) {
      const range = nodeConnectRange[j];
      for (let k = range.minIdx; k <= range.maxIdx; k++) {
        const targetNode = nextSorted[k];
        connections.push({
          from: currentSorted[j].id,
          to: targetNode.id,
          color: '#FFFFFF',  // 白色 = 正常生成
        });
        connectionCount.set(targetNode.id, (connectionCount.get(targetNode.id) || 0) + 1);
      }
    }
    
    // 检查是否有下一层节点未被连接（断头路）
    // 如果有，从当前层最近的节点连接过去（绿色 = 断头路修复）
    for (let k = 0; k < nextSorted.length; k++) {
      if (connectionCount.get(nextSorted[k].id) === 0) {
        // 找到当前层距离最近的节点
        const targetX = nextSorted[k].position.x;
        let nearestIdx = 0;
        let minDist = Infinity;
        
        for (let j = 0; j < currentSorted.length; j++) {
          const dist = Math.abs(currentSorted[j].position.x - targetX);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = j;
          }
        }
        
        // 扩展该节点的连接范围
        const range = nodeConnectRange[nearestIdx];
        const newMin = Math.min(range.minIdx, k);
        const newMax = Math.max(range.maxIdx, k);
        
        // 添加缺失的连接（保持连续）
        for (let idx = newMin; idx <= newMax; idx++) {
          const targetId = nextSorted[idx].id;
          const alreadyConnected = connections.some(
            c => c.from === currentSorted[nearestIdx].id && c.to === targetId
          );
          if (!alreadyConnected) {
            connections.push({
              from: currentSorted[nearestIdx].id,
              to: targetId,
              color: '#00FF00',  // 绿色 = 断头路修复
            });
            connectionCount.set(targetId, (connectionCount.get(targetId) || 0) + 1);
          }
        }
        
        // 更新连接范围
        nodeConnectRange[nearestIdx] = { minIdx: newMin, maxIdx: newMax };
      }
    }
    
    currentFloor.connections = connections;
  }
  
  // 验证并确保所有节点都能到达Boss（从后向前检查）
  // 红色 = Boss可达性修复
  for (let i = floors.length - 2; i >= 0; i--) {
    const currentFloor = floors[i];
    const nextFloor = floors[i + 1];
    
    // 获取下一层能到达Boss的节点
    const reachableNodes = new Set<string>();
    if (i === floors.length - 2) {
      // 下一层是Boss层，Boss节点可达
      nextFloor.nodes.forEach(n => reachableNodes.add(n.id));
    } else {
      // 从下一层的connections找哪些节点能连到下下层
      for (const conn of nextFloor.connections) {
        reachableNodes.add(conn.from);
      }
    }
    
    // 检查当前层的每个节点是否都能到达下一层的可达节点
    const currentSorted = [...currentFloor.nodes].sort((a, b) => a.position.x - b.position.x);
    
    for (const node of currentSorted) {
      const canReachBoss = currentFloor.connections
        .filter(c => c.from === node.id)
        .some(c => reachableNodes.has(c.to));
      
      if (!canReachBoss) {
        // 该节点无法到达Boss，需要修复
        // 找到最近的能到达Boss的下一层节点
        const reachableNextNodes = [...nextFloor.nodes]
          .filter(n => reachableNodes.has(n.id))
          .sort((a, b) => a.position.x - b.position.x);
        
        if (reachableNextNodes.length > 0) {
          // 找距离最近的
          let nearest = reachableNextNodes[0];
          let minDist = Infinity;
          for (const nextNode of reachableNextNodes) {
            const dist = Math.abs(node.position.x - nextNode.position.x);
            if (dist < minDist) {
              minDist = dist;
              nearest = nextNode;
            }
          }
          // 添加连接（红色 = Boss可达性修复）
          currentFloor.connections.push({
            from: node.id,
            to: nearest.id,
            color: '#FF00000',  // 红色 = Boss可达性修复
          });
        }
      }
    }
  }
  
  return {
    floors,
    currentFloorIndex: 0,
    currentNodeId: null,
    lastClearedNodeId: null,
    gold: 10,  // 初始金币
  };
};
*/
// =============================================================================
// 旧版地图生成结束
// =============================================================================

// =============================================================================
// 新版地图生成（杀戮尖塔风格：路径生长法）
// =============================================================================
interface PathNode {
  floorIndex: number;
  nodeIndex: number;
  x: number;  // 0-100 百分比位置
  parents: PathNode[];
  children: PathNode[];
}

// 生成新版地图（杀戮尖塔风格）
// layer: 当前是第几张地图（1-4），影响难度
const generateMapNew = (layer: number = 1): GameMap => {
  const totalFloors = 10 + (layer - 1) * 2;  // 第1张10层，第2张12层，第3张14层，第4张16层
  const pathCount = 4;  // 4条路径，保证连通性
  
  // 1. 生成路径骨架（杀戮尖塔风格）
  const paths: PathNode[][] = [];
  
  for (let p = 0; p < pathCount; p++) {
    const path: PathNode[] = [];
    let currentX = 50;  // 从中间开始
    
    for (let floor = 0; floor < totalFloors; floor++) {
      // Boss层固定在中间
      if (floor === totalFloors - 1) {
        currentX = 50;
      } else {
        // 随机移动 ±15~25%
        const move = (Math.random() - 0.5) * 40;
        currentX = Math.max(15, Math.min(85, currentX + move));
      }
      
      path.push({
        floorIndex: floor,
        nodeIndex: -1,  // 稍后填充
        x: currentX,
        parents: [],
        children: [],
      });
    }
    paths.push(path);
  }
  
  // 2. 合并路径到楼层（去重+聚合）
  // 注意：第一层和最后一层不做合并，保持单节点
  const floorNodes: { x: number; paths: number[] }[][] = [];
  
  for (let floor = 0; floor < totalFloors; floor++) {
    floorNodes[floor] = [];
    
    for (let p = 0; p < paths.length; p++) {
      const nodeX = paths[p][floor].x;
      
      // 第一层和最后一层不做合并，强制单节点
      if (floor === 0 || floor === totalFloors - 1) {
        if (floorNodes[floor].length === 0) {
          floorNodes[floor].push({ x: nodeX, paths: [p] });
        }
        continue;
      }
      
      // 检查是否已存在相近节点（距离<15%视为同一个）
      let found = false;
      for (const existing of floorNodes[floor]) {
        if (Math.abs(existing.x - nodeX) < 15) {
          existing.paths.push(p);
          found = true;
          break;
        }
      }
      
      if (!found) {
        floorNodes[floor].push({ x: nodeX, paths: [p] });
      }
    }
    
    // 第一层和最后一层强制只有一个节点
    if (floor === 0 || floor === totalFloors - 1) {
      if (floorNodes[floor].length > 1) {
        // 合并所有到第一个节点
        const firstNode = floorNodes[floor][0];
        for (let i = 1; i < floorNodes[floor].length; i++) {
          firstNode.paths.push(...floorNodes[floor][i].paths);
        }
        floorNodes[floor] = [firstNode];
      }
    }
    
    // 按x排序
    floorNodes[floor].sort((a, b) => a.x - b.x);
    
    // 给节点分配索引
    for (let i = 0; i < floorNodes[floor].length; i++) {
      for (const p of floorNodes[floor][i].paths) {
        paths[p][floor].nodeIndex = i;
      }
    }
  }
  
  // 3. 构建连接（从路径生长）
  const connections: MapConnection[] = [];
  
  for (let floor = 0; floor < totalFloors - 1; floor++) {
    const currentFloorNodes = floorNodes[floor];
    const nextFloorNodes = floorNodes[floor + 1];
    
    // 遍历当前层的路径，看看它们连接到下一层的哪个节点
    for (let p = 0; p < paths.length; p++) {
      const currentNode = paths[p][floor];
      const nextNode = paths[p][floor + 1];
      
      // 找到当前节点和下一节点对应的层内索引
      const currentIdx = currentNode.nodeIndex;
      const nextIdx = nextNode.nodeIndex;
      
      if (currentIdx >= 0 && nextIdx >= 0) {
        // 添加连接（统一白色）
        const color = '#FFFFFF';
        
        // 检查是否已存在该连接
        const fromId = `floor_${floor}_node_${currentIdx}`;
        const toId = `floor_${floor + 1}_node_${nextIdx}`;
        const exists = connections.some(c => c.from === fromId && c.to === toId);
        
        if (!exists) {
          connections.push({
            from: fromId,
            to: toId,
            color: color,
          });
        }
        
        // 记录父子关系
        currentNode.children.push(nextNode);
        nextNode.parents.push(currentNode);
      }
    }
  }
  
  // 4. 补充额外连接（增加可选择性，但保持连通性）
  for (let floor = 0; floor < totalFloors - 1; floor++) {
    const currentFloorNodes = floorNodes[floor];
    const nextFloorNodes = floorNodes[floor + 1];
    
    // 每个节点尝试额外连接1-2个相邻节点
    for (let i = 0; i < currentFloorNodes.length; i++) {
      const currentX = currentFloorNodes[i].x;
      
      // 找到x坐标最相近的下一层节点
      const candidates = nextFloorNodes
        .map((n, idx) => ({ idx, dist: Math.abs(n.x - currentX) }))
        .filter(n => n.dist < 30)
        .sort((a, b) => a.dist - b.dist);
      
      // 随机添加1-2个额外连接
      const extraCount = Math.random() > 0.5 ? 1 : 0;
      for (let j = 0; j < extraCount && j < candidates.length; j++) {
        const targetIdx = candidates[j].idx;
        const fromId = `floor_${floor}_node_${i}`;
        const toId = `floor_${floor + 1}_node_${targetIdx}`;
        
        const exists = connections.some(c => c.from === fromId && c.to === toId);
        if (!exists) {
          connections.push({
            from: fromId,
            to: toId,
            color: '#FFFFFF',  // 白色 = 额外连接
          });
        }
      }
    }
  }
  
  // 5. 创建 MapFloor 和 MapNode
  const floors: MapFloor[] = [];
  
  // 5.1 先创建所有节点
  for (let floor = 0; floor < totalFloors; floor++) {
    const nodes: MapNode[] = [];
    
    // 创建节点
    for (let i = 0; i < floorNodes[floor].length; i++) {
      const nodeData = floorNodes[floor][i];
      const type = floor === 0 ? 'monster' : 
                   floor === totalFloors - 1 ? 'boss' : 
                   floor === totalFloors - 2 ? 'campfire' : 
                   getNodeTypeForFloor(floor, totalFloors);
      
      nodes.push({
        id: `floor_${floor}_node_${i}`,
        type,
        level: floor,
        previousNodes: [],
        nextNodes: [],
        position: {
          x: nodeData.x,
          y: floor,
        },
        visited: false,
        cleared: false,
      });
    }
    
    floors.push({
      floorNumber: floor + 1,
      nodes,
      connections: [],  // 先不添加连接
      isBossFloor: floor === totalFloors - 1,
    });
  }
  
  // 5.2 所有节点创建完成后，再添加连接并填充前后节点关系
  for (let floor = 0; floor < totalFloors; floor++) {
    const floorConnections: MapConnection[] = [];
    
    for (const conn of connections) {
      const fromMatch = conn.from.match(/floor_(\d+)_node_(\d+)/);
      const toMatch = conn.to.match(/floor_(\d+)_node_(\d+)/);
      
      if (fromMatch && toMatch) {
        const fromFloor = parseInt(fromMatch[1]);
        const toFloor = parseInt(toMatch[1]);
        const fromIdx = parseInt(fromMatch[2]);
        const toIdx = parseInt(toMatch[2]);
        
        if (fromFloor === floor) {
          // 找到对应的节点
          const fromNode = floors[fromFloor]?.nodes[fromIdx];
          const toNode = floors[toFloor]?.nodes[toIdx];
          
          if (fromNode && toNode) {
            // 添加连接
            floorConnections.push({
              from: fromNode.id,
              to: toNode.id,
              color: conn.color,
            });
            
            // 填充前后节点关系
            if (!fromNode.nextNodes.includes(toNode.id)) {
              fromNode.nextNodes.push(toNode.id);
            }
            if (!toNode.previousNodes.includes(fromNode.id)) {
              toNode.previousNodes.push(fromNode.id);
            }
          }
        }
      }
    }
    
    floors[floor].connections = floorConnections;
  }
  
  // 6. 强制添加"桥接"连接，确保连通性
  // 6.1 第一层 → 第二层所有节点（确保能进入第二层任意节点）
  if (floors[0] && floors[1]) {
    const firstNode = floors[0].nodes[0];
    for (const secondNode of floors[1].nodes) {
      if (!firstNode.nextNodes.includes(secondNode.id)) {
        firstNode.nextNodes.push(secondNode.id);
        floors[0].connections.push({ from: firstNode.id, to: secondNode.id, color: '#FFFFFF' });
      }
      if (!secondNode.previousNodes.includes(firstNode.id)) {
        secondNode.previousNodes.push(firstNode.id);
      }
    }
  }
  
  // 6.2 倒数第二层所有节点 → Boss层（确保能到达Boss）
  const bossFloorIndex = floors.length - 1;
  if (bossFloorIndex > 0) {
    const beforeBossFloor = floors[bossFloorIndex - 1];
    const bossFloor = floors[bossFloorIndex];
    if (beforeBossFloor && bossFloor && bossFloor.nodes.length > 0) {
      const bossNode = bossFloor.nodes[0];
      for (const beforeNode of beforeBossFloor.nodes) {
        if (!beforeNode.nextNodes.includes(bossNode.id)) {
          beforeNode.nextNodes.push(bossNode.id);
          beforeBossFloor.connections.push({ from: beforeNode.id, to: bossNode.id, color: '#FFFFFF' });
        }
        if (!bossNode.previousNodes.includes(beforeNode.id)) {
          bossNode.previousNodes.push(beforeNode.id);
        }
      }
    }
  }
  
  return {
    floors,
    currentFloorIndex: 0,
    currentNodeId: null,
    lastClearedNodeId: null,
    gold: 10,
  };
};
// =============================================================================
// 新版地图生成结束
// =============================================================================

// 导出版本：使用新版地图生成
export const generateMap = generateMapNew;

// 获取当前可点击的节点（基于节点的 nextNodes 关系）
export const getAvailableNodes = (map: GameMap): MapNode[] => {
  // 如果正在进行的节点存在，返回空（不能同时进行两个节点）
  if (map.currentNodeId !== null) {
    // 检查当前节点是否完成
    for (const floor of map.floors) {
      const node = floor.nodes.find(n => n.id === map.currentNodeId);
      if (node && node.cleared) {
        // 完成了，继续
        break;
      } else if (node) {
        // 当前节点还没完成，不能选新的
        return [];
      }
    }
  }
  
  // 找到最后完成的节点
  let clearedNode: MapNode | undefined;
  if (map.lastClearedNodeId) {
    for (const floor of map.floors) {
      clearedNode = floor.nodes.find(n => n.id === map.lastClearedNodeId);
      if (clearedNode) break;
    }
  }
  
  // 如果没有完成任何节点，返回第一层所有未访问且未清除的节点
  if (!clearedNode) {
    return map.floors[0]?.nodes.filter(n => !n.visited && !n.cleared) || [];
  }
  
  // 根据已清除节点的 nextNodes 找到下一层可达的节点
  const reachableIds = clearedNode.nextNodes || [];
  
  // 找到这些可达节点所在的层
  const nextFloorIndex = clearedNode.level + 1;
  if (nextFloorIndex >= map.floors.length) {
    return [];
  }
  
  const nextFloor = map.floors[nextFloorIndex];
  
  // 返回可达的、未访问的、未清除的节点
  return nextFloor.nodes.filter(n => 
    reachableIds.includes(n.id) && !n.visited && !n.cleared
  );
};

// 选择节点
export const selectNode = (map: GameMap, nodeId: string): GameMap => {
  const newMap = { ...map };
  
  // 找到节点
  for (const floor of newMap.floors) {
    const node = floor.nodes.find(n => n.id === nodeId);
    if (node) {
      node.visited = true;
      newMap.currentNodeId = nodeId;
      newMap.currentFloorIndex = newMap.floors.indexOf(floor);
      break;
    }
  }
  
  return newMap;
};

// 完成节点（战斗/事件等完成后调用）
export const completeNode = (map: GameMap, goldReward: number = 0): GameMap => {
  const newMap = { ...map };
  
  // 标记当前节点为已完成
  if (newMap.currentNodeId) {
    for (let i = 0; i < newMap.floors.length; i++) {
      const node = newMap.floors[i].nodes.find(n => n.id === newMap.currentNodeId);
      if (node) {
        node.cleared = true;
        // 记录最后完成的节点
        newMap.lastClearedNodeId = newMap.currentNodeId;
        // 更新当前楼层为下一层
        newMap.currentFloorIndex = i + 1;
        break;
      }
    }
    // 重置 currentNodeId，表示当前没有正在进行的节点
    newMap.currentNodeId = null;
  }
  
  newMap.gold += goldReward;
  
  return newMap;
};

// 获取节点显示信息
export const getNodeDisplayInfo = (type: MapNodeType): { icon: string; name: string; color: string } => {
  switch (type) {
    case 'monster':
      return { icon: '👹', name: '战斗', color: '#e94560' };
    case 'elite':
      return { icon: '👹👹', name: '精英', color: '#ff6b6b' };
    case 'shop':
      return { icon: '🏪', name: '商店', color: '#ffd93d' };
    case 'campfire':
      return { icon: '🔥', name: '篝火', color: '#ff9f43' };
    case 'event':
      return { icon: '❓', name: '事件', color: '#a55eea' };
    case 'boss':
      return { icon: '💀', name: 'Boss', color: '#eb2f06' };
    default:
      return { icon: '❓', name: '未知', color: '#aaa' };
  }
};

// 生成随机英雄供购买
export const generateShopHeroes = (count: number = 5): Hero[] => {
  const shuffled = [...heroes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};