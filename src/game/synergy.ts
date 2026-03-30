import { BattleUnit, Faction, Job, FactionCount, JobCount, ActiveSynergies, SynergyEffectConfig, SynergyEffectType } from '../types';
import { FACTION_SYNERGIES, JOB_SYNERGIES } from '../data/synergies';

/**
 * 统计队伍中各阵营的数量
 */
export function countFactions(units: BattleUnit[]): FactionCount {
  const counts: Record<Faction, number> = {
    human: 0,
    undead: 0,
    elf: 0,
    dragon: 0,
    sea: 0,
    element: 0,
    demon: 0,
    slave_owner: 0,
  };

  for (const unit of units) {
    const hero = unit.hero;
    counts[hero.faction]++;
    if (hero.secondFaction) {
      counts[hero.secondFaction]++;
    }
  }

  return counts;
}

/**
 * 统计队伍中各职业的数量
 */
export function countJobs(units: BattleUnit[]): JobCount {
  const counts: Record<Job, number> = {
    warrior: 0,
    tank: 0,
    archer: 0,
    mage: 0,
    assassin: 0,
    slave: 0,
  };

  for (const unit of units) {
    counts[unit.hero.job]++;
  }

  return counts;
}

/**
 * 获取激活的阵营羁绊
 * 返回达到阈值的阵营及其数量
 */
export function getActiveFactionSynergies(units: BattleUnit[]): { faction: Faction; count: number }[] {
  const factionCounts = countFactions(units);
  const active: { faction: Faction; count: number }[] = [];

  for (const [faction, count] of Object.entries(factionCounts) as [Faction, number][]) {
    const config = FACTION_SYNERGIES[faction];
    // 找到该阵营羁绊的最小激活阈值
    const minThreshold = config.thresholds[0];
    if (count >= minThreshold) {
      active.push({ faction, count });
    }
  }

  // 按数量降序排列
  active.sort((a, b) => b.count - a.count);
  return active;
}

/**
 * 获取激活的职业羁绊
 * 返回达到阈值的职业及其数量
 */
export function getActiveJobSynergies(units: BattleUnit[]): { job: Job; count: number }[] {
  const jobCounts = countJobs(units);
  const active: { job: Job; count: number }[] = [];

  for (const [job, count] of Object.entries(jobCounts) as [Job, number][]) {
    const config = JOB_SYNERGIES[job];
    const minThreshold = config.thresholds[0];
    if (count >= minThreshold) {
      active.push({ job, count });
    }
  }

  active.sort((a, b) => b.count - a.count);
  return active;
}

/**
 * 计算队伍的所有羁绊信息（包含效果）
 * 这是羁绊系统的核心入口函数
 */
export function calculateSynergyInfo(units: BattleUnit[]): ActiveSynergies {
  const factionSynergies = getActiveFactionSynergies(units);
  const jobSynergies = getActiveJobSynergies(units);

  return {
    faction: factionSynergies.map(f => ({
      source: 'faction' as const,
      name: FACTION_SYNERGIES[f.faction].name,
      key: f.faction,
      count: f.count,
      effects: getSynergyEffects('faction', f.faction, f.count),
    })),
    job: jobSynergies.map(j => ({
      source: 'job' as const,
      name: JOB_SYNERGIES[j.job].name,
      key: j.job,
      count: j.count,
      effects: getSynergyEffects('job', j.job, j.count),
    })),
  };
}

/**
 * 获取指定阵营/职业的羁绊效果列表
 * 供后续逐个实现羁绊效果时调用
 */
export function getSynergyEffects(
  source: 'faction' | 'job',
  key: Faction | Job,
  count: number
): SynergyEffectConfig[] {
  const config = source === 'faction' 
    ? FACTION_SYNERGIES[key as Faction] 
    : JOB_SYNERGIES[key as Job];
  
  if (!config || !config.effects) {
    return [];
  }

  // 找到当前数量达到的最高阈值
  const thresholds = config.thresholds.filter(t => count >= t);
  if (thresholds.length === 0) {
    return [];
  }

  const maxThreshold = Math.max(...thresholds);
  const effects = config.effects[maxThreshold];
  
  return effects || [];
}

/**
 * 应用羁绊效果到指定单位
 * 只有具有对应职业/阵营的单位才能获得加成
 */
function applySynergyToUnit(
  unit: BattleUnit,
  effects: SynergyEffectConfig[]
): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'hp_percent':
        // 生命上限加成
        unit.maxHp = Math.floor(unit.maxHp * (1 + effect.value / 100));
        unit.currentHp = unit.maxHp;
        break;
      case 'attack_percent':
        // 攻击力加成
        unit.hero.attack = Math.floor(unit.hero.attack * (1 + effect.value / 100));
        break;
      case 'defense_percent':
        // 防御力加成
        unit.armorBonus = (unit.armorBonus || 0) + effect.value;
        break;
      case 'attack_speed':
        // 攻击速度加成（减少攻击间隔）
        unit.attackCooldown = Math.floor(unit.attackCooldown * (1 - effect.value / 100));
        break;
      case 'crit':
        // 暴击率加成
        unit.critChanceBonus = (unit.critChanceBonus || 0) + effect.value / 100;
        break;
      case 'crit_damage':
        // 暴击伤害加成
        unit.critDamageBonus = (unit.critDamageBonus || 0) + effect.value / 100;
        break;
      case 'life_steal':
        // 生命偷取
        unit.lifeSteal = (unit.lifeSteal || 0) + effect.value / 100;
        break;
      case 'skill_damage':
        // 技能伤害加成
        unit.skillDamageBonus = (unit.skillDamageBonus || 0) + effect.value / 100;
        break;
      case 'dodge':
        // 闪避率（暂未实现）
        break;
      case 'gold_bonus':
      case 'exp_bonus':
        // 金币/经验加成（仅结算时生效，不在战斗单位上体现）
        break;
    }
  }
}

/**
 * 检查单位是否具有指定职业
 */
function hasJob(unit: BattleUnit, job: Job): boolean {
  return unit.hero.job === job;
}

/**
 * 检查单位是否具有指定阵营
 */
function hasFaction(unit: BattleUnit, faction: Faction): boolean {
  return unit.hero.faction === faction || unit.hero.secondFaction === faction;
}

/**
 * 应用羁绊效果到队伍
 * 只有具有对应职业/阵营的单位才能获得加成
 */
export function applySynergyEffects(units: BattleUnit[]): void {
  const synergyInfo = calculateSynergyInfo(units);
  
  // 应用职业羁绊效果（只有对应职业的单位获得加成）
  for (const jobSynergy of synergyInfo.job) {
    const { key, effects } = jobSynergy;
    for (const unit of units) {
      if (hasJob(unit, key as Job)) {
        applySynergyToUnit(unit, effects);
      }
    }
  }
  
  // 应用阵营羁绊效果（只有对应阵营的单位获得加成）
  for (const factionSynergy of synergyInfo.faction) {
    const { key, effects } = factionSynergy;
    for (const unit of units) {
      if (hasFaction(unit, key as Faction)) {
        applySynergyToUnit(unit, effects);
      }
    }
  }
}

/**
 * 初始化战斗内本地属性（基于全局基础属性）
 * 并应用羁绊效果
 * 
 * 调用时机：
 * - 进入战斗节点
 * - 英雄上阵
 * - 英雄下阵
 * - 开始战斗自动处理超人口棋子下阵后
 * - 升星后
 */
export function initializeLocalStatsAndApplySynergy(units: BattleUnit[]): void {
  for (const unit of units) {
    // 初始化战斗内本地属性（从全局基础属性复制）
    unit.localStats = {
      hp: unit.hero.maxHp,
      maxHp: unit.hero.maxHp,
      attack: unit.hero.attack,
      defense: unit.hero.defense,
      speed: unit.hero.speed,
      range: unit.hero.range,
    };
  }
  
  // 应用羁绊效果到本地属性
  applySynergyToLocalStats(units);
}

/**
 * 仅应用羁绊效果到现有本地属性
 * （不重新初始化，直接在现有基础上修改）
 */
function applySynergyToLocalStats(units: BattleUnit[]): void {
  const synergyInfo = calculateSynergyInfo(units);
  
  // 重置属性加成
  for (const unit of units) {
    if (!unit.localStats) {
      unit.localStats = {
        hp: unit.hero.maxHp,
        maxHp: unit.hero.maxHp,
        attack: unit.hero.attack,
        defense: unit.hero.defense,
        speed: unit.hero.speed,
        range: unit.hero.range,
      };
    } else {
      // 重新从基础属性开始
      unit.localStats.maxHp = unit.hero.maxHp;
      unit.localStats.attack = unit.hero.attack;
      unit.localStats.defense = unit.hero.defense;
      unit.localStats.speed = unit.hero.speed;
      unit.localStats.range = unit.hero.range;
    }
  }
  
  // 应用职业羁绊效果
  for (const jobSynergy of synergyInfo.job) {
    const { key, effects } = jobSynergy;
    for (const unit of units) {
      if (hasJob(unit, key as Job)) {
        applyEffectToLocalStats(unit, effects);
      }
    }
  }
  
  // 应用阵营羁绊效果
  for (const factionSynergy of synergyInfo.faction) {
    const { key, effects } = factionSynergy;
    for (const unit of units) {
      if (hasFaction(unit, key as Faction)) {
        applyEffectToLocalStats(unit, effects);
      }
    }
  }
  
  // 更新 currentHp（如果有变化的话按比例调整）
  for (const unit of units) {
    if (unit.localStats) {
      // 保持当前血量比例
      const hpRatio = unit.currentHp / unit.maxHp;
      unit.maxHp = unit.localStats.maxHp;
      unit.currentHp = Math.floor(unit.maxHp * hpRatio);
    }
  }
}

/**
 * 将羁绊效果应用到单位的本地属性
 */
function applyEffectToLocalStats(
  unit: BattleUnit,
  effects: SynergyEffectConfig[]
): void {
  if (!unit.localStats) return;
  
  for (const effect of effects) {
    switch (effect.type) {
      case 'hp_percent':
        unit.localStats.maxHp = Math.floor(unit.localStats.maxHp * (1 + effect.value / 100));
        break;
      case 'attack_percent':
        unit.localStats.attack = Math.floor(unit.localStats.attack * (1 + effect.value / 100));
        break;
      case 'defense_percent':
        // 防御力加成暂存在 armorBonus 中
        unit.armorBonus = (unit.armorBonus || 0) + effect.value;
        break;
      case 'attack_speed':
        unit.attackSpeedBonus = (unit.attackSpeedBonus || 0) + effect.value / 100;
        break;
      case 'crit':
        unit.critChanceBonus = (unit.critChanceBonus || 0) + effect.value / 100;
        break;
      case 'crit_damage':
        unit.critDamageBonus = (unit.critDamageBonus || 0) + effect.value / 100;
        break;
      case 'life_steal':
        unit.lifeSteal = (unit.lifeSteal || 0) + effect.value / 100;
        break;
      case 'skill_damage':
        unit.skillDamageBonus = (unit.skillDamageBonus || 0) + effect.value / 100;
        break;
      case 'dodge':
      case 'gold_bonus':
      case 'exp_bonus':
        // 暂未实现
        break;
    }
  }
}

/**
 * 重新计算羁绊效果
 * 在以下时机调用：
 * - 进入战斗节点
 * - 英雄上阵/下阵
 * - 开始战斗自动处理超人口棋子后
 * - 升星后
 */
export function recalculateSynergies(units: BattleUnit[]): void {
  applySynergyToLocalStats(units);
}
