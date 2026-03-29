import { BattleUnit, BattleState, Hero, ActiveSkill, PassiveSkill, SkillEffectType, PassiveSkillType, DamageNumber } from '../types';

// ==================== 基础配置 ====================
const TICK_INTERVAL = 100; // 每个 Tick 100ms
const BASE_ATTACK_INTERVAL = 1000; // 基础攻击间隔 1000ms
const BASE_MOVE_INTERVAL = 1500; // 基础移动间隔 1500ms（调快一倍）
const BATTLE_MAX_TIME = 90 * 1000; // 战斗最长90秒

// ==================== 创建战斗单位 ====================

export const createBattleUnit = (
  hero: Hero,
  x: number,
  y: number,
  isPlayer: boolean
): BattleUnit => {
  // 确保 hero 数据完整
  const safeHero = {
    ...hero,
    hp: hero.hp || 100,
    maxHp: hero.maxHp || 100,
    attack: hero.attack || 10,
    defense: hero.defense || 5,
    speed: hero.speed || 50,
    range: hero.range || 1,
    cost: hero.cost || 1,
    activeSkill: hero.activeSkill || undefined,
    passiveSkills: hero.passiveSkills || [],
  };

  // 计算攻击间隔和移动间隔
  const attackInterval = Math.max(200, BASE_ATTACK_INTERVAL * 100 / safeHero.speed);
  const moveInterval = Math.max(500, BASE_MOVE_INTERVAL * 100 / safeHero.speed);

  return {
    id: `${safeHero.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    hero: safeHero,
    x,
    y,
    currentHp: safeHero.maxHp,
    maxHp: safeHero.maxHp,
    isDead: false,
    isPlayer,
    // 战斗状态
    attackCooldown: attackInterval, // 初始可以攻击
    moveCooldown: moveInterval, // 初始可以移动
    // 技能
    skillCooldown: 0,
    // 增益/减益
    buffs: [],
    shield: 0,
    // 战斗统计
    totalDamage: 0,
    kills: 0,
  };
};

// ==================== 工具函数 ====================

// 计算两点距离（曼哈顿距离）
export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};

// 查找最近的敌方单位
export const findNearestEnemy = (
  unit: BattleUnit,
  enemies: BattleUnit[]
): BattleUnit | null => {
  const aliveEnemies = enemies.filter(e => !e.isDead);
  if (aliveEnemies.length === 0) return null;
  
  let nearest = aliveEnemies[0];
  let minDist = Infinity;
  
  aliveEnemies.forEach(enemy => {
    const dist = getDistance(unit.x, unit.y, enemy.x, enemy.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = enemy;
    }
  });
  
  return nearest;
};

// 检查是否在攻击范围内
export const isInAttackRange = (attacker: BattleUnit, target: BattleUnit): boolean => {
  const dist = getDistance(attacker.x, attacker.y, target.x, target.y);
  return dist <= attacker.hero.range;
};

// 检查格子是否被占用
const isCellOccupied = (
  x: number, 
  y: number, 
  allUnits: BattleUnit[], 
  excludeId: string
): boolean => {
  return allUnits.some(u => u.id !== excludeId && !u.isDead && u.x === x && u.y === y);
};

// ==================== 战斗逻辑 ====================

// 计算普攻伤害
export const calculateDamage = (
  attacker: BattleUnit, 
  defender: BattleUnit,
  isSkill: boolean = false
): { value: number; isCrit: boolean } => {
  let damage = attacker.hero.attack;
  
  // 被动技能：百分比伤害加成
  attacker.passiveDamageBonus = attacker.passiveDamageBonus || 0;
  damage += damage * attacker.passiveDamageBonus;
  
  // 技能伤害加成
  if (isSkill && attacker.skillDamageBonus) {
    damage += damage * attacker.skillDamageBonus;
  }
  
  // 防御减伤
  const defense = defender.hero.defense + (defender.armorBonus || 0);
  damage = Math.max(1, damage - defense * 0.5 + Math.random() * 20 - 10);
  
  // 暴击（基础15% + 被动加成）
  const critChance = 0.15 + (attacker.critChanceBonus || 0);
  const isCrit = Math.random() < critChance;
  if (isCrit) {
    const critDamage = 1.5 + (attacker.critDamageBonus || 0);
    damage = Math.floor(damage * critDamage);
  }
  
  return {
    value: Math.floor(damage),
    isCrit,
  };
};

// 执行攻击
export const performAttack = (attacker: BattleUnit, defender: BattleUnit): BattleLog => {
  if (attacker.isDead || defender.isDead) {
    return { type: 'attack', message: '' };
  }

  const { value: damage, isCrit } = calculateDamage(attacker, defender);
  
  // 生命偷取
  const lifeSteal = attacker.lifeSteal || 0;
  if (lifeSteal > 0) {
    const healAmount = Math.floor(damage * lifeSteal);
    attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
  }
  
  // 扣除护盾
  let remainingDamage = damage;
  if (defender.shield > 0) {
    if (defender.shield >= damage) {
      defender.shield -= damage;
      remainingDamage = 0;
    } else {
      remainingDamage -= defender.shield;
      defender.shield = 0;
    }
  }
  
  // 扣除血量
  defender.currentHp = Math.max(0, defender.currentHp - remainingDamage);
  
  // 统计
  attacker.totalDamage += damage;
  
  let message = `${attacker.hero.name} 攻击 ${defender.hero.name}`;
  if (isCrit) message += ' 暴击！';
  message += ` 造成 ${damage} 伤害`;
  if (defender.shield > 0) message += ` (护盾剩余 ${defender.shield})`;
  if (defender.currentHp <= 0) {
    defender.isDead = true;
    attacker.kills += 1;
    message += `，${defender.hero.name} 阵亡！`;
  }
  
  return { 
    type: 'attack', 
    message, 
    damage, 
    isCrit, 
    attackerId: attacker.id, 
    targetId: defender.id,
    targetX: defender.x,
    targetY: defender.y,
  };
};

// BFS计算最短路径（绕开障碍）
const findPathBFS = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  occupied: Set<string>,
  boardWidth: number,
  boardHeight: number
): number => {
  if (startX === endX && startY === endY) return 0;
  
  const visited = new Set<string>();
  const queue: { x: number; y: number; dist: number }[] = [];
  queue.push({ x: startX, y: startY, dist: 0 });
  visited.add(`${startX},${startY}`);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === endX && current.y === endY) return current.dist;
    
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (n.x < 0 || n.x >= boardWidth || n.y < 0 || n.y >= boardHeight) continue;
      if (occupied.has(key)) continue;
      if (visited.has(key)) continue;
      
      visited.add(key);
      queue.push({ x: n.x, y: n.y, dist: current.dist + 1 });
    }
  }
  
  return -1; // 无法到达
};

// 智能寻路：找到能攻击到敌人的最佳位置
const findBestAttackPosition = (
  unit: BattleUnit,
  target: BattleUnit,
  enemies: BattleUnit[],
  allies: BattleUnit[],
  boardWidth: number,
  boardHeight: number
): { x: number; y: number } | null => {
  const range = unit.hero.range;
  const allUnits = [...allies, ...enemies];
  const occupied = new Set<string>();
  
  // 记录所有被占用的格子
  allUnits.forEach(u => {
    if (!u.isDead && u.id !== unit.id) {
      occupied.add(`${u.x},${u.y}`);
    }
  });
  
  // 找到所有能攻击到敌人的格子
  const attackablePositions: { x: number; y: number; dist: number }[] = [];
  
  for (let x = 0; x < boardWidth; x++) {
    for (let y = 0; y < boardHeight; y++) {
      const distToTarget = Math.abs(x - target.x) + Math.abs(y - target.y);
      if (distToTarget <= range) {
        // 这个格子可以攻击到敌人
        const pathDist = findPathBFS(unit.x, unit.y, x, y, occupied, boardWidth, boardHeight);
        if (pathDist >= 0) {
          attackablePositions.push({ x, y, dist: pathDist });
        }
      }
    }
  }
  
  // 找到离自己最近的可攻击位置
  if (attackablePositions.length === 0) return null;
  
  attackablePositions.sort((a, b) => a.dist - b.dist);
  return { x: attackablePositions[0].x, y: attackablePositions[0].y };
};

// 移动单位（智能寻路）
export const moveUnit = (
  unit: BattleUnit,
  enemies: BattleUnit[],
  allies: BattleUnit[],
  boardWidth: number,
  boardHeight: number
): string => {
  const target = findNearestEnemy(unit, enemies);
  if (!target) return '';
  
  // 先检查是否已经在攻击范围内
  if (isInAttackRange(unit, target)) {
    return ''; // 已经在攻击范围内，不移动
  }
  
  // 找最佳攻击位置
  const bestPos = findBestAttackPosition(unit, target, enemies, allies, boardWidth, boardHeight);
  
  if (!bestPos) {
    return ''; // 找不到可移动的位置
  }
  
  // 沿着最短路径移动一格
  const allUnits = [...allies, ...enemies];
  const occupied = new Set<string>();
  allUnits.forEach(u => {
    if (!u.isDead && u.id !== unit.id) {
      occupied.add(`${u.x},${u.y}`);
    }
  });
  
  // 尝试四个方向，找最近的一格
  const neighbors = [
    { x: unit.x + 1, y: unit.y },
    { x: unit.x - 1, y: unit.y },
    { x: unit.x, y: unit.y + 1 },
    { x: unit.x, y: unit.y - 1 },
  ];
  
  let bestNextPos: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  
  for (const n of neighbors) {
    if (n.x < 0 || n.x >= boardWidth || n.y < 0 || n.y >= boardHeight) continue;
    if (occupied.has(`${n.x},${n.y}`)) continue;
    
    const pathDist = findPathBFS(n.x, n.y, bestPos.x, bestPos.y, occupied, boardWidth, boardHeight);
    if (pathDist >= 0 && pathDist < bestDist) {
      bestDist = pathDist;
      bestNextPos = n;
    }
  }
  
  if (bestNextPos) {
    unit.x = bestNextPos.x;
    unit.y = bestNextPos.y;
    return `${unit.hero.name} 移动到 (${unit.x}, ${unit.y})`;
  }
  
  return '';
};

// ==================== 技能系统 ====================

// 执行主动技能
export const performSkill = (
  skill: ActiveSkill,
  user: BattleUnit,
  enemies: BattleUnit[],
  allies: BattleUnit[]
): BattleLog[] => {
  const logs: BattleLog[] = [];
  
  if (skill.cooldown > 0) {
    return [{ type: 'skill', message: `${user.hero.name} 技能冷却中` }];
  }
  
  switch (skill.effect.type) {
    case 'damage': {
      // 单体技能
      if (skill.targetType === 'single') {
        const target = findNearestEnemy(user, enemies);
        if (target && isInAttackRange(user, target)) {
          // 计算技能伤害
          const skillDamage = Math.floor(user.hero.attack * skill.effect.value);
          const { value, isCrit } = calculateDamage(user, target, true);
          
          // 扣除护盾
          let remainingDamage = value;
          if (target.shield > 0) {
            if (target.shield >= remainingDamage) {
              target.shield -= remainingDamage;
              remainingDamage = 0;
            } else {
              remainingDamage -= target.shield;
              target.shield = 0;
            }
          }
          
          target.currentHp = Math.max(0, target.currentHp - remainingDamage);
          user.totalDamage += value;
          
          let message = `${user.hero.name} 使用 ${skill.name}`;
          if (isCrit) message += ' 暴击！';
          message += ` 对 ${target.hero.name} 造成 ${value} 伤害`;
          if (target.currentHp <= 0) {
            target.isDead = true;
            user.kills += 1;
            message += `，${target.hero.name} 阵亡！`;
          }
          logs.push({ 
            type: 'skill', 
            message, 
            damage: value, 
            isCrit, 
            attackerId: user.id, 
            targetId: target.id,
            targetX: target.x,
            targetY: target.y,
          });
        }
      }
      // AOE技能
      else if (skill.targetType === 'aoe') {
        const range = skill.range || 2;
        enemies.forEach(enemy => {
          if (!enemy.isDead && getDistance(user.x, user.y, enemy.x, enemy.y) <= range) {
            const { value, isCrit } = calculateDamage(user, enemy, true);
            
            let remainingDamage = value;
            if (enemy.shield > 0) {
              if (enemy.shield >= remainingDamage) {
                enemy.shield -= remainingDamage;
                remainingDamage = 0;
              } else {
                remainingDamage -= enemy.shield;
                enemy.shield = 0;
              }
            }
            
            enemy.currentHp = Math.max(0, enemy.currentHp - remainingDamage);
            user.totalDamage += value;
            
            let message = `${user.hero.name} 使用 ${skill.name}`;
            if (isCrit) message += ' 暴击！';
            message += ` 对 ${enemy.hero.name} 造成 ${value} 伤害`;
            if (enemy.currentHp <= 0) {
              enemy.isDead = true;
              user.kills += 1;
              message += `，${enemy.hero.name} 阵亡！`;
            }
            logs.push({ type: 'skill_aoe', message, damage: value, isCrit, attackerId: user.id, targetId: enemy.id, targetX: enemy.x, targetY: enemy.y });
          }
        });
      }
      break;
    }
    
    case 'shield': {
      // 为自己或队友施加护盾
      if (skill.targetType === 'self' || skill.targetType === 'single') {
        const target = skill.targetType === 'self' ? user : (findNearestEnemy(user, enemies) || user);
        const shieldAmount = Math.floor(target.maxHp * skill.effect.value);
        target.shield += shieldAmount;
        logs.push({ 
          type: 'skill', 
          message: `${user.hero.name} 使用 ${skill.name}，${target.hero.name} 获得 ${shieldAmount} 护盾` 
        });
      }
      // AOE护盾
      else if (skill.targetType === 'aoe') {
        const range = skill.range || 3;
        allies.forEach(ally => {
          if (!ally.isDead && getDistance(user.x, user.y, ally.x, ally.y) <= range) {
            const shieldAmount = Math.floor(ally.maxHp * skill.effect.value);
            ally.shield += shieldAmount;
            logs.push({ 
              type: 'skill', 
              message: `${user.hero.name} 使用 ${skill.name}，${ally.hero.name} 获得 ${shieldAmount} 护盾` 
            });
          }
        });
      }
      break;
    }
    
    case 'heal': {
      // 治疗
      const target = skill.targetType === 'self' ? user : (findNearestEnemy(user, allies.filter(a => a !== user)) || user);
      const healAmount = Math.floor(user.hero.attack * skill.effect.value);
      target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
      logs.push({ 
        type: 'skill', 
        message: `${user.hero.name} 使用 ${skill.name}，${target.hero.name} 恢复 ${healAmount} HP` 
      });
      break;
    }
    
    case 'buff': {
      // 增益
      const target = skill.targetType === 'self' ? user : (findNearestEnemy(user, enemies) || user);
      if (skill.effect.value > 0) {
        target.attackSpeedBonus = (target.attackSpeedBonus || 0) + skill.effect.value;
      }
      logs.push({ 
        type: 'skill', 
        message: `${user.hero.name} 使用 ${skill.name}，${target.hero.name} 攻击速度提升 ${skill.effect.value * 100}%` 
      });
      break;
    }
  }
  
  // 设置技能冷却
  user.skillCooldown = skill.cooldown;
  
  return logs;
};

// 触发被动技能
export const triggerPassiveSkill = (
  skill: PassiveSkill,
  user: BattleUnit,
  target: BattleUnit,
  enemies: BattleUnit[],
  allies: BattleUnit[]
): BattleLog | null => {
  switch (skill.type) {
    case 'life_steal':
      user.lifeSteal = (user.lifeSteal || 0) + skill.value;
      return { type: 'passive', message: `${user.hero.name} 获得 ${skill.value * 100}% 生命偷取` };
      
    case 'armor':
      user.armorBonus = (user.armorBonus || 0) + skill.value;
      return { type: 'passive', message: `${user.hero.name} 护甲 +${skill.value}` };
      
    case 'attack_speed':
      user.attackSpeedBonus = (user.attackSpeedBonus || 0) + skill.value;
      return { type: 'passive', message: `${user.hero.name} 攻击速度 +${skill.value * 100}%` };
      
    case 'crit':
      user.critChanceBonus = (user.critChanceBonus || 0) + skill.value;
      return { type: 'passive', message: `${user.hero.name} 暴击率 +${skill.value * 100}%` };
      
    case 'crit_damage':
      user.critDamageBonus = (user.critDamageBonus || 0) + skill.value;
      return { type: 'passive', message: `${user.hero.name} 暴击伤害 +${skill.value * 100}%` };
      
    case 'flat_damage':
      user.passiveDamageBonus = (user.passiveDamageBonus || 0) + skill.value;
      return { type: 'passive', message: `${user.hero.name} 伤害 +${skill.value}` };
      
    default:
      return null;
  }
};

// ==================== Tick 战斗主循环 ====================

// 日志类型
export interface BattleLog {
  type: 'tick' | 'attack' | 'skill' | 'skill_aoe' | 'passive' | 'move' | 'death' | 'win' | 'lose' | 'timeout';
  message: string;
  damage?: number;
  isCrit?: boolean;
  attackerId?: string;  // 攻击者ID
  targetId?: string;   // 目标ID，用于动画
  targetX?: number;    // 目标位置
  targetY?: number;
}

// 执行一个单位的 Tick
export const executeUnitTick = (
  unit: BattleUnit,
  enemies: BattleUnit[],
  allies: BattleUnit[],
  boardWidth: number,
  boardHeight: number
): BattleLog[] => {
  const logs: BattleLog[] = [];
  
  if (unit.isDead) return logs;
  
  // 减少冷却
  if (unit.attackCooldown > 0) unit.attackCooldown -= TICK_INTERVAL;
  if (unit.moveCooldown > 0) unit.moveCooldown -= TICK_INTERVAL;
  if (unit.skillCooldown > 0) unit.skillCooldown -= TICK_INTERVAL;
  
  // 减少buff持续时间
  if (unit.buffs) {
    unit.buffs = unit.buffs.filter(buff => {
      buff.duration -= 1;
      return buff.duration > 0;
    });
  }
  
  // 恢复生命（每秒约1%）
  if (unit.currentHp < unit.maxHp) {
    unit.currentHp = Math.min(unit.maxHp, unit.currentHp + unit.maxHp * 0.001 * TICK_INTERVAL / 1000);
  }
  
  // 找最近的敌人
  const target = findNearestEnemy(unit, enemies);
  if (!target) return logs;
  
  const inRange = isInAttackRange(unit, target);
  
  // 0. 即使在攻击范围内，如果攻击冷却中，也尝试移动（为了更流畅的走位）
  // 但优先攻击
  if (inRange && unit.attackCooldown <= 0) {
    // 攻击前触发被动（on_attack）
    unit.passiveSkills?.forEach(passive => {
      if (passive.trigger === 'on_attack') {
        const log = triggerPassiveSkill(passive, unit, target, enemies, allies);
        if (log) logs.push(log);
      }
    });
    
    const attackLog = performAttack(unit, target);
    if (attackLog.message) logs.push(attackLog);
    
    // 攻击后触发被动（on_hit）
    if (!target.isDead) {
      unit.passiveSkills?.forEach(passive => {
        if (passive.trigger === 'on_hit') {
          const log = triggerPassiveSkill(passive, unit, target, enemies, allies);
          if (log) logs.push(log);
        }
      });
    }
    
    // 击杀触发被动
    if (target.isDead) {
      unit.passiveSkills?.forEach(passive => {
        if (passive.trigger === 'on_kill') {
          const log = triggerPassiveSkill(passive, unit, target, enemies, allies);
          if (log) logs.push(log);
        }
      });
    }
    
    // 重置攻击冷却（考虑攻击速度加成）
    const attackSpeedBonus = unit.attackSpeedBonus || 0;
    const attackInterval = Math.max(200, BASE_ATTACK_INTERVAL * 100 / unit.hero.speed / (1 + attackSpeedBonus));
    unit.attackCooldown = attackInterval;
  }
  // 2. 攻击范围外 → 必须移动到可攻击范围
  // 3. 攻击范围内但攻击冷却中 → 也可以尝试移动到更好的位置（侧翼、背刺）
  else if (unit.moveCooldown <= 0) {
    const moveLog = moveUnit(unit, enemies, allies, boardWidth, boardHeight);
    if (moveLog) {
      logs.push({ type: 'move', message: moveLog });
      // 重置移动冷却
      const moveInterval = Math.max(500, BASE_MOVE_INTERVAL * 100 / unit.hero.speed);
      unit.moveCooldown = moveInterval;
    }
  }
  // 3. 检查是否释放主动技能
  else if (unit.activeSkill && unit.skillCooldown <= 0) {
    const skillLogs = performSkill(unit.activeSkill, unit, enemies, allies);
    logs.push(...skillLogs);
  }
  
  return logs;
};

// 检查战斗是否结束
export const checkBattleEnd = (
  state: BattleState
): 'player' | 'enemy' | 'ongoing' | 'timeout' => {
  // 检查是否超时
  if (state.gameTime >= BATTLE_MAX_TIME) {
    return 'timeout';
  }
  
  const playerAlive = state.playerUnits.filter(u => !u.isDead);
  const enemyAlive = state.enemyUnits.filter(u => !u.isDead);
  
  if (playerAlive.length === 0 && enemyAlive.length === 0) {
    return 'enemy'; // 算输
  }
  if (playerAlive.length === 0) return 'enemy';
  if (enemyAlive.length === 0) return 'player';
  
  return 'ongoing';
};

// 执行一个 Tick
export const executeTick = (
  state: BattleState,
  boardWidth: number,
  boardHeight: number
): BattleState => {
  // 所有存活单位并行行动
  const allUnits = [...state.playerUnits, ...state.enemyUnits]
    .filter(u => !u.isDead);
  
  const newLogs: BattleLog[] = [];
  
  // 战斗开始时触发被动
  if (state.gameTime === 0) {
    allUnits.forEach(unit => {
      unit.passiveSkills?.forEach(passive => {
        if (passive.trigger === 'on_battle_start') {
          const log = triggerPassiveSkill(passive, unit, unit as any, state.enemyUnits, state.playerUnits);
          if (log) newLogs.push(log);
        }
      });
    });
  }
  
  // 每个单位执行 tick
  allUnits.forEach(unit => {
    const enemies = unit.isPlayer ? state.enemyUnits : state.playerUnits;
    const allies = unit.isPlayer ? state.playerUnits : state.enemyUnits;
    const logs = executeUnitTick(unit, enemies, allies, boardWidth, boardHeight);
    newLogs.push(...logs);
  });
  
  // 检查战斗结束
  const result = checkBattleEnd(state);
  let battleResult = state.battleResult;
  if (result !== 'ongoing') {
    battleResult = result;
  }
  
  // 转换日志为字符串
  // 每个tick都记录日志，不再合并（方便调试）
  const logMessages = newLogs
    .filter(l => l.message)
    .map(l => l.message);
  
  // 从日志中提取攻击动画数据
  const attackAnims: { attackerId: string; targetId: string }[] = [];
  const newDamageNumbers: DamageNumber[] = [];
  const now = Date.now();
  
  newLogs.forEach(log => {
    if ((log.type === 'attack' || log.type === 'skill' || log.type === 'skill_aoe') && log.attackerId && log.targetId && log.damage && log.targetX !== undefined && log.targetY !== undefined) {
      attackAnims.push({ attackerId: log.attackerId, targetId: log.targetId });
      // 生成伤害数字
      newDamageNumbers.push({
        id: `dmg_${now}_${Math.random().toString(36).substr(2, 9)}`,
        targetId: log.targetId,
        damage: log.damage,
        isCrit: log.isCrit || false,
        x: log.targetX,
        y: log.targetY,
        timestamp: now,
      });
    }
  });
  
  // 保留之前的伤害数字（1秒内的），并添加新的
  const oldDamageNumbers = (state.damageNumbers || []).filter(d => now - d.timestamp < 1000);
  
  return {
    ...state,
    gameTime: state.gameTime + TICK_INTERVAL,
    tick: state.tick + 1,
    battleLog: [
      ...state.battleLog,
      ...(logMessages.length > 0 ? [`[${(state.gameTime / 1000).toFixed(1)}s] ${logMessages.join(' | ')}`] : []),
    ],
    attackAnims,  // 本次tick的攻击动画数据
    damageNumbers: [...oldDamageNumbers, ...newDamageNumbers],
    battleResult,
  };
};

// 初始化战斗状态
export const initBattleState = (
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[]
): BattleState => {
  // 初始化单位属性
  playerUnits.forEach(unit => {
    unit.attackCooldown = Math.random() * 500; // 随机初始攻击时间，避免同步
    unit.moveCooldown = Math.random() * 1000;
    unit.passiveSkills = unit.hero.passiveSkills || [];
    unit.activeSkill = unit.hero.activeSkill || null;
  });
  
  enemyUnits.forEach(unit => {
    unit.attackCooldown = Math.random() * 500;
    unit.moveCooldown = Math.random() * 1000;
    unit.passiveSkills = unit.hero.passiveSkills || [];
    unit.activeSkill = unit.hero.activeSkill || null;
  });
  
  return {
    playerUnits,
    enemyUnits,
    tick: 0,
    gameTime: 0,
    battleLog: ['战斗开始！'],
    attackAnims: [],
    damageNumbers: [],
    battleResult: 'ongoing',
  };
};
