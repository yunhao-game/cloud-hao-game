import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Modal, Alert } from 'react-native';
import { HomeScreen } from './src/screens/Home/HomeScreen';
import { BattleScreen } from './src/screens/Battle/BattleScreen';
import { MapScreen } from './src/screens/Map/MapScreen';
import { BattlePrepScreen } from './src/screens/Shop/BattlePrepScreen';
import { NodeDetailScreen } from './src/screens/Node/NodeDetailScreen';
import { RelicSelectScreen } from './src/screens/Relic/RelicSelectScreen';
import { generateMap, completeNode, selectNode } from './src/game/map';
import { heroes } from './src/data/heroes';
import { Hero, GameMap, MapNode, BattleState } from './src/types';

// 状态管理
type Screen = 'home' | 'map' | 'battle' | 'battlePrep' | 'battleResult' | 'nodeDetail' | 'gameOver' | 'relicSelect' | 'victory';

// 调试模式全局变量
let debugClickCount = 0;
let debugModeEnabled = false;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [debugMode, setDebugMode] = useState(false);
  // 调试弹窗状态
  const [debugInfo, setDebugInfo] = useState<{step: number, message: string, data?: any, resolve: (() => void) | null}>({
    step: 0, message: '', data: undefined, resolve: null
  });
  const [debugVisible, setDebugVisible] = useState(false);

  // 阻塞式调试等待函数
  const waitForDebug = (step: number, message: string, data?: any): Promise<void> => {
    return new Promise((resolve) => {
      if (!debugMode) {
        resolve();
        return;
      }
      setDebugInfo({ step, message, data, resolve });
      setDebugVisible(true);
    });
  };
  const [gameMap, setGameMap] = useState<GameMap | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [battleTeam, setBattleTeam] = useState<Hero[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<Hero[]>([]);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | null>(null);
  
  // 全局英雄状态（跨战斗保留）
  const [playerHeroes, setPlayerHeroes] = useState<Hero[]>([]);
  
  // 玩家生命值（初始 100，失败 -10，归零游戏结束）
  const [playerHealth, setPlayerHealth] = useState(100);
  
  // 人口上限（初始 2）
  const [maxPopulation, setMaxPopulation] = useState(2);

  // 玩家等级（初始 1，最高 10）
  const [playerLevel, setPlayerLevel] = useState(1);

  // 当前地图层数（1-4）
  const [currentLayer, setCurrentLayer] = useState(1);
  const MAX_LAYER = 4;

  // 计算升级消耗（首次升级到2级需要10金币，之后每次+10）
  const getLevelUpCost = (level: number) => {
    if (level >= 10) return 0; // 满级
    return level * 10;
  };

  // 处理升级
  const handleLevelUp = () => {
    const cost = getLevelUpCost(playerLevel);
    if (playerLevel >= 10 || !gameMap || gameMap.gold < cost) return;
    
    setGameMap({ ...gameMap, gold: gameMap.gold - cost });
    setPlayerLevel(playerLevel + 1);
    setMaxPopulation(maxPopulation + 1); // 每次升级+1人口
  };

  // 开始新游戏
  const startNewGame = () => {
    const newMap = generateMap(1);  // 第1层地图
    setGameMap(newMap);
    setPlayerHealth(100); // 重置生命值
    setMaxPopulation(2); // 重置人口
    setPlayerLevel(1);   // 重置等级
    setCurrentLayer(1);   // 重置地图层数
    setPlayerHeroes([]);
    setCurrentScreen('map');
  };

  // 继续游戏
  const continueGame = () => {
    if (gameMap) {
      setCurrentScreen('map');
    } else {
      startNewGame();
    }
  };

  // 选择节点
  const handleNodeSelect = async (node: MapNode) => {
    // ========== 调试 ==========
    await waitForDebug(1, '用户点击节点', { nodeId: node.id, nodeType: node.type });
    
    // 先更新地图状态：标记节点为已访问
    if (gameMap) {
      const newMap = selectNode(gameMap, node.id);
      setGameMap(newMap);
    }
    
    await waitForDebug(2, '已设置 gameMap 状态');
    setSelectedNode(node);
    
    await waitForDebug(3, '已设置 selectedNode 状态', { selectedNode: node ? node.id : null });
    
    if (node.type === 'monster' || node.type === 'elite' || node.type === 'boss') {
      // 战斗节点：进入战斗准备
      // 先设置 selectedNode（确保在切换屏幕前状态已设置）
      setSelectedNode(node);
      
      await waitForDebug(4, '准备切换到 battlePrep', { nodeType: node.type, selectedNodeId: node.id });
      
      // ====== 步骤4-1: 关闭调试弹窗 ======
      setDebugVisible(false);
      await waitForDebug(4.1, '已关闭调试弹窗', {});
      
      // ====== 步骤4-2: 调用 resolve ======
      if (debugInfo.resolve) debugInfo.resolve();
      await waitForDebug(4.2, '已调用 resolve', {});
      
      // ====== 步骤4-3: 切换屏幕 ======
      setCurrentScreen('battlePrep');
      await waitForDebug(4.3, '已调用 setCurrentScreen', { screen: 'battlePrep' });
    } else {
      // 其他节点：显示详情
      setCurrentScreen('nodeDetail');
    }
  };

  // 开始战斗
  const handleStartBattle = (team: Hero[], allHeroes: Hero[], remainingGold: number) => {
    // 更新游戏金币（扣除购买花费）
    if (gameMap) {
      const newMap = { ...gameMap, gold: remainingGold };
      setGameMap(newMap);
    }
    // 生成敌人团队并保存到状态
    const enemy = generateEnemyTeam();
    setEnemyTeam(enemy);
    setBattleTeam(team);
    setPlayerHeroes(allHeroes); // 保存全局英雄
    setCurrentScreen('battle');
  };

  // 战斗结束
  const handleBattleEnd = (win: boolean) => {
    if (!win) {
      // 失败扣减 10 点生命
      const newHealth = playerHealth - 10;
      setPlayerHealth(newHealth);
      
      // 生命值归零，游戏结束
      if (newHealth <= 0) {
        setBattleResult('lose');
        setCurrentScreen('gameOver');
        return;
      }
    }
    setBattleResult(win ? 'win' : 'lose');
    setCurrentScreen('battleResult');
  };

  // 战斗结果确认
  const confirmBattleResult = () => {
    if (!gameMap || !selectedNode) return;

    // 计算奖励金币
    let goldReward = 0;
    if (battleResult === 'win') {
      switch (selectedNode.type) {
        case 'monster': goldReward = 10; break;
        case 'elite': goldReward = 20; break;
        case 'boss': goldReward = 100; break;
        default: goldReward = 5;
      }
    }

    // 更新地图状态
    const newMap = completeNode(gameMap, goldReward);
    setGameMap(newMap);
    setSelectedNode(null);
    setBattleTeam([]);
    setBattleResult(null);
    
    // 检查是否是 Boss 战斗胜利
    if (battleResult === 'win' && selectedNode.type === 'boss') {
      // 进入遗物选择界面
      setCurrentScreen('relicSelect');
    } else {
      setCurrentScreen('map');
    }
  };

  // 遗物选择确认 - 进入下一层或显示胜利
  const handleRelicConfirm = () => {
    if (currentLayer >= MAX_LAYER) {
      // 4张图全部通关，显示胜利界面
      setCurrentScreen('victory');
    } else {
      // 进入下一层地图
      const nextLayer = currentLayer + 1;
      const newMap = generateMap(nextLayer);
      setGameMap(newMap);
      setCurrentLayer(nextLayer);
      setCurrentScreen('map');
    }
  };

  // 胜利界面返回主菜单
  const handleVictoryBackToHome = () => {
    setCurrentScreen('home');
  };

  // 节点完成（商店、篝火、事件）
  const handleNodeComplete = () => {
    if (!gameMap || !selectedNode) return;

    let goldReward = 0;
    switch (selectedNode.type) {
      case 'shop':
        // 商店花费已经在购买时处理
        break;
      case 'campfire':
        // 篝火回复
        break;
      case 'event':
        goldReward = 10 + Math.floor(Math.random() * 21); // 10-30金币
        break;
      default:
        goldReward = 5;
    }

    const newMap = completeNode(gameMap, goldReward);
    setGameMap(newMap);
    setSelectedNode(null);
    setCurrentScreen('map');
  };

  // 生成敌人团队
  const generateEnemyTeam = (): Hero[] => {
    if (!selectedNode) return [];
    
    // 敌人数量
    let enemyCount = 0;
    if (selectedNode.type === 'monster') enemyCount = 1 + Math.floor((currentLayer - 1) / 3);  // 普通怪: 1-2个
    if (selectedNode.type === 'elite') enemyCount = 3 + Math.floor((currentLayer - 1) / 2);  // 精英: 3-5个
    if (selectedNode.type === 'boss') enemyCount = 5 + (currentLayer - 1) * 2;  // Boss: 5, 7, 9, 11
    
    // 难度加成系数
    const difficultyMultiplier = 1 + (currentLayer - 1) * 0.5;
    
    // 生成敌人
    const newEnemyTeam: Hero[] = [];
    const enemyNames = ['哥布林', '狼', '骷髅', '史莱姆', '蝙蝠', '僵尸', '蜘蛛', '食人魔'];
    for (let i = 0; i < enemyCount; i++) {
      newEnemyTeam.push({
        id: `enemy_${i}`,
        name: enemyNames[i % enemyNames.length],
        rarity: Math.min(3, 1 + Math.floor((currentLayer - 1) / 2)) as 1 | 2 | 3 | 4 | 5,
        star: 0,
        faction: 'human',
        job: 'warrior',
        hp: Math.floor((500 + i * 200) * difficultyMultiplier),
        maxHp: Math.floor((500 + i * 200) * difficultyMultiplier),
        attack: Math.floor((50 + i * 20) * difficultyMultiplier),
        defense: Math.floor(10 * difficultyMultiplier),
        speed: 50,
        range: 1,
        cost: 0,
        skill: { name: '攻击', description: '普通攻击', effect: (_target: Hero, _self: Hero) => {} },
        isOnBoard: false,
        boardX: 7,
        boardY: 2 + i,
        skillCooldown: 0,
      });
    }
    
    return newEnemyTeam;
  };

  // 渲染战斗准备界面
  const renderBattlePrep = () => {
    if (!gameMap || !selectedNode) return null;
    
    const enemyCount = selectedNode.type === 'monster' ? 1 + Math.floor((currentLayer - 1) / 3) :
                       selectedNode.type === 'elite' ? 3 + Math.floor((currentLayer - 1) / 2) :
                       selectedNode.type === 'boss' ? 5 + (currentLayer - 1) * 2 : 0;
    
    const newEnemyTeam = generateEnemyTeam();
    
    return (
      <BattlePrepScreen
        gold={gameMap.gold}
        onStartBattle={handleStartBattle}
        onBack={() => setCurrentScreen('map')}
        enemyCount={enemyCount}
        enemyHeroes={newEnemyTeam}
        initialHeroes={playerHeroes}
        playerHealth={playerHealth}
        maxPopulation={maxPopulation}
        onHealthChange={setPlayerHealth}
        onPopulationChange={setMaxPopulation}
        playerLevel={playerLevel}
        onLevelUp={handleLevelUp}
        levelUpCost={getLevelUpCost(playerLevel)}
      />
    );
  };
    
  // 渲染战斗界面
  const renderBattle = () => {
    if (!selectedNode || battleTeam.length === 0) return null;
    
    return (
      <BattleScreen
        currentFloor={(gameMap?.currentFloorIndex || 0) + 1}
        playerTeam={battleTeam.length > 0 ? battleTeam : heroes.slice(0, 4)}
        enemyTeam={enemyTeam}
        onBattleEnd={handleBattleEnd}
        onBack={() => setCurrentScreen('battlePrep')}
      />
    );
  };

  // 渲染战斗结果界面
  const renderBattleResult = () => {
    if (!battleResult || !selectedNode) return null;

    const reward = battleResult === 'win' 
      ? selectedNode.type === 'boss' ? 100 : selectedNode.type === 'elite' ? 20 : 10
      : 0;

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultEmoji}>
          {battleResult === 'win' ? '🎉' : '💔'}
        </Text>
        <Text style={styles.resultTitle}>
          {battleResult === 'win' ? '战斗胜利！' : '战斗失败...'}
        </Text>
        {battleResult === 'win' && (
          <Text style={styles.rewardText}>获得 💰{reward} 金币</Text>
        )}
        <Text style={styles.healthText}>❤️ 当前生命：{playerHealth}</Text>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={confirmBattleResult}
        >
          <Text style={styles.confirmButtonText}>
            {battleResult === 'win' ? '确认奖励' : '返回地图'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 渲染游戏结束界面
  const renderGameOver = () => {
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultEmoji}>💀</Text>
        <Text style={styles.resultTitle}>游戏结束</Text>
        <Text style={styles.rewardText}>你的生命已耗尽...</Text>
        <Text style={styles.rewardText}>最终到达：第 {(gameMap?.currentFloorIndex || 0) + 1} 层</Text>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.confirmButtonText}>返回主菜单</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 渲染胜利界面
  const renderVictory = () => {
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultEmoji}>🏆</Text>
        <Text style={styles.resultTitle}>🎉 恭喜通关！ 🎉</Text>
        <Text style={styles.rewardText}>你已击败所有Boss！</Text>
        <Text style={styles.rewardText}>成功通关 4 张地图</Text>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleVictoryBackToHome}
        >
          <Text style={styles.confirmButtonText}>返回主菜单</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 渲染节点详情界面
  const renderNodeDetail = () => {
    if (!selectedNode || !gameMap) return null;
    return (
      <NodeDetailScreen
        node={selectedNode}
        onComplete={handleNodeComplete}
        gold={gameMap.gold}
      />
    );
  };

  // 渲染地图界面
  const renderMap = () => {
    if (!gameMap) return null;
    return (
      <MapScreen
        gameMap={gameMap}
        currentLayer={currentLayer}
        onNodeSelect={handleNodeSelect}
        onBack={() => setCurrentScreen('home')}
        onGoHome={() => setCurrentScreen('home')}
      />
    );
  };

  // 全屏状态栏
  StatusBar.setHidden(true);
  
  // ========== 调试 Modal ==========
  return (
    <>
      {/* 主渲染 */}
      <View style={{ flex: 1 }}>
        {currentScreen === 'home' && (
          <HomeScreen
            onStartGame={startNewGame}
            onViewHeroes={() => {}}
            onContinueGame={continueGame}
            onToggleDebug={() => {
              debugClickCount++;
              if (debugClickCount >= 3) {
                debugModeEnabled = !debugModeEnabled;
                setDebugMode(debugModeEnabled);
                debugClickCount = 0;
                Alert.alert('🔍 调试模式', debugModeEnabled ? '调试模式已开启！\n点击怪物节点后将弹出步骤信息' : '调试模式已关闭');
              }
            }}
            debugMode={debugMode}
          />
        )}
        {currentScreen === 'map' && renderMap()}
        {currentScreen === 'battlePrep' && renderBattlePrep()}
        {currentScreen === 'battle' && renderBattle()}
        {currentScreen === 'battleResult' && renderBattleResult()}
        {currentScreen === 'nodeDetail' && renderNodeDetail()}
        {currentScreen === 'gameOver' && renderGameOver()}
        {currentScreen === 'relicSelect' && (
          <RelicSelectScreen currentLayer={currentLayer} maxLayer={MAX_LAYER} onConfirm={handleRelicConfirm} />
        )}
        {currentScreen === 'victory' && renderVictory()}
      </View>

      {/* 调试弹窗 */}
      <Modal visible={debugVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#2a2a4a', borderRadius: 16, padding: 20, width: '80%', borderWidth: 2, borderColor: '#ffeb3b' }}>
            <Text style={{ color: '#ffeb3b', fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>🔍 调试 - 步骤 {debugInfo.step}</Text>
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 10 }}>{debugInfo.message}</Text>
            {debugInfo.data && (
              <Text style={{ color: '#4ade80', fontSize: 12, fontFamily: 'monospace', marginBottom: 20 }}>{JSON.stringify(debugInfo.data)}</Text>
            )}
            <TouchableOpacity
              style={{ backgroundColor: '#4ade80', padding: 15, borderRadius: 8, alignItems: 'center' }}
              onPress={() => {
                setDebugVisible(false);
                if (debugInfo.resolve) debugInfo.resolve();
              }}
            >
              <Text style={{ color: '#000', fontWeight: 'bold' }}>继续下一步</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  resultContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  rewardText: {
    color: '#ffd700',
    fontSize: 20,
    marginBottom: 20,
  },
  healthText: {
    color: '#e94560',
    fontSize: 20,
    marginBottom: 30,
  },
  confirmButton: {
    backgroundColor: '#4ade80',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  confirmButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
});