import { Faction, Job, SynergyConfig } from '../types';

/**
 * 阵营羁绊配置表
 * TODO: 后续逐个填充具体效果
 */
export const FACTION_SYNERGIES: Record<Faction, SynergyConfig> = {
  human: {
    name: '人类',
    description: '人类羁绊效果（待实现）',
    thresholds: [3, 6, 9],
    effects: {
      // TODO: 实现3/6/9人口的具体效果
    }
  },
  undead: {
    name: '亡灵',
    description: '亡灵羁绊效果（待实现）',
    thresholds: [3, 6, 9],
    effects: {}
  },
  elf: {
    name: '精灵',
    description: '精灵羁绊效果（待实现）',
    thresholds: [3, 6, 9],
    effects: {}
  },
  dragon: {
    name: '龙裔',
    description: '龙裔羁绊效果（待实现）',
    thresholds: [3, 6, 9],
    effects: {}
  },
  sea: {
    name: '海洋',
    description: '海洋羁绊效果（待实现）',
    thresholds: [3, 6, 9],
    effects: {}
  },
  element: {
    name: '元素',
    description: '元素羁绊效果（待实现）',
    thresholds: [3, 6, 9],
    effects: {}
  },
  demon: {
    name: '恶魔',
    description: '恶魔羁绊效果（待实现）',
    thresholds: [3, 6, 9],
    effects: {}
  },
  slave_owner: {
    name: '奴隶主',
    description: '奴隶主羁绊效果（待实现）',
    thresholds: [2, 4, 6],
    effects: {}
  },
};

/**
 * 职业羁绊配置表
 */
export const JOB_SYNERGIES: Record<Job, SynergyConfig> = {
  warrior: {
    name: '战士',
    description: '战士羁绊效果：提供生命上限和攻击力加成',
    thresholds: [2, 4, 6],
    effects: {
      2: [
        { type: 'hp_percent', value: 10 },
        { type: 'attack_percent', value: 10 },
      ],
      4: [
        { type: 'hp_percent', value: 25 },
        { type: 'attack_percent', value: 20 },
      ],
      6: [
        { type: 'hp_percent', value: 50 },
        { type: 'attack_percent', value: 35 },
      ],
    }
  },
  tank: {
    name: '坦克',
    description: '坦克羁绊效果（待实现）',
    thresholds: [2, 4, 6],
    effects: {}
  },
  archer: {
    name: '射手',
    description: '射手羁绊效果（待实现）',
    thresholds: [2, 4, 6],
    effects: {}
  },
  mage: {
    name: '法师',
    description: '法师羁绊效果（待实现）',
    thresholds: [2, 4, 6],
    effects: {}
  },
  assassin: {
    name: '刺客',
    description: '刺客羁绊效果（待实现）',
    thresholds: [2, 4, 6],
    effects: {}
  },
  slave: {
    name: '奴隶',
    description: '奴隶羁绊效果（待实现）',
    thresholds: [2, 4, 6],
    effects: {}
  },
};

/**
 * 获取阵营羁绊配置
 */
export function getFactionSynergyConfig(faction: Faction): SynergyConfig {
  return FACTION_SYNERGIES[faction];
}

/**
 * 获取职业羁绊配置
 */
export function getJobSynergyConfig(job: Job): SynergyConfig {
  return JOB_SYNERGIES[job];
}
