import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { BattleState, BattleUnit, Hero, DamageNumber } from '../../types';
import { UnitInfoModal } from '../../components/UnitInfoModal';
import { createBattleUnit, executeTick, checkBattleEnd, initBattleState } from '../../game/battle';
import { getFloor } from '../../data/tower';

interface BattleScreenProps {
  currentFloor: number;
  playerTeam: Hero[];
  enemyTeam?: Hero[];  // 可选的敌人团队，用于地图模式
  onBattleEnd: (win: boolean) => void;
  onBack: () => void;
}

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 8;
const BATTLE_TICK_MS = 100; // 每个tick 100ms
const MAX_BATTLE_TIME = 90 * 1000; // 最多90秒

// 伤害数字组件 - 简化版，避免动画问题
const DamageNumberDisplay: React.FC<{ damage: DamageNumber }> = ({ damage }) => {
  // 计算屏幕位置
  const cellSize = 45;
  const boardPadding = 10;
  const left = boardPadding + damage.x * (cellSize + 4) + cellSize / 2 - 15;
  const top = 120 + damage.y * (cellSize + 4) - 10;
  
  return (
    <View
      style={[
        styles.damageNumber,
        { left, top },
        damage.isCrit && styles.critDamage,
      ]}
    >
      <Text style={[styles.damageText, damage.isCrit && styles.critText]}>
        {damage.isCrit ? '💥' : ''}-{damage.damage}
      </Text>
    </View>
  );
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  currentFloor,
  playerTeam,
  enemyTeam: externalEnemyTeam,
  onBattleEnd,
  onBack,
}) => {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [battleResult, setBattleResult] = useState<'player' | 'enemy' | 'timeout' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [battleTime, setBattleTime] = useState(0);
  const battleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 攻击动画状态: { attackerId: { targetX, targetY, startX, startY } }
  const [attackAnims, setAttackAnims] = useState<Record<string, { targetX: number; targetY: number; startX: number; startY: number }>>({});
  // 选中的单位（用于显示详情弹窗）
  const [selectedUnit, setSelectedUnit] = useState<Hero | null>(null);
  // 伤害数字列表
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  // 战斗胜利金币奖励
  const [rewardGold, setRewardGold] = useState(0);
  // 使用 Animated.Values 来实现每个单位的动画
  const animValuesRef = useRef<Record<string, Animated.ValueXY>>({});
  
  // 触发攻击动画：向前移动 1/4 格子然后返回
  const triggerAttackAnim = (unitId: string, moveX: number, moveY: number) => {
    // 获取或创建 Animated.Value
    if (!animValuesRef.current[unitId]) {
      animValuesRef.current[unitId] = new Animated.ValueXY({ x: 0, y: 0 });
    }
    
    const animValue = animValuesRef.current[unitId];
    
    // 重置位置
    animValue.setValue({ x: 0, y: 0 });
    
    // 动画：向前 → 暂停 → 返回
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: { x: moveX * 45, y: moveY * 45 }, // 移动（45是一个格子的大小）
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: { x: 0, y: 0 },
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 初始化战斗
  useEffect(() => {
    if (battleState) return;
    
    try {
      // 使用传入的敌人团队，如果没有则从 tower 数据获取
      let enemyTeamToUse: Hero[] | undefined = externalEnemyTeam;
      
      if (!enemyTeamToUse || enemyTeamToUse.length === 0) {
        const floor = getFloor(currentFloor);
        console.log('BattleScreen: currentFloor =', currentFloor, 'floor =', floor);
        
        if (!floor) {
          setInitError('找不到楼层数据: ' + currentFloor);
          return;
        }
        enemyTeamToUse = floor.enemyTeam;
      }
      
      if (!enemyTeamToUse || enemyTeamToUse.length === 0) {
        setInitError('楼层 ' + currentFloor + ' 没有敌人配置');
        return;
      }

      if (!playerTeam || playerTeam.length === 0) {
        setInitError('请先选择英雄');
        return;
      }

      const validPlayerTeam = playerTeam.filter(h => h && h.id && h.name);
      const validEnemyTeam = enemyTeamToUse.filter(h => h && h.id && h.name);
      
      console.log('Player team:', validPlayerTeam.length, 'Enemy team:', validEnemyTeam.length);
      
      if (validPlayerTeam.length === 0) {
        setInitError('玩家英雄数据无效');
        return;
      }
      
      if (validEnemyTeam.length === 0) {
        setInitError('敌方英雄数据无效, enemyTeam length: ' + enemyTeamToUse.length);
        return;
      }

      // 创建玩家单位
      const playerUnits: BattleUnit[] = validPlayerTeam
        .filter(hero => hero.boardX >= 0 && hero.boardY >= 0)
        .map(hero => createBattleUnit(hero, hero.boardX, hero.boardY, true));

      // 创建敌方单位
      const enemyUnits: BattleUnit[] = validEnemyTeam.slice(0, 8).map((hero, index) =>
        createBattleUnit(hero, index % 8, Math.floor(index / 8), false)
      );

      const initialState = initBattleState(playerUnits, enemyUnits);
      initialState.battleLog = [`战斗开始！第 ${currentFloor} 层`];
      
      // 计算奖励金币（基于当前层数和敌人数量）
      const goldReward = 5 + Math.floor(currentFloor * 2) + enemyUnits.length * 2;
      setRewardGold(goldReward);
      
      setBattleState(initialState);
      setBattleTime(0);
    } catch (error: any) {
      setInitError('初始化失败: ' + (error?.message || '未知错误'));
    }
  }, [currentFloor, playerTeam, externalEnemyTeam]);

  // 启动自动战斗循环
  useEffect(() => {
    if (!battleState || battleResult) return;

    battleTimerRef.current = setInterval(() => {
      setBattleState(prevState => {
        if (!prevState || prevState.battleResult !== 'ongoing') return prevState;
        
        // 执行一个tick
        const newState = executeTick(prevState, BOARD_WIDTH, BOARD_HEIGHT);
        
        // 更新伤害数字
        if (newState.damageNumbers && newState.damageNumbers.length > 0) {
          setDamageNumbers(prev => {
            const now = Date.now();
            const filtered = prev.filter(d => now - d.timestamp < 1000);
            return [...filtered, ...newState.damageNumbers.filter(d => !prev.find(p => p.id === d.id))];
          });
        }
        
        // 处理攻击动画
        const newAttackAnims: typeof attackAnims = {};
        const anims = newState.attackAnims || [];
        
        anims.forEach(anim => {
          // 找到攻击者和目标的位置
          const attacker = [...newState.playerUnits, ...newState.enemyUnits].find(u => u.id === anim.attackerId);
          const target = [...newState.playerUnits, ...newState.enemyUnits].find(u => u.id === anim.targetId);
          
          if (attacker && target && !attacker.isDead && !target.isDead) {
            // 计算移动方向（目标位置 - 攻击者位置）
            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            // 归一化并移动 1/4 格子
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              const moveX = (dx / dist) * 0.25; // 1/4格子
              const moveY = (dy / dist) * 0.25;
              
              newAttackAnims[attacker.id] = {
                targetX: attacker.x + moveX,
                targetY: attacker.y + moveY,
                startX: attacker.x,
                startY: attacker.y,
              };
              
              // 触发动画
              triggerAttackAnim(attacker.id, moveX, moveY);
            }
          }
        });
        
        // 更新战斗时间
        setBattleTime(newState.gameTime);
        
        // 检查战斗结束
        const result = checkBattleEnd(newState);
        if (result === 'player') {
          newState.battleResult = 'player';
          setBattleResult('player');
        } else if (result === 'enemy') {
          newState.battleResult = 'enemy';
          setBattleResult('enemy');
        } else if (result === 'timeout') {
          newState.battleResult = 'timeout';
          setBattleResult('timeout');
        }
        
        return newState;
      });
    }, BATTLE_TICK_MS);

    return () => {
      if (battleTimerRef.current) {
        clearInterval(battleTimerRef.current);
      }
    };
  }, [battleState, battleResult]);

  // 渲染棋盘格子
  const renderCell = (x: number, y: number) => {
    const playerUnit = battleState?.playerUnits.find(u => u.x === x && u.y === y && !u.isDead);
    const enemyUnit = battleState?.enemyUnits.find(u => u.x === x && u.y === y && !u.isDead);
    const unit = playerUnit || enemyUnit;
    const isEnemyZone = y < 4;
    
    // 获取该单位的动画值
    const animValue = unit ? animValuesRef.current[unit.id] : null;
    
    const handleUnitPress = () => {
      if (unit) {
        setSelectedUnit(unit.hero);
      }
    };
    
    return (
      <TouchableOpacity 
        key={`${x}-${y}`} 
        style={[
          styles.cell, 
          unit ? styles.cellOccupied : styles.cellEmpty,
          isEnemyZone ? styles.enemyZone : styles.playerZone
        ]}
        onPress={handleUnitPress}
        activeOpacity={0.7}
      >
        {unit && (
          animValue ? (
            <Animated.View style={[
              styles.unit, 
              unit.isPlayer ? styles.playerUnit : styles.enemyUnit,
              { transform: [{ translateX: animValue.x }, { translateY: animValue.y }] }
            ]}>
              <Text style={styles.unitEmoji}>
                {unit.hero.faction === 'human' ? '🧑' :
                 unit.hero.faction === 'undead' ? '💀' :
                 unit.hero.faction === 'elf' ? '🧝' :
                 unit.hero.faction === 'dragon' ? '🐉' :
                 unit.hero.faction === 'sea' ? '🌊' :
                 unit.hero.faction === 'element' ? '🧙' :
                 unit.hero.faction === 'demon' ? '😈' : '⚔️'}
              </Text>
              <Text style={styles.unitHp}>
                {unit.maxHp ? Math.round((unit.currentHp / unit.maxHp) * 100) : 0}%
              </Text>
            </Animated.View>
          ) : (
            <View style={[
              styles.unit, 
              unit.isPlayer ? styles.playerUnit : styles.enemyUnit
            ]}>
              <Text style={styles.unitEmoji}>
                {unit.hero.faction === 'human' ? '🧑' :
                 unit.hero.faction === 'undead' ? '💀' :
                 unit.hero.faction === 'elf' ? '🧝' :
                 unit.hero.faction === 'dragon' ? '🐉' :
                 unit.hero.faction === 'sea' ? '🌊' :
                 unit.hero.faction === 'element' ? '🧙' :
                 unit.hero.faction === 'demon' ? '😈' : '⚔️'}
              </Text>
              <Text style={styles.unitHp}>
                {unit.maxHp ? Math.round((unit.currentHp / unit.maxHp) * 100) : 0}%
              </Text>
            </View>
          )
        )}
      </TouchableOpacity>
    );
  };

  // 显示初始化错误
  if (initError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{initError}</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!battleState) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>加载战斗...</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 战斗结束界面
  if (battleResult) {
    return (
      <View style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>
            {battleResult === 'player' ? '🎉' : battleResult === 'timeout' ? '⏰' : '💔'}
          </Text>
          <Text style={styles.resultText}>
            {battleResult === 'player' ? '战斗胜利！' : battleResult === 'timeout' ? '战斗超时' : '战斗失败'}
          </Text>
          {battleResult === 'player' && (
            <Text style={styles.rewardText}>
              💰 获得 {rewardGold} 金币
            </Text>
          )}
          <Text style={styles.resultSubtext}>
            {battleResult === 'player' 
              ? `成功击败第 ${currentFloor} 层的敌人！`
              : battleResult === 'timeout'
              ? '双方势均力敌，战斗陷入僵局'
              : '再接再厉，下次一定能赢！'}
          </Text>
          
          {/* 战斗日志 - 可滚动 */}
          <ScrollView style={styles.resultLogContainer}>
            {battleState.battleLog.slice(-20).map((log, index) => (
              <Text key={index} style={styles.resultLogText}>{log}</Text>
            ))}
          </ScrollView>
          
          <View style={styles.resultButtonContainer}>
            <TouchableOpacity 
              style={styles.resultButton}
              onPress={() => {
                // 返回战斗页面，隐藏结果界面
                setBattleResult(null);
                setDamageNumbers([]);
              }}
            >
              <Text style={styles.resultButtonText}>返回查看</Text>
            </TouchableOpacity>
            
            {battleResult === 'player' && (
              <TouchableOpacity 
                style={[styles.resultButton, styles.nextButton]}
                onPress={() => onBattleEnd(true)}
              >
                <Text style={styles.resultButtonText}>下一层 →</Text>
              </TouchableOpacity>
            )}
            
            {battleResult !== 'player' && (
              <TouchableOpacity 
                style={[styles.resultButton, styles.retryButton]}
                onPress={() => onBattleEnd(false)}
              >
                <Text style={styles.resultButtonText}>重新挑战</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部信息 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.floorText}>第 {currentFloor} 层</Text>
          <Text style={styles.roundText}>⏱️ {Math.floor(battleTime / 1000)}s / 90s</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      {/* 区域标签 */}
      <View style={styles.zoneLabels}>
        <Text style={styles.zoneLabel}>⬆️ 敌方区域</Text>
        <Text style={styles.zoneLabel}>⬇️ 我方区域</Text>
      </View>

      {/* 棋盘 */}
      <View style={styles.board}>
        {Array.from({ length: BOARD_HEIGHT }).map((_, y) => (
          <View key={y} style={styles.row}>
            {Array.from({ length: BOARD_WIDTH }).map((_, x) => renderCell(x, y))}
          </View>
        ))}
      </View>
      
      {/* 伤害数字层 */}
      {damageNumbers.map(dmg => (
        <DamageNumberDisplay key={dmg.id} damage={dmg} />
      ))}

      {/* 战斗信息 */}
      <View style={styles.battleInfo}>
        <View style={styles.teamInfo}>
          <Text style={styles.teamLabel}>我方</Text>
          <Text style={styles.teamCount}>
            {battleState.playerUnits.filter(u => !u.isDead).length} 人
          </Text>
        </View>
        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <View style={styles.teamInfo}>
          <Text style={styles.teamLabel}>敌方</Text>
          <Text style={styles.teamCount}>
            {battleState.enemyUnits.filter(u => !u.isDead).length} 人
          </Text>
        </View>
      </View>

      {/* 状态 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>⚔️ 战斗中 - 自动进行</Text>
      </View>

      {/* 战斗日志 */}
      <ScrollView style={styles.logContainer}>
        {battleState.battleLog.slice(-5).map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>

      {/* 单位详情弹窗 */}
      <UnitInfoModal
        visible={selectedUnit !== null}
        hero={selectedUnit}
        onClose={() => setSelectedUnit(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loading: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    color: '#e94560',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#16213e',
  },
  backText: {
    color: '#e94560',
    fontSize: 16,
  },
  zoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 5,
    backgroundColor: '#16213e',
  },
  zoneLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  floorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  roundText: {
    color: '#aaa',
    fontSize: 14,
  },
  board: {
    padding: 10,
    gap: 4,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    width: 45,
    height: 45,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellEmpty: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#333',
  },
  cellOccupied: {
    backgroundColor: '#1f4068',
    borderWidth: 2,
  },
  enemyZone: {
    backgroundColor: '#2a1a1a',
  },
  playerZone: {
    backgroundColor: '#1a2a1a',
  },
  unit: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  playerUnit: {
    borderColor: '#4ade80',
    backgroundColor: '#1a4d3e',
  },
  enemyUnit: {
    borderColor: '#e94560',
    backgroundColor: '#4d1a1a',
  },
  attackAnim: {
    borderWidth: 3,
    borderColor: '#ffeb3b',
    shadowColor: '#ffeb3b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  unitEmoji: {
    fontSize: 28,
  },
  unitHp: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  battleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#16213e',
    marginHorizontal: 20,
    borderRadius: 12,
  },
  teamInfo: {
    alignItems: 'center',
  },
  teamLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  teamCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  vsContainer: {
    backgroundColor: '#e94560',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  vsText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusContainer: {
    padding: 10,
    alignItems: 'center',
  },
  statusText: {
    color: '#4ade80',
    fontSize: 16,
  },
  logContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logText: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  // 伤害数字样式
  damageNumber: {
    position: 'absolute',
    zIndex: 100,
    pointerEvents: 'none',
  },
  damageText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  critDamage: {
    transform: [{ scale: 1.3 }],
  },
  critText: {
    color: '#ffd700',
    fontSize: 20,
  },
  // 战斗结果界面
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  rewardText: {
    fontSize: 24,
    color: '#ffd700',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultSubtext: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 20,
  },
  resultLogContainer: {
    maxHeight: 150,
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  resultLogText: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  resultButtonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  resultButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#4ade80',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#aaa',
    fontSize: 16,
  },
});

export default BattleScreen;
