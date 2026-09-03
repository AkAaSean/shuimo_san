import { AutonomyPolicy } from '../types';

export interface AutonomyPolicyMeta {
  id: AutonomyPolicy;
  name: string;
  shortName: string;
  icon: string;
  desc: string;
  badgeClass: string;
}

export const AUTONOMY_POLICIES: AutonomyPolicyMeta[] = [
  {
    id: 'balanced',
    name: '均衡發展',
    shortName: '均衡',
    icon: '⚖️',
    desc: '全面兼顧治水防汛、官田開墾、商肆整飭與城防守備練兵。',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400'
  },
  {
    id: 'agriculture',
    name: '農墾積糧',
    shortName: '農墾',
    icon: '🌾',
    desc: '優先防汛修堤、屯田開荒、開倉賑恤黎民，全力儲備大量軍糧。',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-400'
  },
  {
    id: 'commerce',
    name: '商貿富邑',
    shortName: '商貿',
    icon: '🪙',
    desc: '優先繁榮市肆商埠，整飭街坊市容，最大化聚斂府庫金銀稅賦。',
    badgeClass: 'bg-yellow-100 text-yellow-950 border-yellow-500'
  },
  {
    id: 'military',
    name: '軍備擴張',
    shortName: '軍備',
    icon: '⚔️',
    desc: '優先招募守備兵員、專注全軍操演演武，嚴密警戒邊境防務。',
    badgeClass: 'bg-rose-100 text-rose-950 border-rose-400'
  },
  {
    id: 'disaster',
    name: '防汛固本',
    shortName: '防汛',
    icon: '🌊',
    desc: '重金疏浚河道與整築堤防，將水患防至最低，平抑物價撫育民心。',
    badgeClass: 'bg-cyan-100 text-cyan-950 border-cyan-400'
  }
];

export function getAutonomyPolicyInfo(policy?: AutonomyPolicy): AutonomyPolicyMeta {
  const p = policy || 'balanced';
  return AUTONOMY_POLICIES.find(x => x.id === p) || AUTONOMY_POLICIES[0];
}
