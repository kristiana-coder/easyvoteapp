import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const MAX_HEIGHT = 200;
const MIN_HEIGHT = 4;
const EMPTY_COLOR = '#E5E5EA';

export type BarOption = {
  key: string;
  value: number;
  label: string;
  emoji: string;
  color: string;
};

interface DonutChartProps {
  options: BarOption[];
  total: number;
}

function BarColumn({ option, total, isLast }: { option: BarOption; total: number; isLast: boolean }) {
  const isEmpty = total === 0;
  const percent = isEmpty ? 0 : option.value / total;
  const height = useSharedValue(0);

  useEffect(() => {
    const target = isEmpty ? MIN_HEIGHT : Math.max(MIN_HEIGHT, percent * MAX_HEIGHT);
    height.value = withTiming(target, { duration: 800 });
  }, [option.value, total]);

  const animStyle = useAnimatedStyle(() => ({ height: height.value }));

  const fillColor = isEmpty ? EMPTY_COLOR : option.color;
  const pctNum = isEmpty ? 0 : Math.round(percent * 100);
  const pctDisplay = pctNum + '%';
  const countDisplay = option.value.toString();

  return (
    <View style={{ alignItems: 'center', gap: 8, flex: 1 }}>
      <Text style={{ fontSize: 32 }}>{option.emoji}</Text>

      <View style={{ width: '100%', maxWidth: 72, height: MAX_HEIGHT, justifyContent: 'flex-end' }}>
        <Animated.View style={[
          {
            width: '100%',
            backgroundColor: fillColor,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          },
          animStyle,
        ]} />
      </View>

      <Text style={{
        fontSize: 12,
        fontWeight: '700',
        color: '#6B6B8A',
        textAlign: 'center',
        maxWidth: 72,
      }} numberOfLines={2}>
        {option.label}
      </Text>

      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: isEmpty ? '#A0A0B8' : option.color }}>
          {pctDisplay}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#A0A0B8' }}>
          {countDisplay}
          <Text style={{ fontWeight: '400' }}> votes</Text>
        </Text>
      </View>
    </View>
  );
}

export function DonutChart({ options, total }: DonutChartProps) {
  if (!options || options.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 16, width: '100%' }}>
      {options.map((opt, i) => (
        <BarColumn key={opt.key} option={opt} total={total} isLast={i === options.length - 1} />
      ))}
    </View>
  );
}
