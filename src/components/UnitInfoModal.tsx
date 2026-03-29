import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView, Image } from 'react-native';
import { Hero, ActiveSkill, PassiveSkill } from '../types';

// 立绘图片映射
const PORTRAIT_IMAGES: Record<string, any> = {
  // 1星英雄
  '新兵': require('../../assets/portraits/soldier_portrait.png'),
  'soldier': require('../../assets/portraits/soldier_portrait.png'),
  '农夫': require('../../assets/portraits/farmer_portrait.png'),
  'peasant': require('../../assets/portraits/farmer_portrait.png'),
  '骷髅战士': require('../../assets/portraits/skeleton_warrior_portrait.png'),
  'skeleton_warrior': require('../../assets/portraits/skeleton_warrior_portrait.png'),
  '骷髅弓手': require('../../assets/portraits/skeleton_archer_portrait.png'),
  'skeleton_archer': require('../../assets/portraits/skeleton_archer_portrait.png'),
  '精灵弓手': require('../../assets/portraits/elf_archer_portrait.png'),
  'elf_archer': require('../../assets/portraits/elf_archer_portrait.png'),
  '精灵斥候': require('../../assets/portraits/elf_scout_portrait.png'),
  'elf_scout': require('../../assets/portraits/elf_scout_portrait.png'),
  '鱼人战士': require('../../assets/portraits/murloc_warrior_portrait.png'),
  'murloc_warrior': require('../../assets/portraits/murloc_warrior_portrait.png'),
  // 2星英雄
  '龙血战士': require('../../assets/portraits/dragon_warrior_portrait.png'),
  'dragon_warrior': require('../../assets/portraits/dragon_warrior_portrait.png'),
  '娜迦法师': require('../../assets/portraits/naga_mage_portrait.png'),
  'naga_mage': require('../../assets/portraits/naga_mage_portrait.png'),
  '元素守卫': require('../../assets/portraits/element_guard_portrait.png'),
  'element_guard': require('../../assets/portraits/element_guard_portrait.png'),
  '魅魔': require('../../assets/portraits/succubus_portrait.png'),
  'succubus': require('../../assets/portraits/succubus_portrait.png'),
  // 3星英雄
  '暗影杀手': require('../../assets/portraits/shadow_assassin_portrait.png'),
  'shadow_assassin': require('../../assets/portraits/shadow_assassin_portrait.png'),
  '潮汐领主': require('../../assets/portraits/tidal_lord_portrait.png'),
  'tide_lord': require('../../assets/portraits/tidal_lord_portrait.png'),
  // 4星英雄
  '魅魔女王': require('../../assets/portraits/succubus_queen_portrait.png'),
  'succubus_queen': require('../../assets/portraits/succubus_queen_portrait.png'),
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_WIDTH = SCREEN_WIDTH * 0.9;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.55;

// 稀有度颜色（作为弹窗背景/边框）
const RARITY_COLORS: Record<number, string> = {
  1: '#FFFFFF',  // 白色普通
  2: '#4CAF50',  // 绿色优秀
  3: '#2196F3',  // 蓝色稀有
  4: '#9C27B0',  // 紫色史诗
  5: '#FF9800',  // 橙色传说
};

interface UnitInfoModalProps {
  visible: boolean;
  hero: Hero | null;
  onClose: () => void;
}

export const UnitInfoModal: React.FC<UnitInfoModalProps> = ({
  visible,
  hero,
  onClose,
}) => {
  if (!hero) return null;

  // 生成星级显示（只显示升星数，star 属性）
  const renderStars = () => {
    const stars = [];
    for (let i = 0; i < 3; i++) {  // 最多3星
      stars.push(
        <Text key={i} style={styles.star}>
          {i < hero.star ? '⭐' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  // 阵营颜色
  const getFactionColor = (faction: string) => {
    switch (faction) {
      case 'human': return '#4ade80';
      case 'undead': return '#9ca3af';
      case 'elf': return '#22c55e';
      case 'dragon': return '#f97316';
      case 'sea': return '#0ea5e9';
      case 'element': return '#a855f7';
      case 'demon': return '#ef4444';
      case 'slave_owner': return '#7c3aed'; // 紫色奴隶主
      case 'demon': return '#ef4444';
      default: return '#fcd34d';
    }
  };

  // 职业显示
  const getJobName = (job: string) => {
    const jobNames: Record<string, string> = {
      warrior: '战士',
      mage: '法师',
      ranger: '游侠',
      assassin: '刺客',
      tank: '坦克',
      healer: '辅助',
    };
    return jobNames[job] || job;
  };

  // 获取稀有度颜色
  const rarityColor = RARITY_COLORS[hero.rarity] || '#FFFFFF';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          {/* 弹窗背景使用稀有度颜色 */}
          <View style={[styles.modal, { borderColor: rarityColor }]}>
            {/* 左边区域 - 立绘（加宽到1.5倍） */}
            <View style={[styles.portraitArea, { backgroundColor: rarityColor + '20' }]}>
              {PORTRAIT_IMAGES[hero.name] ? (
                <Image 
                  source={PORTRAIT_IMAGES[hero.name]} 
                  style={styles.portraitImage}
                  resizeMode="contain"
                />
              ) : (
                <>
                  <Text style={[styles.portraitPlaceholder, { color: rarityColor }]}>
                    {hero.name[0]}
                  </Text>
                  <Text style={[styles.portraitName, { color: rarityColor }]}>{hero.name}</Text>
                </>
              )}
              {/* 显示稀有度标签 */}
              <Text style={[styles.rarityLabel, { color: rarityColor }]}>
                {hero.rarity === 1 ? '普通' : hero.rarity === 2 ? '优秀' : hero.rarity === 3 ? '稀有' : hero.rarity === 4 ? '史诗' : '传说'}
              </Text>
            </View>

            {/* 右边区域 - 属性信息 */}
            <ScrollView style={styles.infoArea} showsVerticalScrollIndicator={false}>
              {/* 星级 */}
              <View style={styles.starsContainer}>
                <Text style={styles.starLabel}>升星：</Text>
                {renderStars()}
              </View>

              {/* 名称和阵营 */}
              <View style={styles.headerRow}>
                <Text style={styles.heroName}>{hero.name}</Text>
                <Text style={[styles.factionTag, { color: getFactionColor(hero.faction) }]}>
                  {hero.faction} · {getJobName(hero.job)}
                </Text>
              </View>

              {/* 分割线 */}
              <View style={styles.divider} />

              {/* 基础属性 - 一行一个 */}
              <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>❤️ 生命</Text>
                  <Text style={styles.statValue}>{hero.maxHp}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>⚔️ 攻击</Text>
                  <Text style={styles.statValue}>{hero.attack}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>🛡️ 防御</Text>
                  <Text style={styles.statValue}>{hero.defense}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>⚡ 速度</Text>
                  <Text style={styles.statValue}>{hero.speed}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>🎯 攻击范围</Text>
                  <Text style={styles.statValue}>{hero.range}</Text>
                </View>
              </View>

              {/* 分割线 */}
              <View style={styles.divider} />

              {/* 主动技能 */}
              {hero.activeSkill && (
                <View style={styles.skillContainer}>
                  <Text style={styles.skillTitle}>🎯 主动技能</Text>
                  <Text style={styles.skillName}>{hero.activeSkill.name}</Text>
                  <Text style={styles.skillDesc}>{hero.activeSkill.description || '暂无描述'}</Text>
                </View>
              )}

              {/* 被动技能 */}
              {hero.passiveSkills && hero.passiveSkills.length > 0 && (
                <View style={styles.skillContainer}>
                  <Text style={styles.skillTitle}>✨ 被动技能</Text>
                  {hero.passiveSkills.map((skill: PassiveSkill, index: number) => (
                    <View key={index} style={styles.passiveSkill}>
                      <Text style={styles.skillName}>{skill.name}</Text>
                      <Text style={styles.skillDesc}>{skill.description || '暂无描述'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
  },
  // 左边占位 - 加宽到 1.5 倍（原来是 1/3 = 33%，现在改为 40%）
  portraitArea: {
    width: MODAL_WIDTH * 0.4,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 20,
  },
  portraitPlaceholder: {
    fontSize: 70,
    fontWeight: 'bold',
    opacity: 0.4,
  },
  portraitImage: {
    width: '100%',
    aspectRatio: 260 / 700,
    height: undefined,
    resizeMode: 'contain',
  },
  portraitName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  rarityLabel: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: 'bold',
  },
  // 右边区域
  infoArea: {
    flex: 1,
    padding: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  starLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginRight: 5,
  },
  star: {
    fontSize: 18,
    marginRight: 2,
  },
  headerRow: {
    marginBottom: 3,
  },
  heroName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  factionTag: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#4a5568',
    marginVertical: 6,
  },
  statsContainer: {
    // 不需要 flexDirection: 'row'，每行一个属性
  },
  statRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
  },
  skillContainer: {
    marginTop: 3,
  },
  skillTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  skillName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  skillDesc: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 4,
  },
  passiveSkill: {
    marginBottom: 4,
  },
});
