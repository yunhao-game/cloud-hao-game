# 云和皓的第一个游戏 ☁️

自走棋策略游戏 - 云和皓的联名作品！

## 开发日志

### 2026-03-30 - 羁绊系统开发

#### 新增文件
- `src/data/synergies.ts` - 羁绊配置表
- `src/game/synergy.ts` - 羁绊计算核心逻辑

#### 核心改动
- `src/types/index.ts` - 新增羁绊相关类型定义：
  - `BattleLocalStats` - 战斗内本地属性
  - `SynergyConfig` - 羁绊配置结构
  - `FactionCount` / `JobCount` - 阵营/职业统计
  - `ActiveSynergies` - 激活的羁绊信息
- `src/game/battle.ts` - 战斗开始时应用羁绊效果
- `src/screens/Shop/BattlePrepScreen.tsx` - 布阵界面显示羁绊状态
- `src/components/UnitInfoModal.tsx` - 英雄详情弹窗显示羁绊加成

#### 战士羁绊效果
| 战士数量 | 生命加成 | 攻击力加成 |
|---------|---------|-----------|
| 2个 | +10% | +10% |
| 4个 | +25% | +20% |
| 6个 | +50% | +35% |

#### 羁绊系统设计要点
- 全局属性：英雄配置表里的基础属性（不受羁绊影响）
- 战斗内本地属性（BattleLocalStats）：每场战斗新建，存储本场所有属性（含羁绊加成）
- 只有具有对应职业/阵营的单位才能获得加成
- 羁绊重新计算时机：
  - 英雄上阵/下阵
  - 升星后
  - 开始战斗自动处理超人口棋子下阵后
  - 进入战斗节点

#### 功能列表
- ✅ 羁绊状态栏显示（布阵界面顶部）
- ✅ 羁绊实时计算（上阵/下阵/升星时自动更新）
- ✅ 英雄详情弹窗显示羁绊加成（绿色标注）
- ✅ 战斗开始时应用羁绊属性

---

## 游戏玩法

1. 玩家通过商店购买英雄棋子
2. 将棋子拖拽到棋盘上布阵（8x8棋盘，下半区是我方）
3. 战斗自动进行，棋子会自动寻找敌人并攻击
4. 击败敌人后推进关卡，挑战更强对手

## 技术栈

- React Native + Expo
- TypeScript

## 安装

```bash
# 安装依赖
npm install

# 运行开发版
npx expo start

# 构建 Android APK
cd android
./gradlew assembleRelease
```

## APK 下载

在 GitHub Releases 页面查看所有版本：
https://github.com/nangongyun/cloud-hao-game/releases
