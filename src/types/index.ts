// 英雄稀有度（1-5星，对应费用）
export type HeroRarity = 1 | 2 | 3 | 4 | 5;

// 阵营类型
export type Faction = 
  | 'human'       // 人类
  | 'undead'      // 亡灵
  | 'elf'         // 精灵
  | 'dragon'      // 龙裔
  | 'sea'         // 海洋
  | 'element'     // 元素
  | 'demon'       // 恶魔
  | 'slave_owner'; // 奴隶主

// 职业类型
export type Job = 
  | 'warrior'   // 战士
  | 'tank'      // 坦克
  | 'archer'    // 射手
  | 'mage'      // 法师
  | 'assassin'  // 刺客
  | 'slave';    // 奴隶

// 英雄类型
export interface Hero {
  id: string;
  baseId?: string;
  name: string;
  rarity: HeroRarity;
  star: number;
  faction: Faction;
  secondFaction?: Faction;
  job: Job;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;
  cost: number;
  skill: Skill;
  activeSkill?: ActiveSkill;
  passiveSkills?: PassiveSkill[];
  image?: string;
  // 自走棋相关
  isOnBoard: boolean;
  boardX: number;
  boardY: number;
  skillCooldown: number;
}

// 技能效果类型
export type SkillEffectType = 
  | 'damage'        // 伤害
  | 'heal'          // 治疗
  | 'shield'        // 护盾
  | 'buff'          // 增益
  | 'debuff'        // 减益
  | 'stun'          // 眩晕
  | 'teleport';     // 位移

// 被动技能类型
export type PassiveSkillType = 
  | 'flat_damage'   // 固定伤害附加
  | 'percent_damage' // 百分比伤害附加
  | 'attack_speed'  // 攻击速度提升
  | 'move_speed'    // 移动速度提升
  | 'crit'          // 暴击率提升
  | 'crit_damage'   // 暴击伤害提升
  | 'life_steal'    // 生命偷取
  | 'armor'         // 护甲提升
  | 'dodge';        // 闪避率

// 技能效果
export interface SkillEffect {
  type: SkillEffectType;
  value: number;
  duration?: number;
  chance?: number;
}

// 主动技能
export interface ActiveSkill {
  name: string;
  description: string;
  cooldown: number;
  cost?: number;
  effectType: SkillEffectType;
  effect: SkillEffect;
  targetType: 'single' | 'aoe' | 'self';
  range?: number;
}

// 被动技能
export interface PassiveSkill {
  name: string;
  description: string;
  type: PassiveSkillType;
  value: number;
  trigger: 'on_attack' | 'on_hit' | 'on_kill' | 'on_death' | 'on_battle_start';
}

// 增益/减益
export interface Buff {
  type: 'attack_speed' | 'move_speed' | 'attack' | 'defense' | 'shield';
  value: number;
  duration: number;
}

export interface Skill {
  name: string;
  description: string;
  effect: (target: Hero, self: Hero) => void;
}

// 战斗单位（英雄在战场上的实例）
export interface BattleUnit {
  id: string;
  hero: Hero;
  x: number;
  y: number;
  currentHp: number;
  maxHp: number;
  isDead: boolean;
  isPlayer: boolean;
  // 战斗属性
  attackCooldown: number;
  moveCooldown: number;
  skillCooldown: number;
  // 技能
  activeSkill?: ActiveSkill | null;
  passiveSkills?: PassiveSkill[];
  // 增益/减益
  buffs?: Buff[];
  shield: number;
  // 属性加成
  attackSpeedBonus?: number;
  moveSpeedBonus?: number;
  critChanceBonus?: number;
  critDamageBonus?: number;
  passiveDamageBonus?: number;
  armorBonus?: number;
  lifeSteal?: number;
  skillDamageBonus?: number;
  // 战斗统计
  totalDamage: number;
  kills: number;
}

// 战斗状态
// 攻击动画数据
export interface AttackAnimData {
  attackerId: string;
  targetId: string;
}

// 伤害数字
export interface DamageNumber {
  id: string;
  targetId: string;  // 目标单位ID
  damage: number;
  isCrit: boolean;
  x: number;  // 目标棋盘坐标
  y: number;
  timestamp: number;  // 创建时间
}

export interface BattleState {
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  tick: number;
  gameTime: number;
  battleLog: string[];
  attackAnims: AttackAnimData[];  // 本次tick的攻击动画数据
  damageNumbers: DamageNumber[];  // 伤害数字
  battleResult: 'player' | 'enemy' | 'ongoing' | 'timeout';
}

// 塔层信息
export interface TowerFloor {
  floor: number;
  enemyTeam: Hero[];
  name: string;
  description: string;
}

// 游戏存档
export interface GameSave {
  currentFloor: number;
  playerHeroes: Hero[];
  gold: number;
  winCount: number;
  loseCount: number;
}

// ==================== 地图系统 ====================

// 地图节点类型
export type MapNodeType = 
  | 'monster'    // 普通怪物
  | 'elite'      // 精英怪
  | 'shop'       // 商店
  | 'campfire'   // 篝火（休息）
  | 'event'      // 随机事件
  | 'boss';      // Boss

// 地图节点
export interface MapNode {
  id: string;
  type: MapNodeType;
  position: { x: number; y: number };
  visited: boolean;
  cleared: boolean;
  // 节点连接关系
  level: number;              // 节点所在层数
  previousNodes: string[];    // 上一层的连接节点ID
  nextNodes: string[];        // 下一层的连接节点ID
  // 战斗相关（怪物/精英/Boss）
  enemyTeam?: Hero[];
  // 商店相关
  shopItems?: ShopItem[];
  // 事件相关
  eventData?: RandomEvent;
}

// 节点连接
export interface MapConnection {
  from: string;
  to: string;
  color?: string;  // 调试用：标识连接来源
}

// 地图层
export interface MapFloor {
  floorNumber: number;
  nodes: MapNode[];
  connections: MapConnection[];
  isBossFloor: boolean;
}

// 完整地图
export interface GameMap {
  floors: MapFloor[];   // 各层数据
  currentFloorIndex: number;  // 当前在哪一层
  currentNodeId: string | null;  // 当前所在节点（正在进行的）
  lastClearedNodeId: string | null;  // 最后完成的节点（用于确定下一层可达节点）
  gold: number;         // 金币
}

// 商店物品
export interface ShopItem {
  id: string;
  type: 'hero' | 'upgrade' | 'relic';
  name: string;
  price: number;
  description: string;
}

// 随机事件
export interface RandomEvent {
  id: string;
  title: string;
  description: string;
  options: EventOption[];
}

export interface EventOption {
  text: string;
  result: string;
  effect: () => void;
}
