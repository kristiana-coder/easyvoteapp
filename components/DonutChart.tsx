import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const MAX_HEIGHT = 200;
const MIN_HEIGHT = 4;
const EMPTY_COLOR = '#E5E5EA';

interface DonutChartProps {
  valueA: number;
  valueB: number;
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
  emojiA?: string;
  emojiB?: string;
  size?: number;
}

export function DonutChart({
  valueA,
  valueB,
  labelA,
  labelB,
  colorA = '#FF6B6B',
  colorB = '#4ECDC4',
  emojiA = '',
  emojiB = '',
}: DonutChartProps) {
  const total = valueA + valueB;
  const isEmpty = total === 0;

  const percentA = isEmpty ? 0 : valueA / total;
  const percentB = isEmpty ? 0 : valueB / total;

  const heightA = useSharedValue(0);
  const heightB = useSharedValue(0);

  useEffect(() => {
    const targetA = isEmpty ? MIN_HEIGHT : Math.max(MIN_HEIGHT, percentA * MAX_HEIGHT);
    const targetB = isEmpty ? MIN_HEIGHT : Math.max(MIN_HEIGHT, percentB * MAX_HEIGHT);
    heightA.value = withTiming(targetA, { duration: 800 });
    heightB.value = withTiming(targetB, { duration: 800 });
  }, [valueA, valueB]);

  const animStyleA = useAnimatedStyle(() => ({
    height: heightA.value,
  }));

  const animStyleB = useAnimatedStyle(() => ({
    height: heightB.value,
  }));

  const pctANum = isEmpty ? 0 : Math.round(percentA * 100);
  const pctBNum = isEmpty ? 0 : Math.round(percentB * 100);
  const pctADisplay = pctANum + '%';
  const pctBDisplay = pctBNum + '%';
  const countADisplay = valueA.toString();
  const countBDisplay = valueB.toString();
  const fillColorA = isEmpty ? EMPTY_COLOR : colorA;
  const fillColorB = isEmpty ? EMPTY_COLOR : colorB;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, alignItems: 'flex-end' }}>
      {/* Column A */}
      <View style={{ alignItems: 'center', gap: 8 }}>
        {/* Emoji above */}
        <Text style={{ fontSize: 36 }}>{emojiA}</Text>

        {/* Bar container */}
        <View style={{
          width: 72,
          height: MAX_HEIGHT,
          justifyContent: 'flex-end',
        }}>
          <Animated.View style={[
            {
              width: '100%',
              backgroundColor: fillColorA,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            },
            animStyleA,
          ]} />
        </View>

        {/* Label */}
        <Text style={{
          fontSize: 13,
          fontWeight: '700',
          color: '#6B6B8A',
          textAlign: 'center',
          maxWidth: 80,
        }} numberOfLines={2}>
          {labelA}
        </Text>

        {/* Count + pct */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: isEmpty ? '#A0A0B8' : colorA }}>
            {pctADisplay}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#A0A0B8' }}>
            {countADisplay}
            <Text style={{ fontWeight: '400' }}> votes</Text>
          </Text>
        </View>
      </View>

      {/* Column B */}
      <View style={{ alignItems: 'center', gap: 8 }}>
        {/* Emoji above */}
        <Text style={{ fontSize: 36 }}>{emojiB}</Text>

        {/* Bar container */}
        <View style={{
          width: 72,
          height: MAX_HEIGHT,
          justifyContent: 'flex-end',
        }}>
          <Animated.View style={[
            {
              width: '100%',
              backgroundColor: fillColorB,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            },
            animStyleB,
          ]} />
        </View>

        {/* Label */}
        <Text style={{
          fontSize: 13,
          fontWeight: '700',
          color: '#6B6B8A',
          textAlign: 'center',
          maxWidth: 80,
        }} numberOfLines={2}>
          {labelB}
        </Text>

        {/* Count + pct */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: isEmpty ? '#A0A0B8' : colorB }}>
            {pctBDisplay}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#A0A0B8' }}>
            {countBDisplay}
            <Text style={{ fontWeight: '400' }}> votes</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
