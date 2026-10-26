export interface MechaProfile {
  codename: string
  role: string
  origin: string
  story: string
  features: string[]
  ratings: { armor: number; mobility: number; firepower: number }
}

export const mechaProfiles: Record<string, MechaProfile> = {
  'mecha-01': {
    codename: '守望 / WATCHKEEPER',
    role: '通用工程型',
    origin: '原创机体 · 应用内虚构设定',
    story:
      '边境修复计划的第一台工程机。它没有醒目的战绩，却在废弃轨道站恢复供电的那一夜，撑住了最后一道气密门。如今仍承担机库巡检与重型搬运任务，装甲上的磨痕从未被刻意抛光。',
    features: [
      '标准化承力骨架，便于现场检修',
      '平衡装甲与作业灵活性',
      '青色状态灯用于显示核心负载',
    ],
    ratings: { armor: 72, mobility: 64, firepower: 55 },
  },
  'mecha-02': {
    codename: '游隼 / KESTREL',
    role: '轻装机动型',
    origin: '原创机体 · 应用内虚构设定',
    story:
      '为穿越破碎都市而开发的轻型机。驾驶员需要在坍塌建筑间寻找路线，把补给送到地图上已经消失的街区。它牺牲厚重防护，换来短距离快速转向，是先遣队最信任的探路者。',
    features: ['轻量外甲减少运动惯性', '高响应关节适应复杂地形', '以侦察与快速支援为主要任务'],
    ratings: { armor: 48, mobility: 91, firepower: 60 },
  },
  'mecha-03': {
    codename: '堡垒 / BASTION',
    role: '重装突击型',
    origin: '原创机体 · 应用内虚构设定',
    story:
      '堡垒原本是护送移动工厂的防卫机。漫长的撤离途中，工程师不断为它增加装甲与支援模块，最终形成今天的重装形态。它总是最后一个离开阵地，把身后的道路留给车队。',
    features: ['重型装甲保护核心区域', '复合背负模块承担持续支援', '稳定平台优先，机动性有所取舍'],
    ratings: { armor: 96, mobility: 42, firepower: 94 },
  },
  'mecha-04': {
    codename: '天穹 / SKYWARD',
    role: '羽翼巡航型',
    origin: '原创机体 · 应用内虚构设定',
    story:
      '高空通信链路失效后，天穹成为孤立据点之间的信使。展开的翼状模块既是它的标志，也是远方人们确认援助到来的信号。它的任务不是占领天空，而是让地面重新连接。',
    features: ['翼状背部模块形成清晰轮廓', '偏重巡航与空域支援', '轻型防护控制整机负担'],
    ratings: { armor: 58, mobility: 95, firepower: 76 },
  },
  'mecha-05': {
    codename: '荒牙 / WILDFANG',
    role: '骨架近战型',
    origin: '原创机体 · 应用内虚构设定',
    story:
      '荒牙从报废试验机的骨架上重新站起。缺少替换装甲的维修队选择保留裸露机械结构，把有限资源投入关节与传动系统。它擅长贴近目标，在狭窄空间中以短促而直接的动作结束交锋。',
    features: ['外露骨架强调机械传动结构', '强化关节支持近距离动作', '依靠机动规避而非装甲承伤'],
    ratings: { armor: 54, mobility: 86, firepower: 82 },
  },
  'mecha-06': {
    codename: '闪隙 / RIFT',
    role: '高速截击型',
    origin: '原创机体 · 应用内虚构设定',
    story:
      '闪隙负责在警报与第一轮冲击之间争取时间。它不会长久停留在战场，而是以快速接近、干扰和脱离打乱来袭者的节奏。每次返回机库，维护人员都会先检查推进模块，再问驾驶员是否需要休息。',
    features: ['紧凑轮廓适合高速突入', '推进布局强调爆发机动', '截击与快速脱离优先'],
    ratings: { armor: 61, mobility: 98, firepower: 79 },
  },
  'wing-zero-ew': {
    codename: '白翼 / WHITE WINGS',
    role: '羽翼展示机',
    origin: '非官方同人 · 以下为应用内演绎，非官方资料',
    story:
      '在这座虚构机库里，白色羽翼被视作完成漫长制作的纪念。工程人员逐件检查躯干、头部、双臂与腿部，最后才为它展开独立收藏的羽翼。本段仅描述应用内的展示情境，不代表原作世界观或官方机体故事。',
    features: [
      '羽翼作为第六个独立收藏配件',
      '采用用户提供的生成同人素材',
      '最终整机展示不额外消耗专注次数',
    ],
    ratings: { armor: 75, mobility: 98, firepower: 95 },
  },
}
