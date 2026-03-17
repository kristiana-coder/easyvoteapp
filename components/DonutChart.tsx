import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutChartProps {
  valueA: number;
  valueB: number;
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({
  valueA,
  valueB,
  labelA,
  labelB,
  colorA = '#FF6B6B',
  colorB = '#4ECDC4',
  size = 200,
  strokeWidth = 22,
}: DonutChartProps) {
  const total = valueA + valueB;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const percentA = total > 0 ? valueA / total : 0;
  const percentB = total > 0 ? valueB / total : 0;

  // Animated values for strokeDashoffset
  const animA = useRef(new Animated.Value(circumference)).current;
  const animB = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    const targetOffsetA = total > 0 ? circumference * (1 - percentA) : circumference;
    const targetOffsetB = total > 0 ? circumference * (1 - percentB) : circumference;

    Animated.parallel([
      Animated.timing(animA, {
        toValue: targetOffsetA,
        duration: 800,
        delay: 100,
        useNativeDriver: false,
      }),
      Animated.timing(animB, {
        toValue: targetOffsetB,
        duration: 800,
        delay: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [valueA, valueB, circumference, percentA, percentB, total]);

  const rotationB = percentA * 360;
  const totalDisplay = total.toString();
  const isEmpty = total === 0;

  const pctADisplay = total > 0 ? Math.round(percentA * 100) + '%' : '0%';
  const pctBDisplay = total > 0 ? Math.round(percentB * 100) + '%' : '0%';

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          {isEmpty ? (
            // Empty grey ring
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#E5E5EA"
              strokeWidth={strokeWidth}
            />
          ) : (
            <G rotation={-90} origin={`${center},${center}`}>
              {/* Arc A */}
              <AnimatedCircle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colorA}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={animA}
                strokeLinecap="round"
              />
              {/* Arc B — rotated by percentA * 360 */}
              <AnimatedCircle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colorB}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={animB}
                strokeLinecap="round"
                rotation={rotationB}
                origin={`${center},${center}`}
              />
            </G>
          )}
        </Svg>

        {/* Center text */}
        <View style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isEmpty ? (
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#A0A0B8', textAlign: 'center' }}>
              No votes{'\n'}yet
            </Text>
          ) : (
            <>
              <Text style={{ fontSize: size < 180 ? 20 : 26, fontWeight: '900', color: '#1A1A2E', lineHeight: size < 180 ? 24 : 30 }}>
                {totalDisplay}
              </Text>
              <Text style={{ fontSize: size < 180 ? 10 : 12, fontWeight: '600', color: '#6B6B8A', marginTop: 2 }}>
                Total votes
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorA }} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B6B8A' }}>
            {labelA}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A2E' }}>
            {pctADisplay}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorB }} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B6B8A' }}>
            {labelB}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A2E' }}>
            {pctBDisplay}
          </Text>
        </View>
      </View>
    </View>
  );
}
