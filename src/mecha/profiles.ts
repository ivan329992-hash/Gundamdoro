export interface MechaCanon {
  pilot: { name: string; affiliation: string; brief: string }
  debut: { work: string; detail: string }
  highlights: { title: string; context: string; detail: string }[]
}

export interface MechaProfile {
  codename: string
  role: string
  origin: string
  story: string
  features: string[]
  ratings: { armor: number; mobility: number; firepower: number }
  canon?: MechaCanon
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
    codename: 'WING GUNDAM ZERO / EW',
    role: '高火力突击型',
    origin: '非官方同人素材 · 原作资料摘要',
    story:
      '飞翼零式在《无尽的华尔兹》中的羽翼设计。原本被送往太阳废弃的机体，在巴顿叛乱爆发后被回收，希罗再次驾驶它迎击玛丽梅亚军。羽翼不只是外观标志，也能在大气层突入时包裹机体提供防护。',
    features: [
      '双管破坏步枪与羽翼状背部组件',
      'EW 设计与 TV 版在设定上为同一机体',
      '当前收藏包含七个身体配件与独立羽翼',
    ],
    ratings: { armor: 75, mobility: 98, firepower: 95 },
    canon: {
      pilot: {
        name: '希罗·尤伊',
        affiliation: '原殖民地独立组织行动人员',
        brief:
          '在战后逐渐理解生命与和平的意义。得知莉莉娜遭绑架后重新行动，驾驶回收的飞翼零式阻止新的战争。',
      },
      debut: {
        work: '《新机动战记高达W 无尽的华尔兹》',
        detail: '1997 年 OVA。此处记录羽翼造型的 EW 设计，不与 TV 版的首次登场混用。',
      },
      highlights: [
        {
          title: '回收零式，重返战场',
          context: '巴顿叛乱',
          detail: '原本驶向太阳的废弃机体被重新回收，成为希罗对抗玛丽梅亚军的座机。',
        },
        {
          title: '卫星轨道交锋',
          context: '与五飞的再会',
          detail: '在轨道上与五飞驾驶的双头龙交战；两位昔日战友围绕战斗与正义的意义发生冲突。',
        },
      ],
    },
  },
  'perfect-strike': {
    codename: 'PERFECT STRIKE / GAT-X105',
    role: '多重突击装备型',
    origin: '非官方同人素材 · 原作资料摘要',
    story:
      '在强袭高达上同时整合空战、剑装与炮装三套装备的完全武装形态。它在《SEED HD重制版》的欧布防卫战中投入战斗，由穆·拉·弗拉达驾驶。本应用的外观参考为 MG Grand Slam 装备型，模型附属大剑与动画登场形态分开说明。',
    features: [
      '多重突击背包整合空战、近战与炮击装备',
      '空战背包附带额外电池组',
      'MG 参考套件另附 Grand Slam 大剑、步枪与盾牌',
    ],
    ratings: { armor: 84, mobility: 72, firepower: 96 },
    canon: {
      pilot: {
        name: '穆·拉·弗拉达',
        affiliation: '大天使号',
        brief: '在欧布防卫战中驾驶完美强袭作战。本档案不将强袭其他装备形态的战绩计入完美强袭。',
      },
      debut: {
        work: '《机动战士高达 SEED HD重制版》',
        detail: 'PHASE-38《决意的炮火》（HD 重制版序号 36），欧布防卫战。',
      },
      highlights: [
        {
          title: '欧布防卫战出击',
          context: 'PHASE-38《决意的炮火》',
          detail: '以三套装备同时搭载的形态出战，迎击进攻欧布的地球联合军。',
        },
        {
          title: '三装协同作战',
          context: '欧布防卫战',
          detail: '在防卫战中发挥多重突击装备的综合能力，承担近距离交战与远程火力支援。',
        },
      ],
    },
  },
  'barbatos-lupus': {
    codename: 'BARBATOS LUPUS / ASW-G-08',
    role: '高机动近战型',
    origin: '非官方同人素材 · 原作资料摘要',
    story:
      '巴巴托斯在岁星接受全面整修后形成的天狼座形态。改修以三日月的战斗数据为依据，提升反应速度与机动性，并让阿赖耶识系统下的机体动作更接近驾驶员的感受。剑锤等武装也围绕其近战习惯重新配置。',
    features: [
      '外露的高达骨架与轻量装甲',
      '阿赖耶识系统配合驾驶员进行动作控制',
      '剑锤、双锤与腕部 200mm 炮',
    ],
    ratings: { armor: 70, mobility: 96, firepower: 82 },
    canon: {
      pilot: {
        name: '三日月·奥古斯',
        affiliation: '铁华团',
        brief: '铁华团的主力 MS 驾驶员。天狼座的机体调校与武装配置，都针对他的战斗方式进行调整。',
      },
      debut: {
        work: '《机动战士高达 铁血的奥尔芬斯》第二季',
        detail: '第 26 集《新的血》，以改修后的天狼座形态登场。',
      },
      highlights: [
        {
          title: '迎击黎明地平线团',
          context: '第 26–28 集',
          detail: '作为铁华团主力参加与宇宙海贼的交战，运用改修后的机动性和近战装备迎敌。',
        },
        {
          title: '与哈斯蒙的死斗',
          context: '第 38 集',
          detail: '在与巨大机动装甲哈斯蒙的战斗中解除限制，发挥机体潜能，也为此付出了沉重代价。',
        },
      ],
    },
  },
}
