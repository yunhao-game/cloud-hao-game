import { Hero, Faction, Job, HeroRarity } from '../types';

// 基础英雄数据（不含自走棋字段）
interface BaseHero {
  id: string;
  name: string;
  rarity: HeroRarity;
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
  skill: {
    name: string;
    description: string;
    effect: (target: Hero, self: Hero) => void;
  };
}

// 转换为完整英雄（含自走棋字段）
const toHero = (base: BaseHero): Hero => ({
  ...base,
  star: 0,
  isOnBoard: false,
  boardX: -1,
  boardY: -1,
  skillCooldown: 0,
});

// 13个英雄数据
export const baseHeroes: BaseHero[] = [
  // ===== 1星英雄（7个）=====
  {
    id: 'soldier',
    name: '新兵',
    rarity: 1,
    faction: 'human',
    job: 'warrior',
    hp: 800,
    maxHp: 800,
    attack: 100,
    defense: 20,
    speed: 70,
    range: 1,
    cost: 1,
    skill: {
      name: '盾击',
      description: '造成100%伤害',
      effect: () => {},
    },
  },
  {
    id: 'peasant',
    name: '农夫',
    rarity: 1,
    faction: 'human',
    job: 'slave',
    hp: 600,
    maxHp: 600,
    attack: 80,
    defense: 10,
    speed: 80,
    range: 1,
    cost: 1,
    skill: {
      name: '冲锋',
      description: '快速突进到敌人身前',
      effect: () => {},
    },
  },
  {
    id: 'skeleton_warrior',
    name: '骷髅战士',
    rarity: 1,
    faction: 'undead',
    job: 'warrior',
    hp: 700,
    maxHp: 700,
    attack: 110,
    defense: 15,
    speed: 65,
    range: 1,
    cost: 1,
    skill: {
      name: '骨刃',
      description: '造成110%伤害',
      effect: () => {},
    },
  },
  {
    id: 'skeleton_archer',
    name: '骷髅弓手',
    rarity: 1,
    faction: 'undead',
    job: 'archer',
    hp: 500,
    maxHp: 500,
    attack: 120,
    defense: 10,
    speed: 75,
    range: 3,
    cost: 1,
    skill: {
      name: '箭雨',
      description: '远程射击',
      effect: () => {},
    },
  },
  {
    id: 'elf_archer',
    name: '精灵弓手',
    rarity: 1,
    faction: 'elf',
    job: 'archer',
    hp: 550,
    maxHp: 550,
    attack: 115,
    defense: 12,
    speed: 80,
    range: 3,
    cost: 1,
    skill: {
      name: '精准射击',
      description: '高精度远程攻击',
      effect: () => {},
    },
  },
  {
    id: 'elf_scout',
    name: '精灵斥候',
    rarity: 1,
    faction: 'elf',
    job: 'assassin',
    hp: 600,
    maxHp: 600,
    attack: 130,
    defense: 8,
    speed: 90,
    range: 1,
    cost: 1,
    skill: {
      name: '背刺',
      description: '从背后攻击造成额外伤害',
      effect: () => {},
    },
  },
  {
    id: 'murloc_warrior',
    name: '鱼人战士',
    rarity: 1,
    faction: 'sea',
    job: 'tank',
    hp: 900,
    maxHp: 900,
    attack: 70,
    defense: 25,
    speed: 60,
    range: 1,
    cost: 1,
    skill: {
      name: '鱼鳞护甲',
      description: '获得额外护甲',
      effect: () => {},
    },
  },

  // ===== 2星英雄（4个）=====
  {
    id: 'dragon_warrior',
    name: '龙血战士',
    rarity: 2,
    faction: 'dragon',
    job: 'warrior',
    hp: 1200,
    maxHp: 1200,
    attack: 150,
    defense: 30,
    speed: 75,
    range: 1,
    cost: 2,
    skill: {
      name: '龙吟',
      description: '提升周围友军攻击',
      effect: () => {},
    },
  },
  {
    id: 'naga_mage',
    name: '娜迦法师',
    rarity: 2,
    faction: 'sea',
    job: 'mage',
    hp: 700,
    maxHp: 700,
    attack: 180,
    defense: 15,
    speed: 70,
    range: 2,
    cost: 2,
    skill: {
      name: '水球',
      description: '范围水系伤害',
      effect: () => {},
    },
  },
  {
    id: 'element_guard',
    name: '元素守卫',
    rarity: 2,
    faction: 'element',
    job: 'tank',
    hp: 1100,
    maxHp: 1100,
    attack: 90,
    defense: 35,
    speed: 55,
    range: 1,
    cost: 2,
    skill: {
      name: '护盾',
      description: '获得临时护甲',
      effect: () => {},
    },
  },
  {
    id: 'succubus',
    name: '魅魔',
    rarity: 2,
    faction: 'demon',
    job: 'assassin',
    hp: 650,
    maxHp: 650,
    attack: 170,
    defense: 12,
    speed: 85,
    range: 1,
    cost: 2,
    skill: {
      name: '魅惑',
      description: '迷惑敌人',
      effect: () => {},
    },
  },

  // ===== 3星英雄（2个）=====
  {
    id: 'shadow_assassin',
    name: '暗影杀手',
    rarity: 3,
    faction: 'elf',
    secondFaction: 'demon',
    job: 'assassin',
    hp: 800,
    maxHp: 800,
    attack: 220,
    defense: 15,
    speed: 95,
    range: 1,
    cost: 3,
    skill: {
      name: '致命一击',
      description: '暴击伤害提升',
      effect: () => {},
    },
  },
  {
    id: 'tide_lord',
    name: '潮汐领主',
    rarity: 3,
    faction: 'dragon',
    secondFaction: 'sea',
    job: 'mage',
    hp: 900,
    maxHp: 900,
    attack: 200,
    defense: 20,
    speed: 65,
    range: 2,
    cost: 3,
    skill: {
      name: '海啸',
      description: '巨浪造成大量伤害',
      effect: () => {},
    },
  },

  // ===== 4星英雄（1个）=====
  {
    id: 'succubus_queen',
    name: '魅魔女王',
    rarity: 4,
    faction: 'demon',
    secondFaction: 'slave_owner',
    job: 'mage',
    hp: 1100,
    maxHp: 1100,
    attack: 280,
    defense: 25,
    speed: 75,
    range: 2,
    cost: 4,
    skill: {
      name: '深渊魅惑',
      description: '魅惑敌人并造成大量魔法伤害',
      effect: () => {},
    },
  },
];

// 导出转换后的完整英雄数据
export const heroes: Hero[] = baseHeroes.map(toHero);

// 根据 ID 获取英雄
export const getHeroById = (id: string): Hero | undefined => {
  return heroes.find(h => h.id === id);
};
