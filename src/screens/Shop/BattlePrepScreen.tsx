import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, PanResponder, Animated } from 'react-native';
import { Hero, HeroRarity, Faction, Job } from '../../types';
import { baseHeroes } from '../../data/heroes';
import { UnitInfoModal } from '../../components/UnitInfoModal';

// 棋盘大小
const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 8;
const BENCH_SIZE = 8;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 40) / BOARD_WIDTH);

interface BattlePrepScreenProps {
  gold: number;
  onStartBattle: (boardHeroes: Hero[], allHeroes: Hero[], remainingGold: number) => void;
  onBack: () => void;
  enemyCount: number;
  enemyHeroes: Hero[];
  initialHeroes?: Hero[];
  playerHealth?: number;
  maxPopulation?: number;
  onHealthChange?: (health: number) => void;
  onPopulationChange?: (pop: number) => void;
  // 等级相关
  playerLevel?: number;
  onLevelUp?: () => void;
  levelUpCost?: number;
  // 商店锁定相关
  shopVisible?: boolean;
  onShopVisibleChange?: (visible: boolean) => void;
  shopLocked?: boolean;
  onShopLockedChange?: (locked: boolean) => void;
  shopLockedHeroes?: Hero[];
  onShopLockedHeroesChange?: (heroes: Hero[]) => void;
  // 免费刷新次数
  freeRefreshCount?: number;
  onFreeRefreshCountChange?: (count: number) => void;
  // 连胜/连败状态
  winStreak?: number;
  loseStreak?: number;
}

// 稀有度颜色
const RARITY_COLORS: Record<number, string> = {
  1: '#FFFFFF',
  2: '#4CAF50',
  3: '#2196F3',
  4: '#9C27B0',
  5: '#FF9800',
};

export const BattlePrepScreen: React.FC<BattlePrepScreenProps> = ({
  gold,
  onStartBattle,
  onBack,
  enemyCount,
  enemyHeroes,
  initialHeroes = [],
  playerHealth = 100,
  maxPopulation = 2,
  onHealthChange,
  onPopulationChange,
  playerLevel = 1,
  onLevelUp,
  levelUpCost = 10,
  shopVisible: externalShopVisible = false,
  onShopVisibleChange,
  shopLocked: externalShopLocked = false,
  onShopLockedChange,
  shopLockedHeroes: externalShopLockedHeroes = [],
  onShopLockedHeroesChange,
  onFreeRefreshCountChange,
  freeRefreshCount = 1,
  winStreak = 0,
  loseStreak = 0,
}) => {
  const [benchHeroes, setBenchHeroes] = useState<Hero[]>([]);
  const [boardHeroes, setBoardHeroes] = useState<Map<string, Hero>>(new Map());
  const [shopHeroes, setShopHeroes] = useState<Hero[]>([]);
  const [shopVisible, setShopVisible] = useState(externalShopVisible);
  const [shopLocked, setShopLocked] = useState(externalShopLocked);
  const [currentGold, setCurrentGold] = useState(gold);
  
  // 同步外部传入的 shopVisible 状态
  useEffect(() => {
    setShopVisible(externalShopVisible);
  }, [externalShopVisible]);
  
  // 同步外部传入的 shopLocked 状态
  useEffect(() => {
    setShopLocked(externalShopLocked);
  }, [externalShopLocked]);
  
  // 封装 setShopVisible，同步到外部状态
  const handleSetShopVisible = (visible: boolean) => {
    setShopVisible(visible);
    onShopVisibleChange?.(visible);
  };
  
  // 封装 setShopLocked，同步到外部状态
  const handleSetShopLocked = (locked: boolean) => {
    if (locked) {
      // 锁定时：保存当前商店英雄
      onShopLockedHeroesChange?.([...shopHeroes]);
    } else {
      // 解锁时：清空保存的英雄
      onShopLockedHeroesChange?.([]);
    }
    setShopLocked(locked);
    onShopLockedChange?.(locked);
  };
  
  // 拖拽相关状态
  const [draggingHero, setDraggingHero] = useState<{ hero: Hero; from: 'bench' | 'board'; x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [boardLayout, setBoardLayout] = useState({ x: 10, y: 0 });
  // 选中的单位（用于显示详情弹窗）
  const [selectedUnit, setSelectedUnit] = useState<Hero | null>(null);
  // 出售确认弹窗
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [heroToSell, setHeroToSell] = useState<{ hero: Hero; from: 'bench' | 'board'; x: number; y: number } | null>(null);
  
  // 动画值
  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 棋盘起始Y位置
  const BOARD_START_Y = 180;

  // 初始化
  useEffect(() => {
    if (initialHeroes.length > 0) {
      const onBoard: Hero[] = [];
      const onBench: Hero[] = [];
      
      initialHeroes.forEach(hero => {
        if (hero.isOnBoard && hero.boardX >= 0 && hero.boardY >= 0) {
          onBoard.push(hero);
        } else {
          onBench.push({ ...hero, isOnBoard: false, boardX: -1, boardY: -1 });
        }
      });
      
      const newBoard = new Map<string, Hero>();
      onBoard.forEach(hero => {
        newBoard.set(`${hero.boardX}_${hero.boardY}`, hero);
      });
      setBoardHeroes(newBoard);
      setBenchHeroes(onBench);
    }
    // 锁定状态：从保存的英雄中读取；非锁定状态：正常刷新
    if (externalShopLocked && externalShopLockedHeroes.length > 0) {
      setShopHeroes(externalShopLockedHeroes);
    } else {
      refreshShop();
    }
  }, []);

  // 同步金币（当从战斗结果直接进入下一场时，组件不会重新挂载）
  useEffect(() => {
    setCurrentGold(gold);
  }, [gold]);

  // 根据屏幕坐标获取格子位置（使用实际布局位置）
  const getCellFromPosition = (px: number, py: number): {x: number, y: number} | null => {
    const x = Math.floor((px - boardLayout.x) / CELL_SIZE);
    // 向上偏移 1/4 格，避免手指遮挡落点
    const offsetY = CELL_SIZE / 4;
    const y = Math.floor((py - boardLayout.y - offsetY) / CELL_SIZE);
    // 只在玩家区域 (y >= 4)
    if (x >= 0 && x < BOARD_WIDTH && y >= 4 && y < BOARD_HEIGHT) {
      return { x, y };
    }
    return null;
  };

  // 抽卡概率配置（按玩家等级）
  const getRarityProbabilities = (level: number): Record<number, number> => {
    const probabilities: Record<number, Record<number, number>> = {
      1: { 1: 70, 2: 25, 3: 5, 4: 0, 5: 0 },
      2: { 1: 65, 2: 30, 3: 5, 4: 0, 5: 0 },
      3: { 1: 59, 2: 30, 3: 11, 4: 0, 5: 0 },
      4: { 1: 53, 2: 30, 3: 15, 4: 2, 5: 0 },
      5: { 1: 47, 2: 30, 3: 19, 4: 4, 5: 0 },
      6: { 1: 41, 2: 29, 3: 20, 4: 10, 5: 0 },
      7: { 1: 35, 2: 27, 3: 24, 4: 14, 5: 0 },
      8: { 1: 29, 2: 25, 3: 26, 4: 20, 5: 0 },
      9: { 1: 22, 2: 23, 3: 25, 4: 26, 5: 4 },
      10: { 1: 18, 2: 20, 3: 22, 4: 30, 5: 5 },
    };
    return probabilities[level] || probabilities[1];
  };

  // 根据概率随机抽取一个稀有度
  const rollRarity = (level: number): number => {
    const probs = getRarityProbabilities(level);
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    for (let rarity = 1; rarity <= 5; rarity++) {
      cumulative += probs[rarity] || 0;
      if (rand < cumulative) {
        return rarity;
      }
    }
    return 1; // 默认返回1费
  };

  // 按稀有度分类的英雄ID
  const heroesByRarity: Record<number, string[]> = {
    1: ['soldier', 'peasant', 'skeleton_warrior', 'skeleton_archer', 'elf_archer', 'elf_scout', 'murloc_warrior'],
    2: ['dragon_warrior', 'naga_mage', 'element_guard', 'succubus'],
    3: ['shadow_assassin', 'tide_lord'],
    4: ['succubus_queen'],
    5: ['succubus_queen'], // 5费暂用4费替代
  };

  const refreshShop = () => {
    // 检查是否有免费刷新次数
    const hasFreeRefresh = freeRefreshCount > 0;
    
    // 如果没有免费刷新且金币不足，不执行
    if (!hasFreeRefresh && currentGold < 2) return;
    
    // 扣除金币或免费刷新次数
    if (hasFreeRefresh) {
      onFreeRefreshCountChange?.(freeRefreshCount - 1);
    } else {
      setCurrentGold(prev => prev - 2);
    }
    
    const newShop: Hero[] = [];
    
    // 生成4个英雄，按玩家等级概率
    for (let i = 0; i < 4; i++) {
      // 根据玩家等级随机抽取稀有度
      const rarity = rollRarity(playerLevel);
      
      // 从对应稀有度的英雄列表中随机选择一个
      const heroIds = heroesByRarity[rarity];
      const randomId = heroIds[Math.floor(Math.random() * heroIds.length)];
      
      if (!randomId) continue;
      
      const hero: Hero = {
        id: randomId + '_' + Date.now() + '_' + i,
        baseId: randomId,
        name: getHeroName(randomId),
        rarity: getHeroRarity(randomId),
        star: 0,
        faction: getHeroFaction(randomId),
        job: getHeroJob(randomId),
        hp: getHeroHp(randomId),
        maxHp: getHeroHp(randomId),
        attack: getHeroAttack(randomId),
        defense: getHeroDefense(randomId),
        speed: getHeroSpeed(randomId),
        range: getHeroRange(randomId),
        cost: getHeroCost(randomId),
        skill: { name: '技能', description: '英雄技能', effect: (_target: Hero, _self: Hero) => {} },
        isOnBoard: false,
        boardX: -1,
        boardY: -1,
        skillCooldown: 0,
      };
      newShop.push(hero);
    }
    setShopHeroes(newShop);
  };

  const getHeroName = (id: string): string => {
    const names: Record<string, string> = {
      // 1星
      'soldier': '新兵',
      'peasant': '农夫',
      'skeleton_warrior': '骷髅战士',
      'skeleton_archer': '骷髅弓手',
      'elf_archer': '精灵弓手',
      'elf_scout': '精灵斥候',
      'murloc_warrior': '鱼人战士',
      // 2星
      'dragon_warrior': '龙血战士',
      'naga_mage': '娜迦法师',
      'element_guard': '元素守卫',
      'succubus': '魅魔',
      // 3星
      'shadow_assassin': '暗影杀手',
      'tide_lord': '潮汐领主',
      // 4星
      'succubus_queen': '魅魔女王',
    };
    return names[id] || id;
  };

  const getHeroFaction = (id: string): Faction => {
    const factions: Record<string, Faction> = {
      'soldier': 'human', 'peasant': 'human',
      'skeleton_warrior': 'undead', 'skeleton_archer': 'undead',
      'elf_archer': 'elf', 'elf_scout': 'elf',
      'murloc_warrior': 'sea',
      'dragon_warrior': 'dragon', 'naga_mage': 'sea',
      'element_guard': 'element', 'succubus': 'demon',
      'shadow_assassin': 'elf', 'tide_lord': 'dragon',
      'succubus_queen': 'demon',
    };
    return factions[id] || 'human';
  };

  const getHeroRarity = (id: string): HeroRarity => {
    const rarities: Record<string, HeroRarity> = {
      'soldier': 1, 'peasant': 1, 'skeleton_warrior': 1, 'skeleton_archer': 1,
      'elf_archer': 1, 'elf_scout': 1, 'murloc_warrior': 1,
      'dragon_warrior': 2, 'naga_mage': 2, 'element_guard': 2, 'succubus': 2,
      'shadow_assassin': 3, 'tide_lord': 3,
      'succubus_queen': 4,
    };
    return rarities[id] || 1;
  };

  const getHeroJob = (id: string): Job => {
    const jobs: Record<string, Job> = {
      'soldier': 'warrior', 'peasant': 'slave',
      'skeleton_warrior': 'warrior', 'skeleton_archer': 'archer',
      'elf_archer': 'archer', 'elf_scout': 'assassin',
      'murloc_warrior': 'tank',
      'dragon_warrior': 'warrior', 'naga_mage': 'mage',
      'element_guard': 'tank', 'succubus': 'assassin',
      'shadow_assassin': 'assassin', 'tide_lord': 'mage',
      'succubus_queen': 'mage',
    };
    return jobs[id] || 'warrior';
  };

  const getHeroHp = (id: string): number => {
    const hps: Record<string, number> = {
      'soldier': 800, 'peasant': 600, 'skeleton_warrior': 700, 'skeleton_archer': 500,
      'elf_archer': 550, 'elf_scout': 600, 'murloc_warrior': 900,
      'dragon_warrior': 1200, 'naga_mage': 700, 'element_guard': 1100, 'succubus': 650,
      'shadow_assassin': 800, 'tide_lord': 900,
      'succubus_queen': 1100,
    };
    return hps[id] || 800;
  };

  const getHeroAttack = (id: string): number => {
    const attacks: Record<string, number> = {
      'soldier': 100, 'peasant': 80, 'skeleton_warrior': 110, 'skeleton_archer': 120,
      'elf_archer': 115, 'elf_scout': 130, 'murloc_warrior': 70,
      'dragon_warrior': 150, 'naga_mage': 180, 'element_guard': 90, 'succubus': 170,
      'shadow_assassin': 220, 'tide_lord': 200,
      'succubus_queen': 280,
    };
    return attacks[id] || 100;
  };

  const getHeroDefense = (id: string): number => {
    const defenses: Record<string, number> = {
      'soldier': 20, 'peasant': 10, 'skeleton_warrior': 15, 'skeleton_archer': 10,
      'elf_archer': 12, 'elf_scout': 8, 'murloc_warrior': 25,
      'dragon_warrior': 30, 'naga_mage': 15, 'element_guard': 35, 'succubus': 12,
      'shadow_assassin': 15, 'tide_lord': 20,
      'succubus_queen': 25,
    };
    return defenses[id] || 10;
  };

  const getHeroSpeed = (id: string): number => {
    const speeds: Record<string, number> = {
      'soldier': 70, 'peasant': 80, 'skeleton_warrior': 65, 'skeleton_archer': 75,
      'elf_archer': 80, 'elf_scout': 90, 'murloc_warrior': 60,
      'dragon_warrior': 75, 'naga_mage': 70, 'element_guard': 55, 'succubus': 85,
      'shadow_assassin': 95, 'tide_lord': 65,
      'succubus_queen': 75,
    };
    return speeds[id] || 70;
  };

  const getHeroRange = (id: string): number => {
    const ranges: Record<string, number> = {
      'soldier': 1, 'peasant': 1, 'skeleton_warrior': 1, 'skeleton_archer': 3,
      'elf_archer': 3, 'elf_scout': 1, 'murloc_warrior': 1,
      'dragon_warrior': 1, 'naga_mage': 2, 'element_guard': 1, 'succubus': 1,
      'shadow_assassin': 1, 'tide_lord': 2,
      'succubus_queen': 2,
    };
    return ranges[id] || 1;
  };

  const getHeroCost = (id: string): number => {
    const costs: Record<string, number> = {
      'soldier': 1, 'peasant': 1, 'skeleton_warrior': 1, 'skeleton_archer': 1,
      'elf_archer': 1, 'elf_scout': 1, 'murloc_warrior': 1,
      'dragon_warrior': 2, 'naga_mage': 2, 'element_guard': 2, 'succubus': 2,
      'shadow_assassin': 3, 'tide_lord': 3,
      'succubus_queen': 4,
    };
    return costs[id] || 1;
  };

  // 计算出售英雄返还的金币
  const calculateSellRefund = (hero: Hero): number => {
    const baseId = hero.baseId || hero.id;
    const baseCost = getHeroCost(baseId);
    // 总花费 = 购买一个的价格 × (当前星级 + 1)
    // 因为升星需要收集 3 个相同星级合成 1 个下一星级，所以每升一级需要 3 个
    // 例如：1星 → 2星 需要 2 个额外的，总共 3 个 → 总花费 3 × baseCost
    // 所以公式：总花费 = (3^star - 1)/2 × baseCost + baseCost = (3^star + 1)/2 × baseCost
    // 但为了简化，我们直接按实际理解：1星就是 1个，2星就是 3个，3星就是 9个
    // 升星后是 1星(0)、2星(1)、3星(2)
    const totalCount = Math.pow(3, hero.star);
    const totalCost = baseCost * totalCount;
    
    if (hero.star === 0) {
      // 未升过星（1星），返还全部
      return totalCost;
    } else {
      // 升过星，返还 50% 向上取整
      return Math.ceil(totalCost * 0.5);
    }
  };

  // 执行出售英雄
  const sellHero = () => {
    if (!heroToSell) return;
    
    const { hero, from, x, y } = heroToSell;
    const refund = calculateSellRefund(hero);
    
    // 返还金币
    setCurrentGold(prev => prev + refund);
    
    // 从对应位置移除
    if (from === 'bench') {
      // 从备战区移除
      setBenchHeroes(prev => prev.filter(h => h.id !== hero.id));
    } else if (from === 'board') {
      // 从棋盘移除
      const newBoard = new Map(boardHeroes);
      newBoard.delete(`${x}_${y}`);
      setBoardHeroes(newBoard);
    }
    
    // 关闭弹窗
    setSellModalVisible(false);
    setHeroToSell(null);
  };

  // 根据星级和稀有度排序棋子（返回从弱到强）
  const sortHeroesByStrength = (heroes: Hero[]): Hero[] => {
    return [...heroes].sort((a, b) => {
      // 先按星级排序（星级低的弱）
      if (a.star !== b.star) return a.star - b.star;
      // 再按稀有度排序（稀有度低的弱）
      if (a.rarity !== b.rarity) return a.rarity - b.rarity;
      // 最后按血量排序（血量低的弱）
      return a.hp - b.hp;
    });
  };

  // 处理人口超限，返回调整后的棋盘和备战区
  const adjustPopulation = (board: Map<string, Hero>, bench: Hero[]): { board: Map<string, Hero>, bench: Hero[] } => {
    const boardCount = board.size;
    if (boardCount <= maxPopulation) {
      return { board, bench };
    }
    
    const excessCount = boardCount - maxPopulation;
    const boardHeroes = Array.from(board.entries());
    
    // 排序找出最弱的棋子
    const sortedBoard = sortHeroesByStrength(boardHeroes.map(([_, hero]) => hero));
    const weakestHeroes = sortedBoard.slice(0, excessCount);
    
    let newBoard = new Map(board);
    let newBench = [...bench];
    
    // 移除最弱的棋子
    weakestHeroes.forEach(weakHero => {
      // 从棋盘移除
      for (const [key, hero] of newBoard.entries()) {
        if (hero.id === weakHero.id) {
          newBoard.delete(key);
          break;
        }
      }
      
      // 尝试放入备战区
      if (newBench.length < BENCH_SIZE) {
        newBench.push({ ...weakHero, isOnBoard: false, boardX: -1, boardY: -1 });
      } else {
        // 备战区已满，自动出售
        const refund = calculateSellRefund(weakHero);
        setCurrentGold(prev => prev + refund);
      }
    });
    
    return { board: newBoard, bench: newBench };
  };

  // 检查升星（同时检查备战区和棋盘）
  const checkAndUpgradeStar = (bench: Hero[], board: Map<string, Hero>): { bench: Hero[], board: Map<string, Hero> } => {
    // 合并所有英雄
    const allHeroes: Hero[] = [...bench];
    board.forEach(hero => allHeroes.push(hero));
    
    // 按 baseId 和 star 分组
    const groups = new Map<string, Hero[]>();
    
    allHeroes.forEach(hero => {
      const key = `${hero.baseId || hero.id}_${hero.star}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(hero);
    });
    
    let newBench = [...bench];
    let newBoard = new Map(board);
    
    groups.forEach((heroes, key) => {
      if (heroes.length >= 3) {
        // 移除这3个英雄
        const toRemove = heroes.slice(0, 3);
        toRemove.forEach(hero => {
          // 从备战区移除
          newBench = newBench.filter(h => h.id !== hero.id);
          // 从棋盘移除
          for (const [pos, h] of newBoard) {
            if (h.id === hero.id) {
              newBoard.delete(pos);
              break;
            }
          }
        });
        
        // 创建升星后的英雄
        const upgradedHero = { ...heroes[0] };
        const newStar = upgradedHero.star + 1;
        upgradedHero.star = newStar;
        upgradedHero.hp = (upgradedHero.hp || 800) * 2;
        upgradedHero.maxHp = (upgradedHero.maxHp || 800) * 2;
        upgradedHero.attack = (upgradedHero.attack || 100) * 2;
        upgradedHero.defense = (upgradedHero.defense || 30) * 2;
        
        // 放回备战区
        newBench.push(upgradedHero);
        
        // 递归检查是否可以继续升星
        const result = checkAndUpgradeStar(newBench, newBoard);
        newBench = result.bench;
        newBoard = result.board;
      }
    });
    
    return { bench: newBench, board: newBoard };
  };

  const buyHero = (hero: Hero) => {
    if (currentGold < hero.rarity) return;
    if (benchHeroes.length >= BENCH_SIZE) return;
    
    setCurrentGold(prev => prev - hero.rarity);
    
    // 添加到暂存区，然后检查升星（同时检查棋盘）
    const result = checkAndUpgradeStar([...benchHeroes, hero], boardHeroes);
    setBenchHeroes(result.bench);
    setBoardHeroes(result.board);
    setShopHeroes(prev => prev.filter(h => h.id !== hero.id));
  };

  const handleStartBattle = () => {
    const allHeroes: Hero[] = [];
    boardHeroes.forEach(hero => {
      allHeroes.push(hero);
    });
    benchHeroes.forEach(hero => {
      allHeroes.push({ ...hero, isOnBoard: false, boardX: -1, boardY: -1 });
    });
    
    if (boardHeroes.size === 0) return;
    
    // 处理人口超限
    const adjusted = adjustPopulation(boardHeroes, benchHeroes);
    const finalBoard = adjusted.board;
    const finalBench = adjusted.bench;
    
    // 更新备战区
    setBenchHeroes(finalBench);
    
    handleSetShopVisible(false);
    onStartBattle(Array.from(finalBoard.values()), allHeroes, currentGold);
  };

  // 记录拖拽起始位置，用于判断是点击还是拖拽
  const dragStartPos = useRef<{x: number, y: number} | null>(null);
  // 长按定时器引用
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 是否触发了长按
  const isLongPressTriggered = useRef(false);
  // 是否已经取消了长按
  const isLongPressCancelled = useRef(false);
  
  // 长按触发的时间阈值（毫秒）
  const LONG_PRESS_DURATION = 500;
  // 拖拽判断的距离阈值（像素）
  const DRAG_THRESHOLD = 10;
  
  // 创建拖拽处理器
  const createPanResponder = (hero: Hero, from: 'bench' | 'board', x: number, y: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // 重置状态
        isLongPressTriggered.current = false;
        isLongPressCancelled.current = false;
        
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
        
        // 记录初始触摸位置
        const startX = evt.nativeEvent.pageX;
        const startY = evt.nativeEvent.pageY;
        dragStartPos.current = { x: startX, y: startY };
        
        // 启动长按定时器
        longPressTimer.current = setTimeout(() => {
          // 长按触发！
          isLongPressTriggered.current = true;
          isLongPressCancelled.current = true;
          
          // 长按触发 - 打开出售确认弹窗
          setHeroToSell({ hero, from, x, y });
          setSellModalVisible(true);
        }, LONG_PRESS_DURATION);
        
        setDraggingHero({ hero, from, x, y });
        setDragPosition({ x: startX, y: startY });
        
        // 放大动画
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          useNativeDriver: true,
        }).start();
        
        // 计算初始悬停的格子
        const cell = getCellFromPosition(startX, startY);
        setHoveredCell(cell);
      },
      onPanResponderMove: (evt, gestureState) => {
        // 检查是否移动超过了拖拽阈值
        const startPos = dragStartPos.current;
        if (startPos && !isLongPressCancelled.current) {
          const moveDistance = Math.sqrt(
            Math.pow(evt.nativeEvent.pageX - startPos.x, 2) + 
            Math.pow(evt.nativeEvent.pageY - startPos.y, 2)
          );
          
          if (moveDistance >= DRAG_THRESHOLD) {
            // 取消长按定时器，开始拖拽
            isLongPressCancelled.current = true;
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }
        }
        
        // 更新拖拽位置（绝对坐标）
        const currentX = evt.nativeEvent.pageX;
        const currentY = evt.nativeEvent.pageY;
        setDragPosition({ x: currentX, y: currentY });
        
        // 移动时更新高亮格子
        const cell = getCellFromPosition(currentX, currentY);
        setHoveredCell(cell);
        
        // 同时更新 Animated 值用于平滑移动
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        // 清除长按定时器
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        
        pan.flattenOffset();
        
        // 缩小动画
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        
        // 判断动作类型
        const startPos = dragStartPos.current;
        const moveDistance = startPos ? Math.sqrt(
          Math.pow(evt.nativeEvent.pageX - startPos.x, 2) + 
          Math.pow(evt.nativeEvent.pageY - startPos.y, 2)
        ) : 0;
        
        // 优先级：长按 > 拖拽 > 点击
        if (isLongPressTriggered.current) {
          // 长按 - 已经触发过了，这里不需要额外处理
          console.log('长按释放');
        } else if (moveDistance >= DRAG_THRESHOLD) {
          // 拖拽 - 移动距离超过阈值
          // 获取释放位置的绝对坐标
          const releaseX = evt.nativeEvent.pageX;
          const releaseY = evt.nativeEvent.pageY;
        
        // 计算目标格子
        const targetCell = getCellFromPosition(releaseX, releaseY);
        
        if (targetCell) {
          const { x: targetX, y: targetY } = targetCell;
          const targetKey = `${targetX}_${targetY}`;
          
          const newBoard = new Map(boardHeroes);
          const existingHero = boardHeroes.get(targetKey);
          
          // 从源位置移除
          if (from === 'bench') {
            // 从暂存区移除被拖拽的英雄
            setBenchHeroes(prev => prev.filter(h => h.id !== hero.id));
          } else if (from === 'board') {
            // 从原棋盘位置移除
            newBoard.delete(`${x}_${y}`);
          }
          
          // 如果目标位置有英雄
          if (existingHero) {
            if (from === 'bench') {
              // 暂存区移到有英雄的格子：把原有英雄放回暂存区
              setBenchHeroes(prev => [...prev, { ...existingHero, isOnBoard: false, boardX: -1, boardY: -1 }]);
            } else if (from === 'board') {
              // 棋盘移到棋盘：交换位置
              newBoard.set(`${x}_${y}`, existingHero);
            }
          }
          
          // 放置新英雄到目标位置
          newBoard.set(targetKey, { ...hero, isOnBoard: true, boardX: targetX, boardY: targetY });
          setBoardHeroes(newBoard);
        } else {
          // 没有放到有效格子，检查是否放回暂存区
          // 棋盘高度是 8 * CELL_SIZE，从 boardLayout.y 开始
          // 备战区在棋盘下方，通过 screen height 来判断
          const BOARD_START_Y = 180;
          const BOARD_HEIGHT = CELL_SIZE * 8;
          const isOutsideBoard = releaseY < boardLayout.y || releaseY > boardLayout.y + BOARD_HEIGHT;
          
          if (isOutsideBoard && from === 'board') {
            // 从棋盘移回暂存区
            const newBoard = new Map(boardHeroes);
            newBoard.delete(`${x}_${y}`);
            setBoardHeroes(newBoard);
            setBenchHeroes(prev => [...prev, { ...hero, isOnBoard: false, boardX: -1, boardY: -1 }]);
          }
          // 如果是来自 bench 且没放到有效位置，什么都不做（英雄还在暂存区）
        }
        } else {
          // 点击 - 移动距离很小
          setSelectedUnit(hero);
        }
        
        // 清除拖拽状态
        setDraggingHero(null);
        setHoveredCell(null);
        pan.setValue({ x: 0, y: 0 });
        dragStartPos.current = null;
      },
    });
  };

  // 构建敌方棋子位置映射 - 使用 useMemo 避免每次渲染都重新创建
  const enemyBoardMap = useMemo(() => {
    const map = new Map<string, Hero>();
    enemyHeroes.forEach((hero, index) => {
      // 敌方棋子位置：在敌方区域（y < 4）随机或固定排列
      // 这里假设敌方棋子按顺序排列在敌方区域的前几行
      const enemyY = Math.floor(index / BOARD_WIDTH);
      const enemyX = index % BOARD_WIDTH;
      if (enemyY < 4) {  // 只在敌方区域
        map.set(`${enemyX}_${enemyY}`, hero);
      }
    });
    return map;
  }, [enemyHeroes]);

  // 渲染棋盘格子
  const renderBoardCell = (x: number, y: number) => {
    const key = `${x}_${y}`;
    const hero = boardHeroes.get(key);
    const enemyHero = enemyBoardMap.get(key);
    const isEnemyZone = y < 4;
    const isPlayerZone = y >= 4;
    const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
    
    // 拖拽时计算攻击范围（在所有区域显示，包括敌方区域）
    let isInAttackRange = false;
    if (draggingHero && hoveredCell) {
      const range = draggingHero.hero.range || 1;
      const targetX = hoveredCell.x;
      const targetY = hoveredCell.y;
      // 计算曼哈顿距离
      const distance = Math.abs(x - targetX) + Math.abs(y - targetY);
      isInAttackRange = distance <= range && distance > 0;
    }
    
    // 只用 PanResponder 处理，短按（移动<10px）时显示详情
    const panResponder = isPlayerZone && hero ? createPanResponder(hero, 'board', x, y) : { panHandlers: {} };
    
    return (
      <View
        key={key}
        style={[
          styles.cell,
          { 
            backgroundColor: isEnemyZone ? '#3a2a2a' : '#2a2a3a',
            borderColor: isPlayerZone ? '#4a4a6a' : '#444',
          },
          isPlayerZone && isHovered && styles.cellHovered,  // 绿色高亮目标格子
          isInAttackRange && styles.cellAttackRange,  // 黄色显示攻击范围（所有区域）
        ]}
      >
        {/* 己方棋子 */}
        {hero && isPlayerZone && (
          <View 
            style={[styles.heroInCell, { backgroundColor: RARITY_COLORS[hero.rarity] }]}
            {...panResponder.panHandlers}
          >
            <Text style={styles.heroNameCell}>{hero.name.slice(0, 2)}</Text>
            <Text style={styles.starText}>★{hero.star}</Text>
          </View>
        )}
        {/* 敌方棋子 */}
        {enemyHero && isEnemyZone && (
          <TouchableOpacity 
            style={[styles.heroInCell, { backgroundColor: '#ff4444' }]}
            onPress={() => setSelectedUnit(enemyHero)}
          >
            <Text style={styles.heroNameCell}>{enemyHero.name.slice(0, 2)}</Text>
            <Text style={styles.starText}>★{enemyHero.star}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // 渲染暂存区格子
  const renderBenchCell = (index: number) => {
    const hero = benchHeroes[index];
    const panResponder = hero ? createPanResponder(hero, 'bench', -1, index) : { panHandlers: {} };
    
    return (
      <View
        key={`bench_${index}`}
        style={styles.benchCell}
        {...panResponder.panHandlers}
      >
        {hero && (
          <View style={[styles.heroInBench, { backgroundColor: RARITY_COLORS[hero.rarity] }]}>
            <Text style={styles.heroNameBench}>{hero.name.slice(0, 2)}</Text>
            <Text style={styles.starText}>★{hero.star}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderShopHero = (hero: Hero) => {
    return (
      <TouchableOpacity
        key={hero.id}
        style={[styles.shopHero, { borderColor: RARITY_COLORS[hero.rarity] }]}
        onPress={() => buyHero(hero)}
      >
        <Text style={styles.shopHeroName}>{hero.name}</Text>
        <Text style={styles.shopHeroPrice}>💰{hero.rarity}</Text>
        <Text style={styles.rarityText}>{'★'.repeat(hero.rarity)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. 状态栏 */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.healthText}>❤️ {playerHealth}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.levelText}>✓ Lv.{playerLevel}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.popText}>👥 {boardHeroes.size}/{maxPopulation}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.goldText}>💰 {currentGold}</Text>
        </View>
      </View>
      
      {/* 1.5 连胜/连败状态栏 */}
      <View style={styles.statusBar}>
        {winStreak > 0 && (
          <View style={styles.statusItem}>
            <Text style={styles.streakText}>🔥 连胜 {winStreak}</Text>
          </View>
        )}
        {loseStreak > 0 && (
          <View style={styles.statusItem}>
            <Text style={[styles.streakText, {color: '#888'}]}>💀 连败 {loseStreak}</Text>
          </View>
        )}
        {currentGold >= 10 && (
          <View style={styles.statusItem}>
            <Text style={styles.interestText}>💡 利息 +{Math.min(5, Math.floor(currentGold / 10))}</Text>
          </View>
        )}
      </View>

      {/* 2. 遗物栏（占位） */}
      <View style={styles.relicsBar}>
        <Text style={styles.relicsText}>🎁 遗物栏（暂无）</Text>
      </View>

      {/* 3. 棋盘区域 */}
      <View style={styles.boardContainer} onLayout={(e) => {
        setBoardLayout({
          x: e.nativeEvent.layout.x,
          y: e.nativeEvent.layout.y,
        });
      }}>
        {/* 人口超限提示 - 浮层在敌方区域 */}
        {boardHeroes.size > maxPopulation && (
          <View style={styles.popWarningOverlay}>
            <Text style={styles.popWarningText}>⚠️ 人口已满</Text>
            <Text style={styles.popWarningText}>{boardHeroes.size}/{maxPopulation}</Text>
          </View>
        )}
        <View style={styles.board}>
          {Array.from({ length: BOARD_HEIGHT }).map((_, y) => (
            <View key={`row_${y}`} style={styles.boardRow}>
              {Array.from({ length: BOARD_WIDTH }).map((_, x) =>
                renderBoardCell(x, y)
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 4. 备战区 */}
      <View style={styles.benchContainer}>
        <Text style={styles.benchTitle}>📦 备战区</Text>
        <View style={styles.bench}>
          {Array.from({ length: BENCH_SIZE }).map((_, i) => renderBenchCell(i))}
        </View>
      </View>

      {/* 拖拽浮层 - 跟随手指 */}
      {draggingHero && (
        <Animated.View
          style={[
            styles.dragLayer,
            {
              left: dragPosition.x - CELL_SIZE / 2,
              top: dragPosition.y - CELL_SIZE / 2,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={[styles.heroInDrag, { backgroundColor: RARITY_COLORS[draggingHero.hero.rarity] }]}>
            <Text style={styles.heroNameDrag}>{draggingHero.hero.name.slice(0, 2)}</Text>
            <Text style={styles.starTextDrag}>★{draggingHero.hero.star}</Text>
          </View>
        </Animated.View>
      )}

      {/* 商店弹窗 */}
      <Modal
        visible={shopVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.shopModal}>
            <View style={styles.shopHeader}>
              <Text style={styles.shopTitle}>英雄商店</Text>
              <TouchableOpacity onPress={() => handleSetShopVisible(false)}>
                <Text style={styles.closeShopText}>关闭</Text>
              </TouchableOpacity>
            </View>
            
            {/* 抽卡概率显示 */}
            <View style={styles.probabilityBar}>
              <Text style={styles.probabilityTitle}>抽卡概率 (Lv.{playerLevel})</Text>
              <View style={styles.probabilityRow}>
                <Text style={styles.probabilityText}>🟢1费: {getRarityProbabilities(playerLevel)[1]}%</Text>
                <Text style={styles.probabilityText}>🔵2费: {getRarityProbabilities(playerLevel)[2]}%</Text>
                <Text style={styles.probabilityText}>🟣3费: {getRarityProbabilities(playerLevel)[3]}%</Text>
                {playerLevel >= 4 && <Text style={styles.probabilityText}>🟡4费: {getRarityProbabilities(playerLevel)[4]}%</Text>}
                {playerLevel >= 9 && <Text style={styles.probabilityText}>🟠5费: {getRarityProbabilities(playerLevel)[5]}%</Text>}
              </View>
            </View>
            
            <View style={styles.shopActions}>
              <TouchableOpacity 
                style={[styles.refreshButton, (currentGold < 2 && freeRefreshCount <= 0 || shopLocked) && styles.buttonDisabled]}
                onPress={refreshShop}
                disabled={currentGold < 2 && freeRefreshCount <= 0 || shopLocked}
              >
                <Text style={styles.refreshText}>
                  {freeRefreshCount > 0 ? `🔄 免费刷新 (${freeRefreshCount})` : `刷新 (💰2)`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.lockButton, shopLocked && styles.lockButtonActive]}
                onPress={() => handleSetShopLocked(!shopLocked)}
              >
                <Text style={[styles.lockButtonText, shopLocked && styles.lockButtonTextActive]}>
                  {shopLocked ? '🔒 已锁定' : '🔓 未锁定'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.shopHeroes}>
              {shopHeroes.map(renderShopHero)}
            </View>
          </View>
        </View>
      </Modal>

      {/* 底部按钮区域 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={[
            styles.bottomButton, 
            styles.levelUpButton,
            (playerLevel >= 10 || currentGold < levelUpCost) && styles.levelUpButtonDisabled
          ]}
          onPress={() => {
            if (playerLevel < 10 && currentGold >= levelUpCost) {
              onLevelUp?.();
            }
          }}
          disabled={playerLevel >= 10 || currentGold < levelUpCost}
        >
          <Text style={[
            styles.levelUpButtonText,
            (playerLevel >= 10 || currentGold < levelUpCost) && styles.levelUpButtonTextDisabled
          ]}>
            {playerLevel >= 10 ? '已满级' : `⬆️ ${levelUpCost}升级`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.bottomButton, styles.shopButton]}
          onPress={() => handleSetShopVisible(true)}
          disabled={shopVisible}
        >
          <Text style={styles.bottomButtonText}>🛒 商店</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.bottomButton, styles.startButton, boardHeroes.size === 0 && styles.startButtonDisabled]}
          onPress={handleStartBattle}
          disabled={boardHeroes.size === 0}
        >
          <Text style={styles.startButtonText}>开始战斗</Text>
        </TouchableOpacity>
      </View>

      {/* 单位详情弹窗 */}
      <UnitInfoModal
        visible={selectedUnit !== null}
        hero={selectedUnit}
        onClose={() => setSelectedUnit(null)}
      />

      {/* 出售确认弹窗 */}
      <Modal
        visible={sellModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.sellModalOverlay}>
          <View style={styles.sellModal}>
            <Text style={styles.sellModalTitle}>出售英雄</Text>
            <Text style={styles.sellModalText}>
              确定要出售 {heroToSell?.hero.name} 吗？
            </Text>
            {heroToSell && (
              <Text style={styles.refundText}>
                可返还金币：💰{calculateSellRefund(heroToSell.hero)}
              </Text>
            )}
            <View style={styles.sellModalButtons}>
              <TouchableOpacity
                style={[styles.sellButton, styles.cancelButton]}
                onPress={() => {
                  setSellModalVisible(false);
                  setHeroToSell(null);
                }}
              >
                <Text style={styles.sellButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sellButton, styles.confirmButton]}
                onPress={sellHero}
              >
                <Text style={styles.sellButtonText}>出售</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 10,
  },
  // 1. 状态栏
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 5,
  },
  statusItem: {
    alignItems: 'center',
  },
  streakText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: 'bold',
  },
  interestText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // 2. 遗物栏
  relicsBar: {
    backgroundColor: '#2a2a4a',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5,
    marginTop: 100,
  },
  relicsText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  healthText: {
    color: '#e94560',
    fontSize: 20,
    fontWeight: 'bold',
  },
  popText: {
    color: '#4ade80',
    fontSize: 20,
    fontWeight: 'bold',
  },
  popTextOver: {
    color: '#e94560',
  },
  levelText: {
    color: '#9C27B0',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // 人口超限浮层 - 显示在棋盘上方敌方区域
  popWarningOverlay: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  popWarningText: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 15,
  },
  bottomButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  shopButton: {
    backgroundColor: '#FF9800',
  },
  bottomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelUpButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  levelUpButtonDisabled: {
    backgroundColor: '#555',
  },
  levelUpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  levelUpButtonTextDisabled: {
    color: '#888',
  },
  backText: {
    color: '#fff',
    fontSize: 18,
  },
  goldText: {
    color: '#ffd700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#555',
  },
  startButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  boardContainer: {
    height: CELL_SIZE * 8,
    marginBottom: 5,
    position: 'relative',
  },
  sectionTitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  hintText: {
    color: '#4ade80',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
  benchTitle: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 3,
  },
  board: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 2,
    alignItems: 'center',
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellHovered: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  cellAttackRange: {
    backgroundColor: '#ffd700',
    borderColor: '#ffa500',
  },
  heroInCell: {
    width: CELL_SIZE - 6,
    height: CELL_SIZE - 6,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNameCell: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  benchContainer: {
    alignItems: 'center',
    paddingBottom: 5,
  },
  bench: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: CELL_SIZE * 4 + 8,
  },
  benchCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 4,
    margin: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInBench: {
    width: CELL_SIZE - 6,
    height: CELL_SIZE - 6,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNameBench: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  starText: {
    color: '#000',
    fontSize: 8,
    fontWeight: 'bold',
  },
  // 拖拽浮层样式
  dragLayer: {
    position: 'absolute',
    zIndex: 1000,
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInDrag: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  heroNameDrag: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  starTextDrag: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // 商店样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shopModal: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25,
    left: 0,
    right: 0,
    height: 4 * CELL_SIZE,
    backgroundColor: '#2a2a4a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  shopTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeShopText: {
    color: '#fff',
    fontSize: 16,
  },
  probabilityBar: {
    backgroundColor: '#2a2a3e',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  probabilityTitle: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
  probabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  probabilityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shopActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  lockButton: {
    backgroundColor: '#666',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  lockButtonActive: {
    backgroundColor: '#f44336',
  },
  lockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  lockButtonTextActive: {
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  refreshText: {
    color: '#fff',
    fontSize: 16,
  },
  shopHeroes: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopHero: {
    width: SCREEN_WIDTH * 0.18,
    height: 90,
    marginHorizontal: 2,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  shopHeroName: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  shopHeroPrice: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rarityText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
  },
  openShopButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  openShopText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 出售确认弹窗样式
  sellModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellModal: {
    backgroundColor: '#2a2a3a',
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH - 60,
    maxWidth: 400,
  },
  sellModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sellModalText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  refundText: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  sellModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sellButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  confirmButton: {
    backgroundColor: '#f44336',
  },
  sellButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BattlePrepScreen;
