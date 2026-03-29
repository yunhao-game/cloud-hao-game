import { TowerFloor, Hero } from '../types';
import { getHeroById } from './heroes';

// 塔层数据 - 使用新英雄
export const towerFloors: TowerFloor[] = [
  {
    floor: 1,
    name: '第一层',
    description: '初入试炼之地',
    enemyTeam: ['peasant', 'skeleton_warrior'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 2,
    name: '第二层',
    description: '骷髅大军',
    enemyTeam: ['skeleton_warrior', 'skeleton_archer', 'skeleton_warrior'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 3,
    name: '第三层',
    description: '精灵森林',
    enemyTeam: ['elf_archer', 'elf_scout', 'elf_archer'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 4,
    name: '第四层',
    description: '鱼人海滩',
    enemyTeam: ['murloc_warrior', 'murloc_warrior', 'naga_mage'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 5,
    name: '第五层',
    description: '龙之巢穴',
    enemyTeam: ['dragon_warrior', 'dragon_warrior'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 6,
    name: '第六层',
    description: '娜迦深海',
    enemyTeam: ['naga_mage', 'naga_mage', 'murloc_warrior'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 7,
    name: '第七层',
    description: '元素领域',
    enemyTeam: ['element_guard', 'element_guard', 'naga_mage'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 8,
    name: '第八层',
    description: '恶魔深渊',
    enemyTeam: ['succubus', 'succubus', 'shadow_assassin'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 9,
    name: '第九层',
    description: '暗影杀手',
    enemyTeam: ['shadow_assassin', 'shadow_assassin', 'tide_lord'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
  {
    floor: 10,
    name: '第十层',
    description: '潮汐领主',
    enemyTeam: ['tide_lord', 'dragon_warrior', 'shadow_assassin'].map(id => getHeroById(id)!).filter(Boolean) as Hero[],
  },
];

// 获取指定层数的信息
export const getFloor = (floor: number): TowerFloor | undefined => 
  towerFloors.find(f => f.floor === floor);

// 获取总层数
export const getTotalFloors = (): number => towerFloors.length;
