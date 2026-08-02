export type ChannelWeight = {
  index: number;
  weight: number;
  role: string;
  limitation: string | null;
};

export function channelWeights(channelCount: number): ChannelWeight[] {
  return Array.from({ length: channelCount }, (_, index) => {
    if (channelCount === 6 && index === 3) {
      return { index, weight: 0, role: 'LFE', limitation: 'LFE_EXCLUDED_BY_BS1770_CHANNEL_WEIGHTING' };
    }
    if (channelCount === 6 && (index === 4 || index === 5)) {
      return { index, weight: 1.41, role: index === 4 ? 'LEFT_SURROUND' : 'RIGHT_SURROUND', limitation: null };
    }
    return {
      index,
      weight: 1,
      role: channelCount === 1 ? 'MONO' : index === 0 ? 'LEFT_OR_PRIMARY' : index === 1 ? 'RIGHT' : `CHANNEL_${index + 1}`,
      limitation: channelCount > 2 && channelCount !== 6 ? 'CHANNEL_LAYOUT_UNKNOWN_STANDARD_WEIGHT_1_APPLIED' : null,
    };
  });
}

export function channelWeightingLimitations(channelCount: number) {
  return channelWeights(channelCount)
    .map((item) => item.limitation)
    .filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index);
}
